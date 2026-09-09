import { BUILDING_COST, RESOURCE_IMPROVEMENT } from '../constants';
import type { ApplyResult, BuildAction, World } from '../types';
import { fail, ok } from './result';

export function build(world: World, action: BuildAction): ApplyResult {
  const player = world.players[action.playerId];
  if (!player) {
    return fail('UNKNOWN_PLAYER', `Hráč ${action.playerId} neexistuje.`);
  }

  const region = world.regions[action.regionId];
  if (!region) {
    return fail('UNKNOWN_REGION', `Region ${action.regionId} neexistuje.`);
  }

  if (region.owner !== player.id) {
    return fail('REGION_NOT_OWNED', `Region ${region.name} ti nepatří.`);
  }

  const slot = region.slots[action.slot];
  if (!slot) {
    return fail('UNKNOWN_SLOT', `Region ${region.name} nemá stavební místo ${action.slot}.`);
  }

  if (slot.building !== null) {
    return fail('SLOT_TAKEN', `Na tomhle místě už stojí ${slot.building}.`);
  }

  // Surovinové místo přijme jen tu stavbu, která surovinu zpřístupní.
  if (slot.requires !== null && RESOURCE_IMPROVEMENT[slot.requires] !== action.building) {
    return fail(
      'BUILDING_NOT_ALLOWED',
      `Na místě suroviny ${slot.requires} se dá postavit jen ${RESOURCE_IMPROVEMENT[slot.requires]}.`,
    );
  }

  const cost = BUILDING_COST[action.building];
  if (player.production < cost) {
    return fail(
      'NOT_ENOUGH_PRODUCTION',
      `Stavba stojí ${cost} produkce, máš ${player.production}.`,
    );
  }

  return ok({
    ...world,
    players: {
      ...world.players,
      [player.id]: { ...player, production: player.production - cost },
    },
    regions: {
      ...world.regions,
      [region.id]: {
        ...region,
        slots: region.slots.map((existing, index) =>
          index === action.slot ? { ...existing, building: action.building } : existing,
        ),
      },
    },
  });
}
