import { build } from './rules/build';
import { claimRegion } from './rules/claimRegion';
import { endTurn } from './rules/endTurn';
import { fail } from './rules/result';
import type { Action, ApplyResult, World } from './types';

function applyAction(world: World, action: Action): ApplyResult {
  switch (action.type) {
    case 'claimRegion':
      return claimRegion(world, action);
    case 'build':
      return build(world, action);
    case 'endTurn':
      return endTurn(world, action);
    default: {
      const unknown: never = action;
      return fail('UNKNOWN_ACTION', `Neznámá akce: ${JSON.stringify(unknown)}`);
    }
  }
}

/**
 * Jediný vstupní bod herní logiky: (stav světa, akce) -> nový stav světa.
 *
 * Čistá funkce — vstupní svět nikdy nemutuje. Dávka je atomická: jakmile
 * některá akce poruší pravidlo, vrátí se chyba a volající si ponechá původní svět.
 */
export function applyActions(world: World, actions: readonly Action[]): ApplyResult {
  let current = world;

  for (const action of actions) {
    const result = applyAction(current, action);
    if (!result.ok) {
      return result;
    }
    current = result.world;
  }

  return { ok: true, world: current };
}
