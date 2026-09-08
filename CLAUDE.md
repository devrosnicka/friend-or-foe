# CLAUDE.md

Pokyny pro Claude Code při práci v tomto repozitáři.

## Stav projektu

Repozitář zatím **neobsahuje žádný kód** — pouze návrhové dokumenty. Není zde
build systém, package manager, testy ani zvolený jazyk/framework. Než začneš
cokoli implementovat, ověř si u uživatele volbu technologického stacku;
neodvozuj ji z ničeho v repu, protože tam zatím nic není.

Dokumentace je psaná česky, doménové názvy (region, production, plains, iron, …)
zůstávají anglicky. Drž se stejné konvence.

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
vlastníky a suroviny; obsadit region; postavit budovu; nechat bota expandovat;
uložit a načíst stav.

Do prototypu **nepatří** (nepřidávej to ani „při té příležitosti"):
diplomacie, obchod, technologie, aliance, bojový systém, multiplayer,
notifikace, grafika.

Bot je záměrně triviální: vyber sousední neutrální region, zaber ho, občas
postav farmu. Neinvestuj do jeho inteligence.

Herní cyklus prototypu je tahový: akce hráče → akce bota → přepočet ekonomiky →
uložení stavu. Skutečný asynchronní model s plánovanými událostmi přijde až
později, ale návrh mu nemá bránit.

## Návrhové zásady vyplývající z vize

- Hráč nesmí získávat výhodu množstvím stráveného času, jen lepší strategií.
  Nezaváděj mechaniky odměňující časté klikání.
- Odehrání denního tahu má trvat několik minut.
