import { buildLayout, type LayoutOptions, type RegionLayout } from './layout';
import { buildVoronoi, type VoronoiDiagram } from './voronoi';
import { createRandom, type Random } from './random';
import { distanceSquared } from './geometry';
import {
  MAX_GENERAL_SLOTS,
  MIN_GENERAL_SLOTS,
  SLOTS_AT_MEDIAN_AREA,
  TERRAIN_SLOTS,
} from '../constants';
import { makeNamePool } from './names';
import type {
  BuildSlot,
  Player,
  PlayerId,
  Point,
  Region,
  RegionId,
  StrategicResource,
  Terrain,
  World,
} from '../types';

export interface WorldOptions extends LayoutOptions {
  readonly seed: number;
  /** Rozměr mřížky bodů. Vnější prstenec tvoří jen rám, do mapy se nedostane. */
  readonly columns: number;
  readonly rows: number;
  /** Rozteč mřížky v souřadnicích mapy. */
  readonly spacing: number;
  /** Maximální posun bodu od uzlu mřížky, jako podíl rozteče. */
  readonly jitter: number;
  /** Podíl vynechaných vnitřních bodů — jejich sousedé se o místo podělí. */
  readonly dropChance: number;
  /** Kolikrát se zkusí jiné rozvržení, než generátor vzdá. */
  readonly attempts: number;
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly startingProduction: number;
}

/** Kolik pokusů sdílí jedno rozsypání bodů, než se body rozsypou znovu. */
const ATTEMPTS_PER_DIAGRAM = 8;

/** Vnitrozemský terén; četnost je dána počtem výskytů v seznamu. */
const INLAND_TERRAIN: readonly Terrain[] = [
  'plains',
  'plains',
  'plains',
  'plains',
  'forest',
  'forest',
  'forest',
  'hills',
  'hills',
  'mountains',
];

/** Šance, že region převezme terén už obsazeného souseda. Dělá to souvislé pásy. */
const TERRAIN_SPREAD = 0.62;

/**
 * Šance, že se region u vody stane pobřežím. Vody je na mapě dost, takže
 * kdyby jím byl každý takový region, byla by celá mapa jednobarevná.
 */
const COAST_CHANCE = 0.34;

const RESOURCE_CHANCE = 0.32;

interface Scatter {
  readonly points: readonly Point[];
  /** Indexy bodů, ze kterých smí být pevnina. */
  readonly interior: readonly number[];
}

const RESOURCE_BY_TERRAIN: Readonly<Record<Terrain, readonly StrategicResource[]>> = {
  plains: ['horses'],
  forest: ['coal'],
  hills: ['iron', 'gold'],
  mountains: ['iron', 'coal'],
  coast: ['oil'],
};

/**
 * Body pro Voronoi diagram: mřížka s náhodným posunem, z níž se část
 * vnitřních bodů vynechá. Vynechané body dají sousedům víc místa, takže
 * regiony vyjdou nepravidelně velké.
 *
 * Vnější prstenec mřížky slouží jen jako rám: jeho buňky se do mapy
 * nedostanou, jen dají vnitřním bodům pořádný tvar.
 */
function scatterSites(options: WorldOptions, random: Random): Scatter {
  const points: Point[] = [];
  const interior: number[] = [];

  for (let row = 0; row < options.rows; row += 1) {
    for (let column = 0; column < options.columns; column += 1) {
      const onFrame =
        column === 0 || row === 0 || column === options.columns - 1 || row === options.rows - 1;
      if (!onFrame && random.next() < options.dropChance) {
        continue;
      }
      const offsetX = (random.next() - 0.5) * 2 * options.jitter;
      const offsetY = (random.next() - 0.5) * 2 * options.jitter;
      if (!onFrame) {
        interior.push(points.length);
      }
      points.push({
        x: (column + 0.5 + offsetX) * options.spacing,
        y: (row + 0.5 + offsetY) * options.spacing,
      });
    }
  }

  return { points, interior };
}

/**
 * Terén: část regionů u vody dostane pobřeží, zbytek roste v souvislých
 * pásech tím, že si region s velkou pravděpodobností vezme terén už
 * obsazeného souseda. Pobřeží se nedědí, aby nelezlo do vnitrozemí.
 */
function assignTerrain(layout: readonly RegionLayout[], random: Random): Terrain[] {
  const terrain: (Terrain | null)[] = layout.map(() => null);

  for (const index of random.shuffle(layout.map((_, position) => position))) {
    const region = layout[index] as RegionLayout;
    if (region.coastal && random.next() < COAST_CHANCE) {
      terrain[index] = 'coast';
      continue;
    }

    const inherited = region.neighbours
      .map((neighbour) => terrain[neighbour])
      .filter((value): value is Terrain => value != null && value !== 'coast');

    terrain[index] =
      inherited.length > 0 && random.next() < TERRAIN_SPREAD
        ? (inherited[random.int(inherited.length)] as Terrain)
        : (INLAND_TERRAIN[random.int(INLAND_TERRAIN.length)] as Terrain);
  }

  return terrain as Terrain[];
}

/**
 * Kolik obecných stavebních míst region unese. Region o průměrné ploše dostane
 * `SLOTS_AT_MEDIAN_AREA`, dvakrát větší dvakrát tolik; terén to pak posune —
 * na rovinách se staví líp než v horách.
 */
function generalSlots(area: number, medianArea: number, terrain: Terrain): number {
  const bySize = Math.round((area / medianArea) * SLOTS_AT_MEDIAN_AREA);
  return Math.min(MAX_GENERAL_SLOTS, Math.max(MIN_GENERAL_SLOTS, bySize + TERRAIN_SLOTS[terrain]));
}

function assembleWorld(
  layout: readonly RegionLayout[],
  options: WorldOptions,
  random: Random,
): World {
  const terrain = assignTerrain(layout, random);
  const names = makeNamePool(layout.length, random);
  const ids = layout.map((_, index): RegionId => `r${index}`);

  const middle = layout.reduce(
    (acc, region) => ({ x: acc.x + region.centre.x / layout.length, y: acc.y + region.centre.y / layout.length }),
    { x: 0, y: 0 },
  );
  let home = 0;
  layout.forEach((region, index) => {
    if (
      distanceSquared(region.centre, middle) <
      distanceSquared((layout[home] as RegionLayout).centre, middle)
    ) {
      home = index;
    }
  });

  const sortedAreas = layout.map((region) => region.area).sort((a, b) => a - b);
  const medianArea = sortedAreas[Math.floor(sortedAreas.length / 2)] as number;

  const regions: Record<RegionId, Region> = {};
  layout.forEach((region, index) => {
    const kind = terrain[index] as Terrain;
    const available = RESOURCE_BY_TERRAIN[kind];
    const resources =
      random.next() < RESOURCE_CHANCE ? [available[random.int(available.length)] as StrategicResource] : [];

    // Obecná místa podle velikosti a terénu, plus jedno za každou surovinu.
    const slots: BuildSlot[] = [
      ...Array.from({ length: generalSlots(region.area, medianArea, kind) }, (): BuildSlot => ({
        requires: null,
        building: null,
      })),
      ...resources.map((resource): BuildSlot => ({ requires: resource, building: null })),
    ];

    const id = ids[index] as RegionId;
    regions[id] = {
      id,
      name: names[index] as string,
      terrain: kind,
      neighbours: region.neighbours.map((neighbour) => ids[neighbour] as RegionId),
      owner: index === home ? options.playerId : null,
      resources,
      slots,
      shape: { outline: region.outline, centre: region.centre },
    };
  });

  const player: Player = {
    id: options.playerId,
    name: options.playerName,
    production: options.startingProduction,
  };

  return { turn: 1, players: { [player.id]: player }, regions };
}

/**
 * Vygeneruje svět z jednoho čísla. Rozsypání bodů ani rozvržení regionů se
 * napoprvé trefit nemusí — podmínku „každý region má 3 až 5 sousedů" nelze
 * z libovolné mozaiky splnit — proto se zkouší dokola s dalším semínkem.
 */
export function generateWorld(options: WorldOptions): World {
  let diagram: VoronoiDiagram | null = null;
  let interior: readonly number[] = [];

  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    const random = createRandom(options.seed * 0x9e37 + attempt);
    if (attempt % ATTEMPTS_PER_DIAGRAM === 0) {
      const scatter = scatterSites(options, random);
      diagram = buildVoronoi(scatter.points);
      interior = scatter.interior;
    }

    const layout = buildLayout(diagram as VoronoiDiagram, interior, options, random);
    if (layout !== null) {
      return assembleWorld(layout, options, random);
    }
  }

  throw new Error(`Mapu se nepodařilo vygenerovat na ${options.attempts} pokusů.`);
}
