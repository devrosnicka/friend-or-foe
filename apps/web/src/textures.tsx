import type { Terrain } from '@fof/engine';
import type { ReactElement } from 'react';
import { TERRAIN_FILL } from './terrain';

/**
 * Textury terénu jako bezešvé dlaždice.
 *
 * `<pattern>` opakuje svůj obsah do všech stran a co přesahuje dlaždici,
 * ořízne. Aby na spárách nevznikla mřížka, musí se motiv u okraje nakreslit
 * ještě jednou na protější straně — dlaždice pak na sebe navazuje. Totéž platí
 * pro rozestupy: vzdálenost se měří přes okraj (torus), jinak by se u spár
 * motivy shlukovaly.
 *
 * Kreslí se v jednotkovém čtverci (`viewBox="0 0 1 1"`), takže velikost
 * dlaždice v jednotkách mapy je jediné, co se zvenčí nastavuje.
 *
 * Průhlednost smí být jen na jednotlivých tvarech (`fill-opacity`). Skupina
 * s `opacity` znamená průhlednou vrstvu navíc, kvůli které si prohlížeč
 * dlaždici nemůže uložit a překresluje ji pro každé opakování — mapa o pár
 * desítkách regionů pak zamrzne na jednotky sekund.
 */

/** Deterministický generátor — textura má vyjít pokaždé stejně (mulberry32). */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Placement {
  readonly x: number;
  readonly y: number;
  /** Náklon ve stupních, ať motivy nestojí v zákrytu. */
  readonly turn: number;
  /** Násobek velikosti motivu. */
  readonly grow: number;
}

/** Vzdálenost přes okraj dlaždice: co odejde vpravo, vrátí se vlevo. */
function wrappedGap(a: Placement, x: number, y: number): number {
  const dx = Math.abs(a.x - x);
  const dy = Math.abs(a.y - y);
  return Math.hypot(Math.min(dx, 1 - dx), Math.min(dy, 1 - dy));
}

/** Jak se motivy rozhodí po dlaždici. */
interface Scatter {
  /** Na kolik políček na stranu se dlaždice dělí. 1 = rovnoměrně po celé. */
  readonly patches: number;
  /** Kolik motivů políčko unese; losuje se z těchto možností. */
  readonly counts: readonly number[];
  /** Nejmenší rozestup motivů, zlomek strany dlaždice. */
  readonly gap: number;
}

/**
 * Rozhodí motivy po dlaždici.
 *
 * Každé políčko si vylosuje vlastní počet, takže v jedné dlaždici jsou místa
 * prázdná i nacpaná. Jeden počet na celou dlaždici dává rovnoměrnou plochu,
 * která se při opakování prozradí jako mřížka; s políčky se opakuje celá
 * krajina řídkých a hustých míst, a to oko tak snadno nechytí.
 *
 * Blíž než `gap` k sobě motivy nesmějí. Když se žádaný počet do políčka
 * nevejde, zbytek se zahodí — políčko prostě vyjde řidší.
 */
function scatter(spread: Scatter, seed: number): Placement[] {
  const next = randomFrom(seed);
  const placed: Placement[] = [];

  for (let row = 0; row < spread.patches; row += 1) {
    for (let column = 0; column < spread.patches; column += 1) {
      const wanted = spread.counts[Math.floor(next() * spread.counts.length)] as number;
      for (let done = 0, attempt = 0; done < wanted && attempt < wanted * 12 + 8; attempt += 1) {
        const x = (column + next()) / spread.patches;
        const y = (row + next()) / spread.patches;
        const turn = (next() - 0.5) * 50;
        const grow = 0.78 + next() * 0.5;
        if (placed.some((other) => wrappedGap(other, x, y) < spread.gap)) {
          continue;
        }
        placed.push({ x, y, turn, grow });
        done += 1;
      }
    }
  }

  // Zezadu dopředu, aby se překrývající motivy vrstvily jako v krajině.
  return placed.sort((a, b) => a.y - b.y);
}

/**
 * Posuny, ve kterých se motiv musí zopakovat. Motiv dál od okraje než `reach`
 * se kreslí jednou, u rohu až čtyřikrát.
 */
function copies(place: Placement, reach: number): readonly (readonly [number, number])[] {
  const xs = [0, ...(place.x < reach ? [1] : []), ...(place.x > 1 - reach ? [-1] : [])];
  const ys = [0, ...(place.y < reach ? [1] : []), ...(place.y > 1 - reach ? [-1] : [])];
  return xs.flatMap((dx) => ys.map((dy) => [dx, dy] as const));
}

/** Jedna vrstva motivů i s kopiemi přes okraj. */
function layer(
  places: readonly Placement[],
  size: number,
  draw: (place: Placement) => ReactElement,
): ReactElement[] {
  return places.flatMap((place, index) =>
    copies(place, size * place.grow).map(([dx, dy]) => (
      <g
        key={`${index}:${dx}:${dy}`}
        transform={`translate(${(place.x + dx).toFixed(4)} ${(place.y + dy).toFixed(4)}) scale(${(
          size * place.grow
        ).toFixed(4)}) rotate(${place.turn.toFixed(1)})`}
      >
        {draw(place)}
      </g>
    )),
  );
}

/** Motivy se kreslí v rámci zhruba −1..1 se středem v počátku. */
interface TextureSpec extends Scatter {
  /** Skvrny pod motivy — bez nich je plocha nepříjemně placatá. */
  readonly wash: string;
  /**
   * Kolikrát je dlaždice větší než ta, kterou nastaví mapa. Větší dlaždice se
   * opakuje později, takže se do ní vejde víc různě hustých políček.
   *
   * `gap` i `size` zůstávají v poměru k základní dlaždici — ladí se pořád
   * stejnými čísly, ať je vzor jakkoli velký.
   */
  readonly scale: number;
  readonly size: number;
  readonly draw: (place: Placement) => ReactElement;
}

const GRASS = '#8fae5e';
const TREE_DARK = '#2b5030';
const TREE_LIGHT = '#568f4b';
const ROCK_LIGHT = '#8f8b86';
const ROCK_DARK = '#4f4d4c';
const SNOW = '#dfe6ea';
const FOAM = '#a8cfc0';

const TEXTURES: Record<Terrain, TextureSpec> = {
  /** Roviny: trsy trávy, tři stébla z jednoho místa. */
  plains: {
    wash: '#87a75a',
    scale: 1,
    patches: 2,
    counts: [2, 3, 3, 4],
    gap: 0.16,
    size: 0.07,
    draw: () => (
      <path
        d="M0 1 C -0.15 0.3 -0.55 -0.1 -0.85 -0.5 M0 1 C 0.05 0.25 0.05 -0.3 0.02 -0.9 M0 1 C 0.2 0.35 0.6 0 0.95 -0.35"
        fill="none"
        stroke={GRASS}
        strokeWidth={0.3}
        strokeLinecap="round"
      />
    ),
  },

  /**
   * Les: koruny shora, přisvětlené z jedné strany. Světlejší dostanou jen
   * některé — samé stejné kolečko vypadá jako puntíkovaná látka.
   *
   * Dlaždice na devět políček od holiny po hustý porost; les tak má paseky
   * i houštiny místo rovnoměrného koberce stromů.
   */
  forest: {
    wash: '#365e33',
    scale: 2,
    patches: 3,
    counts: [1, 3, 5, 6, 8, 10],
    gap: 0.15,
    size: 0.105,
    draw: (place) => (
      <>
        <circle r={0.95} fill={TREE_DARK} />
        <circle cx={-0.2} cy={-0.2} r={0.62} fill={place.grow > 1.02 ? TREE_LIGHT : '#487b40'} />
      </>
    ),
  },

  /**
   * Kopce: obliny jako vrstevnice. Plné „šupiny" se při opakování slily
   * do tapety, obrys s náznakem stínu drží plochu klidnou.
   */
  hills: {
    wash: '#9c8a55',
    scale: 2,
    patches: 3,
    counts: [1, 2, 3, 3, 4],
    gap: 0.2,
    size: 0.15,
    draw: () => (
      <>
        <path d="M-1 0.5 A 1 0.95 0 0 1 1 0.5 Z" fill="#8f8050" fillOpacity={0.55} />
        <path
          d="M-1 0.5 A 1 0.95 0 0 1 1 0.5"
          fill="none"
          stroke="#6d5f38"
          strokeWidth={0.09}
          strokeLinecap="round"
          strokeOpacity={0.7}
        />
        <path
          d="M-0.5 0.5 A 0.5 0.48 0 0 1 0.5 0.5"
          fill="none"
          stroke="#6d5f38"
          strokeWidth={0.08}
          strokeLinecap="round"
          strokeOpacity={0.45}
        />
      </>
    ),
  },

  /**
   * Hory: štíty s osvětlenou stěnou, nejvyšší se sněhem. Políčka sahají od
   * prázdného (holá skála) po čtyři štíty, takže z opakování vyjdou hřebeny
   * a mezi nimi otevřené pláně, ne stejnoměrné pole jehlanů.
   */
  mountains: {
    wash: '#7b7876',
    scale: 2,
    patches: 3,
    counts: [0, 1, 1, 2, 3, 4],
    gap: 0.24,
    size: 0.19,
    draw: (place) => (
      <>
        <path d="M-1 0.7 L0 -0.95 L1 0.7 Z" fill={ROCK_DARK} />
        <path d="M0 -0.95 L1 0.7 L0.12 0.7 Z" fill={ROCK_LIGHT} />
        {place.grow > 1.1 && (
          <path d="M0 -0.95 L0.42 -0.25 L0.18 -0.35 L-0.05 -0.15 L-0.34 -0.3 Z" fill={SNOW} />
        )}
      </>
    ),
  },

  /** Pobřeží: vlnky na mělčině. */
  coast: {
    wash: '#6f9c7f',
    scale: 1,
    patches: 2,
    counts: [1, 2, 2, 3],
    gap: 0.22,
    size: 0.155,
    draw: () => (
      <path
        d="M-1 0 q 0.5 -0.5 1 0 t 1 0"
        fill="none"
        stroke={FOAM}
        strokeWidth={0.16}
        strokeLinecap="round"
        strokeOpacity={0.75}
      />
    ),
  },
};

/** Velké měkké skvrny; společné všem terénům, liší se jen barvou. */
const WASH_PLACES = scatter({ patches: 1, counts: [4], gap: 0.3 }, 91);
const WASH_SIZE = 0.34;
const WASH_OPACITY = 0.35;

/** Semínko z názvu terénu: ladění počtů nepřehází celou texturu. */
function seedOf(terrain: Terrain): number {
  let seed = 7;
  for (const letter of terrain) {
    seed = (seed * 31 + letter.charCodeAt(0)) >>> 0;
  }
  return seed;
}

function Tile({ terrain }: { readonly terrain: Terrain }): ReactElement {
  const spec = TEXTURES[terrain];
  const places = scatter({ ...spec, gap: spec.gap / spec.scale }, seedOf(terrain));

  return (
    <>
      <rect x={0} y={0} width={1} height={1} fill={TERRAIN_FILL[terrain]} />
      {layer(WASH_PLACES, WASH_SIZE, () => (
        <circle r={1} fill={spec.wash} fillOpacity={WASH_OPACITY} />
      ))}
      {layer(places, spec.size / spec.scale, spec.draw)}
    </>
  );
}

export const TERRAINS = Object.keys(TEXTURES) as readonly Terrain[];

/** Strana dlaždice terénu v jednotkách mapy; každý terén má vlastní násobek. */
export function tileSizeOf(terrain: Terrain, tile: number): number {
  return tile * TEXTURES[terrain].scale;
}

/** Odkaz na dlaždici, nebo plochá barva, když se textury nekreslí. */
export function terrainFill(terrain: Terrain, textured: boolean): string {
  return textured ? `url(#texture-${terrain})` : TERRAIN_FILL[terrain];
}

interface TerrainTexturesProps {
  /** Strana dlaždice v jednotkách mapy. */
  readonly tile: number;
}

/** Definice dlaždic. Patří do každého SVG, které `terrainFill` používá. */
export function TerrainTextures({ tile }: TerrainTexturesProps): ReactElement {
  return (
    <defs>
      {TERRAINS.map((terrain) => (
        <pattern
          key={terrain}
          id={`texture-${terrain}`}
          width={tileSizeOf(terrain, tile)}
          height={tileSizeOf(terrain, tile)}
          patternUnits="userSpaceOnUse"
          viewBox="0 0 1 1"
        >
          <Tile terrain={terrain} />
        </pattern>
      ))}
    </defs>
  );
}
