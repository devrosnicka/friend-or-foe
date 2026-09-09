import { CLAIM_COST } from '../constants';
import type { ApplyResult, ClaimRegionAction, World } from '../types';
import { fail, ok } from './result';

export function claimRegion(world: World, action: ClaimRegionAction): ApplyResult {
  const player = world.players[action.playerId];
  if (!player) {
    return fail('UNKNOWN_PLAYER', `Hráč ${action.playerId} neexistuje.`);
  }

  const region = world.regions[action.regionId];
  if (!region) {
    return fail('UNKNOWN_REGION', `Region ${action.regionId} neexistuje.`);
  }

  if (region.owner !== null) {
    return fail('REGION_NOT_NEUTRAL', `Region ${region.name} už má vlastníka.`);
  }

  const touchesPlayer = region.neighbours.some(
    (neighbourId) => world.regions[neighbourId]?.owner === player.id,
  );
  if (!touchesPlayer) {
    return fail(
      'REGION_NOT_ADJACENT',
      `Region ${region.name} nesousedí s žádným tvým regionem.`,
    );
  }

  if (player.production < CLAIM_COST) {
    return fail(
      'NOT_ENOUGH_PRODUCTION',
      `Zabrání stojí ${CLAIM_COST} produkce, máš ${player.production}.`,
    );
  }

  return ok({
    ...world,
    players: {
      ...world.players,
      [player.id]: { ...player, production: player.production - CLAIM_COST },
    },
    regions: {
      ...world.regions,
      [region.id]: { ...region, owner: player.id },
    },
  });
}
