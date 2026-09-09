import type { ApplyResult, EndTurnAction, Player, PlayerId, World } from '../types';
import { playerIncome } from './production';
import { fail, ok } from './result';

/**
 * Ukončí tah: všem hráčům připíše příjem z jejich regionů a posune číslo tahu.
 * Ekonomika je záměrně plochá — terén ani strategické suroviny ji zatím neovlivňují.
 */
export function endTurn(world: World, action: EndTurnAction): ApplyResult {
  if (!world.players[action.playerId]) {
    return fail('UNKNOWN_PLAYER', `Hráč ${action.playerId} neexistuje.`);
  }

  const players: Record<PlayerId, Player> = {};
  for (const player of Object.values(world.players)) {
    players[player.id] = {
      ...player,
      production: player.production + playerIncome(world, player.id),
    };
  }

  return ok({ ...world, turn: world.turn + 1, players });
}
