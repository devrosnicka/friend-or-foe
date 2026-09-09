# friend-or-foe

Asynchronní strategická webová hra — první prototyp.

Zabírání regionů na hexové mapě, stavba budov a jednoduchá ekonomika.
Herní logika žije v samostatném balíčku jako čistá funkce
`applyActions(world, actions) -> nový svět`, takže je plně pokrytá unit testy
a nezávislá na API i na UI.

## Rychlý start

```bash
npm install
npm run dev:api    # API na http://localhost:3000
npm run dev:web    # UI na http://localhost:5173
```

Pak otevři <http://localhost:5173> — potřebuješ oba běžící servery.

## Testy

```bash
npm test           # unit testy enginu, coverage s prahy 100 %
```

## Struktura

| Cesta | Obsah |
| --- | --- |
| `packages/engine` | herní pravidla, mapa, datový model — bez závislostí |
| `apps/api` | Fastify, validace vstupu, ukládání světa do JSON |
| `apps/web` | React + SVG hexová mapa |

Stav světa se ukládá do `apps/api/data/world.json`. Novou hru založí tlačítko
*Nová hra* nebo `POST /api/reset`.

## Nasazení

Push do `main` spustí workflow `Test, Build & Deploy`: testy a typecheck →
build image do GHCR → nasazení na VPS přes SSH. Na pull requestech běží jen
testy. Aplikace jede v jednom kontejneru (Fastify servíruje API i sestavený
frontend) za sdílenou Caddy proxy z repozitáře `hetzner-infra-proxy`.

Produkčně běží na <https://friend-or-foe.tomaskrizek.cz> za basic auth.

### Co je potřeba nastavit jednou

GitHub secrets:

| Secret | Význam |
| --- | --- |
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | přístup na VPS |
| `BASIC_AUTH_HASH` | bcrypt hash hesla: `docker run --rm caddy caddy hash-password` |

GitHub variables: `BASIC_AUTH_USER` — přihlašovací jméno k basic auth.

Na serveru a v DNS:

- A záznam `friend-or-foe.tomaskrizek.cz` na IP VPS,
- síť `caddy_net` (workflow ji vytvoří, pokud chybí),
- GHCR balíček musí být veřejný, jinak `docker compose pull` na VPS selže na
  autorizaci — po prvním pushi přepni viditelnost balíčku na public, nebo se
  na VPS jednou přihlas přes `docker login ghcr.io`.

### Stav a rollback

Svět žije ve svazku `world_data`, takže nasazení o něj nepřijde. Nasazuje se
konkrétní SHA tag; rollback je přepsání `APP_IMAGE` v `/opt/friend-or-foe/.env`
na starší SHA a `docker compose -f docker-compose.prod.yml up -d`.

## Dokumentace

- [Vision.md](Vision.md) — dlouhodobá vize
- [asynchronni-strategie-zadani.md](asynchronni-strategie-zadani.md) — zadání a datový model
- [Prototype-v1.md](Prototype-v1.md) — scope prvního prototypu
- [CLAUDE.md](CLAUDE.md) — pokyny pro práci v repozitáři
