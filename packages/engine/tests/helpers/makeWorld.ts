import type { Player, PlayerId, Region, RegionId, World } from '../../src/types';
import { deepFreeze } from './deepFreeze';

export const PLAYER_ID = 'p1';

export function makeRegion(id: RegionId, patch: Partial<Region> = {}): Region {
  return {
    id,
    name: `Region ${id}`,
    terrain: 'plains',
    neighbours: [],
    owner: null,
    resources: [],
    buildings: [],
    position: { q: 0, r: 0 },
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
