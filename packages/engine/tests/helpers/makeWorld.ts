import type {
  BuildingType,
  BuildSlot,
  Player,
  PlayerId,
  Point,
  Region,
  RegionId,
  StrategicResource,
  World,
} from '../../src/types';
import { deepFreeze } from './deepFreeze';

export const PLAYER_ID = 'p1';

/** Tvar regionu pravidla nezajímá, testům stačí libovolný platný obrys. */
const SQUARE: readonly Point[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
];

/** Volné obecné místo. Většina testů řeší jen to, že nějaké je. */
export function emptySlot(requires: StrategicResource | null = null): BuildSlot {
  return { requires, building: null };
}

/** Místo, na kterém už něco stojí. */
export function filledSlot(building: BuildingType, requires: StrategicResource | null = null): BuildSlot {
  return { requires, building };
}

export function makeRegion(id: RegionId, patch: Partial<Region> = {}): Region {
  return {
    id,
    name: `Region ${id}`,
    terrain: 'plains',
    neighbours: [],
    owner: null,
    resources: [],
    slots: [emptySlot(), emptySlot(), emptySlot()],
    shape: { outline: SQUARE, centre: { x: 0, y: 0 } },
    ...patch,
  };
}

export function makePlayer(id: PlayerId, patch: Partial<Player> = {}): Player {
  return { id, name: `Hráč ${id}`, production: 100, ...patch };
}

interface MakeWorldOptions {
  readonly turn?: number;
  readonly production?: number;
  readonly players?: Record<PlayerId, Player>;
  readonly regions?: Record<RegionId, Region>;
}

/**
 * Malý svět na míru testům: `home` patří hráči, `near` s ním sousedí,
 * `far` je od hráče dva kroky daleko.
 *
 *     home — near — far
 *
 * Vrácený svět je zmrazený, takže testy zároveň hlídají čistotu enginu.
 */
export function makeWorld(options: MakeWorldOptions = {}): World {
  const player = makePlayer(PLAYER_ID, {
    ...(options.production === undefined ? {} : { production: options.production }),
  });

  return deepFreeze({
    turn: options.turn ?? 1,
    players: options.players ?? { [player.id]: player },
    regions: options.regions ?? {
      home: makeRegion('home', { owner: PLAYER_ID, neighbours: ['near'] }),
      near: makeRegion('near', { neighbours: ['home', 'far'] }),
      far: makeRegion('far', { neighbours: ['near'] }),
    },
  });
}
