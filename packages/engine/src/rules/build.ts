import { BUILDING_COST } from '../constants';
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
      [region.id]: { ...region, buildings: [...region.buildings, action.building] },
    },
  });
}
