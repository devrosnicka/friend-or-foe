import { describe, expect, it } from 'vitest';
import { CLAIM_COST } from '../src/constants';
import { claimRegion } from '../src/rules/claimRegion';
import { expectOk, expectViolation } from './helpers/expect';
import { makeRegion, makeWorld, PLAYER_ID } from './helpers/makeWorld';

function claim(world = makeWorld(), regionId = 'near', playerId = PLAYER_ID) {
  return claimRegion(world, { type: 'claimRegion', playerId, regionId });
}

describe('claimRegion', () => {
  it('zabere sousední neutrální region', () => {
    const world = expectOk(claim());

    expect(world.regions['near']?.owner).toBe(PLAYER_ID);
  });

  it('strhne cenu zabrání z produkce hráče', () => {
    const world = expectOk(claim(makeWorld({ production: 50 })));

    expect(world.players[PLAYER_ID]?.production).toBe(50 - CLAIM_COST);
  });

  it('nemění ostatní regiony', () => {
    const before = makeWorld();
    const world = expectOk(claim(before));

    expect(world.regions['far']).toEqual(before.regions['far']);
    expect(world.regions['home']).toEqual(before.regions['home']);
  });

  it('odmítne neznámého hráče', () => {
    expectViolation(claim(makeWorld(), 'near', 'nikdo'), 'UNKNOWN_PLAYER');
  });

  it('odmítne neznámý region', () => {
    expectViolation(claim(makeWorld(), 'neexistuje'), 'UNKNOWN_REGION');
  });

  it('odmítne region, který už někdo vlastní', () => {
    expectViolation(claim(makeWorld(), 'home'), 'REGION_NOT_NEUTRAL');
  });

  it('odmítne region, který nesousedí s územím hráče', () => {
    expectViolation(claim(makeWorld(), 'far'), 'REGION_NOT_ADJACENT');
  });

  it('ignoruje sousedy, kteří na mapě neexistují', () => {
    const world = makeWorld({
      regions: {
        home: makeRegion('home', { owner: PLAYER_ID }),
        okraj: makeRegion('okraj', { neighbours: ['duch'] }),
      },
    });

    expectViolation(claim(world, 'okraj'), 'REGION_NOT_ADJACENT');
  });

  it('odmítne zabrání při nedostatku produkce', () => {
    expectViolation(claim(makeWorld({ production: CLAIM_COST - 1 })), 'NOT_ENOUGH_PRODUCTION');
  });

  it('povolí zabrání přesně za poslední produkci', () => {
    const world = expectOk(claim(makeWorld({ production: CLAIM_COST })));

    expect(world.players[PLAYER_ID]?.production).toBe(0);
    expect(world.regions['near']?.owner).toBe(PLAYER_ID);
  });
});
