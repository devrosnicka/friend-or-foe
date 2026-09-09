# Zprovoznění nasazení

Jednorázové kroky, než poprvé projde deploy. Pak už stačí pushovat do `main`.

## 1. DNS

Přidej **A záznam** `friend-or-foe.tomaskrizek.cz` → IP tvého Hetzner VPS.
(AAAA, pokud používáš i IPv6.)

## 2. Na VPS

Musí běžet proxy z repozitáře `hetzner-infra-proxy` a existovat adresář, kam
workflow nakopíruje compose soubor:

```bash
docker network create caddy_net          # workflow ji vytvoří i sám, pokud chybí
sudo mkdir -p /opt/friend-or-foe
sudo chown $USER:$USER /opt/friend-or-foe
```

Adresář musí patřit tomu uživateli, kterého dáš do `VPS_USER` — jinak `scp`
krok skončí na právech.

## 3. SSH klíč pro GitHub Actions

Na svém stroji (ne na serveru):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/fof-deploy -C "github-actions friend-or-foe" -N ""
ssh-copy-id -i ~/.ssh/fof-deploy.pub <user>@<ip-vps>
```

Do secrets pak půjde **privátní** klíč (`~/.ssh/fof-deploy`), celý včetně řádků
`-----BEGIN…` a `-----END…`.

## 4. Heslo pro basic auth

Prototyp nemá vlastní přihlašování, přístup hlídá proxy. Vyrob si hash:

```bash
docker run --rm caddy caddy hash-password --plaintext '<tvoje-heslo>'
```

Výstup (`$2a$14$…`) je hodnota pro `BASIC_AUTH_HASH`.

## 5. Secrets a variables na GitHubu

**Settings → Secrets and variables → Actions**

Záložka *Secrets* → *New repository secret*:

| Název | Hodnota |
| --- | --- |
| `VPS_HOST` | IP nebo hostname VPS |
| `VPS_USER` | uživatel na VPS (ten z kroku 2) |
| `VPS_SSH_KEY` | obsah privátního klíče z kroku 3 |
| `BASIC_AUTH_HASH` | hash z kroku 4 |

Záložka *Variables* → *New repository variable*:

| Název | Hodnota |
| --- | --- |
| `BASIC_AUTH_USER` | přihlašovací jméno k basic auth |

`GITHUB_TOKEN` nikde nenastavuješ, ten si Actions doplní samy.

## 6. První běh workflow

Zamerguj větev do `main` (nebo spusť ručně přes *Actions → Test, Build & Deploy
→ Run workflow*). První běh projde testy a nahraje image do GHCR; krok `deploy`
pravděpodobně **selže na stažení image** — to je očekávané, pokračuj krokem 7.

## 7. Zveřejnit balíček v GHCR

Pozor: nejde o repozitář, ale o **package** s image. Bez toho se na VPS
`docker compose pull` neautorizuje.

**Profil → Packages → `friend-or-foe` → Package settings → Danger Zone →
Change visibility → Public.**

Balíček se objeví až po prvním úspěšném buildu, proto až teď.

Alternativa, když chceš image nechat privátní: vyrob PAT s právem
`read:packages` a jednou se na VPS přihlas:

```bash
echo '<PAT>' | docker login ghcr.io -u <github-jmeno> --password-stdin
```

## 8. Znovu spustit deploy a ověřit

*Actions → poslední běh → Re-run failed jobs.*

Pak otevři <https://friend-or-foe.tomaskrizek.cz> — má vyskočit přihlášení
basic auth a po něm mapa. Certifikát vyřídí Caddy sám, první načtení může pár
sekund trvat.

Když něco nesedí, na VPS:

```bash
cd /opt/friend-or-foe
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

## Provoz

- **Nové nasazení:** push do `main`. Testy neprojdou → deploy se nespustí.
- **Rollback:** v `/opt/friend-or-foe/.env` přepiš `APP_IMAGE` na starší SHA tag
  a spusť `docker compose -f docker-compose.prod.yml up -d`.
- **Stav hry** žije ve svazku `world_data` a nasazení ho nemaže. Novou hru
  založí tlačítko *Nová hra* v UI.
