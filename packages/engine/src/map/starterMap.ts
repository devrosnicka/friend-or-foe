import type {
  HexPosition,
  Player,
  Region,
  RegionId,
  StrategicResource,
  Terrain,
  World,
} from '../types';

/** Šest sousedů hexu v axiálních souřadnicích. */
const HEX_DIRECTIONS: readonly HexPosition[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

interface RegionBlueprint {
  readonly q: number;
  readonly r: number;
  readonly name: string;
  readonly terrain: Terrain;
  readonly resources?: readonly StrategicResource[];
}

export const STARTER_PLAYER_ID = 'p1';

/** Startovní region hráče — jediný, který na začátku někomu patří. */
const STARTER_HOME: HexPosition = { q: 0, r: 0 };

/** Ruční mapa: hexové pole o poloměru 2, celkem 19 regionů. */
const BLUEPRINTS: readonly RegionBlueprint[] = [
  { q: -2, r: 0, name: 'Západní břeh', terrain: 'coast' },
  { q: -2, r: 1, name: 'Rybářské zátoky', terrain: 'coast' },
  { q: -2, r: 2, name: 'Solné pobřeží', terrain: 'coast', resources: ['oil'] },
  { q: -1, r: -1, name: 'Vlčí hvozd', terrain: 'forest' },
  { q: -1, r: 0, name: 'Stříbrná stráň', terrain: 'hills', resources: ['iron'] },
  { q: -1, r: 1, name: 'Zelené údolí', terrain: 'plains' },
  { q: -1, r: 2, name: 'Jižní mokřady', terrain: 'forest' },
  { q: 0, r: -2, name: 'Severní pláně', terrain: 'plains' },
  { q: 0, r: -1, name: 'Kamenná brána', terrain: 'hills', resources: ['coal'] },
  { q: 0, r: 0, name: 'Údolí králů', terrain: 'plains' },
  { q: 0, r: 1, name: 'Medová luka', terrain: 'plains', resources: ['horses'] },
  { q: 0, r: 2, name: 'Jižní brod', terrain: 'coast' },
  { q: 1, r: -2, name: 'Ledový hřeben', terrain: 'mountains' },
  { q: 1, r: -1, name: 'Rudné hory', terrain: 'mountains', resources: ['iron'] },
  { q: 1, r: 0, name: 'Doubrava', terrain: 'forest' },
  { q: 1, r: 1, name: 'Zlatý potok', terrain: 'hills', resources: ['gold'] },
  { q: 2, r: -2, name: 'Orlí štít', terrain: 'mountains' },
  { q: 2, r: -1, name: 'Černý les', terrain: 'forest', resources: ['coal'] },
  { q: 2, r: 0, name: 'Východní step', terrain: 'plains', resources: ['horses'] },
];

function toRegionId(position: HexPosition): RegionId {
  return `${position.q},${position.r}`;
}

function neighboursOf(position: HexPosition, existing: ReadonlySet<RegionId>): RegionId[] {
  return HEX_DIRECTIONS.map((direction) =>
    toRegionId({ q: position.q + direction.q, r: position.r + direction.r }),
  ).filter((id) => existing.has(id));
}

/**
 * Vytvoří výchozí stav světa. Deterministické — stejný vstup, stejná mapa.
 */
export function createStarterWorld(): World {
  const existing = new Set(BLUEPRINTS.map(toRegionId));
  const homeId = toRegionId(STARTER_HOME);

  const regions: Record<RegionId, Region> = {};
  for (const blueprint of BLUEPRINTS) {
    const position: HexPosition = { q: blueprint.q, r: blueprint.r };
    const id = toRegionId(position);
    regions[id] = {
      id,
      name: blueprint.name,
      terrain: blueprint.terrain,
      neighbours: neighboursOf(position, existing),
      owner: id === homeId ? STARTER_PLAYER_ID : null,
      resources: blueprint.resources ?? [],
      buildings: [],
      position,
    };
  }

  const player: Player = { id: STARTER_PLAYER_ID, name: 'Hráč', production: 20 };

  return { turn: 1, players: { [player.id]: player }, regions };
}
