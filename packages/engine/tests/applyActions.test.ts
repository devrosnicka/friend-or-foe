import { describe, expect, it } from 'vitest';
import { applyActions } from '../src/applyActions';
import { BUILDING_COST, CLAIM_COST } from '../src/constants';
import type { Action } from '../src/types';
import { expectOk, expectViolation } from './helpers/expect';
import { makeWorld, PLAYER_ID } from './helpers/makeWorld';

describe('applyActions', () => {
  it('prázdná dávka vrátí nezměněný svět', () => {
    const before = makeWorld();

    expect(expectOk(applyActions(before, []))).toEqual(before);
  });

  it('aplikuje akce po sobě na průběžný stav světa', () => {
    const before = makeWorld({ production: 100 });

    const world = expectOk(
      applyActions(before, [
        { type: 'claimRegion', playerId: PLAYER_ID, regionId: 'near' },
        { type: 'build', playerId: PLAYER_ID, regionId: 'near', building: 'farm' },
        { type: 'endTurn', playerId: PLAYER_ID },
      ]),
    );

    expect(world.regions['near']?.buildings).toEqual(['farm']);
    expect(world.turn).toBe(2);
  });

  it('umožní zabrat region řetězem přes čerstvě získané území', () => {
    const world = expectOk(
      applyActions(makeWorld(), [
        { type: 'claimRegion', playerId: PLAYER_ID, regionId: 'near' },
        { type: 'claimRegion', playerId: PLAYER_ID, regionId: 'far' },
      ]),
    );

    expect(world.regions['far']?.owner).toBe(PLAYER_ID);
  });

  it('při porušení pravidla nechá původní svět nedotčený', () => {
    const before = makeWorld({ production: CLAIM_COST + BUILDING_COST.farm });

    const result = applyActions(before, [
      { type: 'claimRegion', playerId: PLAYER_ID, regionId: 'near' },
      { type: 'build', playerId: PLAYER_ID, regionId: 'near', building: 'barracks' },
    ]);

    expectViolation(result, 'NOT_ENOUGH_PRODUCTION');
    expect(before.regions['near']?.owner).toBeNull();
    expect(before.players[PLAYER_ID]?.production).toBe(CLAIM_COST + BUILDING_COST.farm);
  });

  it('odmítne neznámý typ akce', () => {
    const neznama = { type: 'teleport', playerId: PLAYER_ID } as unknown as Action;

    expectViolation(applyActions(makeWorld(), [neznama]), 'UNKNOWN_ACTION');
  });
});
