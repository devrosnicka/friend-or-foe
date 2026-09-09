# CLAUDE.md

Pokyny pro Claude Code při práci v tomto repozitáři.

## Stav projektu

Běží první prototyp: hexová mapa v prohlížeči, zabírání regionů, stavba budov,
plochá ekonomika a ukládání stavu. Bot, boj, diplomacie ani multiplayer zatím
neexistují — viz „Scope prvního prototypu".

Dokumentace i UI jsou česky, doménové názvy (region, production, plains, iron, …)
zůstávají anglicky. Drž se stejné konvence.

## Příkazy

```bash
npm install          # jednou po klonu
npm test             # unit testy enginu + coverage (prahy 100 %)
npm run test:watch   # testy ve watch režimu
npm run typecheck    # tsc přes všechny balíčky
npm run dev:api      # API na http://localhost:3000
npm run dev:web      # UI na http://localhost:5173 (proxuje /api na 3000)
```

Pro hraní je potřeba mít puštěné oba servery. Stav světa leží v
`apps/api/data/world.json` (gitignorováno); smazání souboru nebo `POST /api/reset`
založí novou hru.

## Struktura

```
packages/engine/   herní logika — čisté funkce, ŽÁDNÉ runtime závislosti
apps/api/          Fastify: validace vstupu, volání enginu, JSON persistence
apps/web/          Vite + React: SVG hexová mapa a panel regionu
```

Pravidla, která drží architekturu pohromadě:

- Do `packages/engine` nesmí přibýt runtime závislost, I/O ani nic z prohlížeče.
  Engine je čistá funkce `applyActions(world, actions) -> ApplyResult`, která
  vstupní svět nemutuje a nepoužívá `Date.now()` ani `Math.random()`.
- V API nesmí být herní pravidlo. Jen zod validace tvaru, `applyActions`, uložení.
- Porušení herního pravidla je návratová hodnota (`{ ok: false, error }`), ne
  výjimka. API to mapuje na HTTP 400.
- Nové pravidlo = nový soubor v `packages/engine/src/rules/` + testy na šťastnou
  cestu i na každou podmínku, která ho odmítne. Coverage prahy jsou 100 %, takže
  nepokryté pravidlo shodí `npm test`.
- Ceny a výnosy patří do `packages/engine/src/constants.ts`, ne do pravidel.

## Nasazení

`Dockerfile` staví jeden image: Fastify servíruje API i sestavený frontend
(`FOF_STATIC_DIR`). Stav světa je v `FOF_DATA_FILE` na docker svazku.
`.github/workflows/deploy.yml` pouští testy a typecheck jako bránu, pak build do
GHCR a SSH deploy na VPS za Caddy proxy (`caddy_net`, labely v
`docker-compose.prod.yml`). Podrobnosti a potřebné secrets viz README.

Při zásahu do nasazení mysli na to, že:

- server se v kontejneru musí vázat na `0.0.0.0` (`HOST`), lokálně na `127.0.0.1`,
- nasazuje se SHA tag, ne `latest` — kvůli rollbacku,
- svazek `world_data` je jediné místo, kde stav přežije redeploy.

## Zdrojové dokumenty

Číst v tomto pořadí, od nejobecnějšího po nejkonkrétnější:

- `Vision.md` — dlouhodobá vize (diplomacie, technologie, asynchronní model).
  Popisuje cílový stav, **ne** to, co se má stavět teď.
- `asynchronni-strategie-zadani.md` — hlavní zadání: detailní datový model
  mapy, regionů, surovin, budov, bota a herního cyklu. Toto je referenční
  specifikace pro první implementaci.
- `Prototype-v1.md` — scope prvního prototypu, milníky a definice hotovo.

Když se dokumenty rozcházejí, `Prototype-v1.md` a
`asynchronni-strategie-zadani.md` mají přednost pro aktuální práci; `Vision.md`
slouží jen ke kontrole, že se návrh nezavírá budoucím možnostem.

## Architektura

Povinné rozvrstvení podle zadání:

```
Frontend (mapa, ovládání)
  ↓ API
Backend
  ↓ používá
Game Engine
```

Klíčový princip: **veškerá herní logika je oddělená od UI.** Game Engine je
čistá funkce nad stavem světa:

```
(stav světa, seznam akcí) -> nový stav světa
```

Engine nesmí znát HTTP, databázi ani UI. Cílem je vyměnitelnost frontendu
i backendu bez přepisování herních pravidel.

## Datový model (prototyp)

- Mapa je **graf regionů**. Každý region: `id`, `name`, `terrain`, seznam
  sousedů, `owner`, seznam surovin, seznam budov.
- Pohyb a expanze jsou možné **pouze mezi sousedními regiony**.
- Terén: `plains`, `forest`, `hills`, `mountains`, `coast`.
- Ekonomika prototypu má **jednu univerzální surovinu `production`**
  (abstrakce dřeva, kamene, práce). Nezavádět další běžné suroviny.
- Strategické suroviny (`iron`, `coal`, `horses`, `oil`, `gold`) se nedají
  vyrábět, existují jen na konkrétních regionech a odemykají možnosti.
- Vlastník regionu: `null` (neutrální), hráč, nebo bot.
- Budovy patří regionu (ne hlavnímu městu). Prototyp: Farma, Důl (obojí
  +produkce), Kasárna (+vojenská síla). Stačí seznam, žádné rozmisťování.

## Scope prvního prototypu

Cílem není hra, ale **funkční simulace světa**: zobrazit mapu, sousednosti,
vlastníky a suroviny; obsadit region; postavit budovu; uložit a načíst stav.
Hotové je vše kromě bota, který přijde jako samostatný krok — engine je na něj
připravený tím, že je deterministický a akce dostává zvenčí.

Do prototypu **nepatří** (nepřidávej to ani „při té příležitosti"):
diplomacie, obchod, technologie, aliance, bojový systém, multiplayer,
notifikace, grafika.

Až na bota dojde, bude záměrně triviální: vyber sousední neutrální region, zaber
ho, občas postav farmu. Neinvestuj do jeho inteligence.

Herní cyklus prototypu je tahový: akce hráče → (později bot) → přepočet
ekonomiky v `endTurn` → uložení stavu. Skutečný asynchronní model s plánovanými událostmi přijde až
později, ale návrh mu nemá bránit.

## Návrhové zásady vyplývající z vize

- Hráč nesmí získávat výhodu množstvím stráveného času, jen lepší strategií.
  Nezaváděj mechaniky odměňující časté klikání.
- Odehrání denního tahu má trvat několik minut.
