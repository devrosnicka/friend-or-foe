# friend-or-foe

Asynchronní strategická webová hra — první prototyp.

Zabírání regionů na generované mapě, stavba budov a jednoduchá ekonomika.
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
| `apps/web` | React + SVG mapa regionů |

Stav světa se ukládá do `apps/api/data/world.json`. Novou hru založí tlačítko
*Nová hra* nebo `POST /api/reset`.

## Dokumentace

- [Vision.md](Vision.md) — dlouhodobá vize
- [asynchronni-strategie-zadani.md](asynchronni-strategie-zadani.md) — zadání a datový model
- [Prototype-v1.md](Prototype-v1.md) — scope prvního prototypu
- [CLAUDE.md](CLAUDE.md) — pokyny pro práci v repozitáři
