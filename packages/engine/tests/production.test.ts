import { describe, expect, it } from 'vitest';
import { BASE_REGION_PRODUCTION, BUILDING_PRODUCTION } from '../src/constants';
import { playerIncome, regionProduction } from '../src/rules/production';
import { makeRegion, makeWorld, PLAYER_ID } from './helpers/makeWorld';

describe('regionProduction', () => {
  it('region bez budov vynáší základní produkci', () => {
    expect(regionProduction(makeRegion('a'))).toBe(BASE_REGION_PRODUCTION);
  });

  it('budovy se sčítají', () => {
    const region = makeRegion('a', { buildings: ['farm', 'farm'] });

    expect(regionProduction(region)).toBe(BASE_REGION_PRODUCTION + 2 * BUILDING_PRODUCTION.farm);
  });
});

describe('playerIncome', () => {
  it('sečte produkci všech regionů hráče', () => {
    const world = makeWorld({
      regions: {
        home: makeRegion('home', { owner: PLAYER_ID }),
        druhy: makeRegion('druhy', { owner: PLAYER_ID, buildings: ['mine'] }),
        cizi: makeRegion('cizi', { owner: 'p2' }),
      },
    });

    expect(playerIncome(world, PLAYER_ID)).toBe(
      2 * BASE_REGION_PRODUCTION + BUILDING_PRODUCTION.mine,
    );
  });

  it('hráč bez regionů nemá příjem', () => {
    expect(playerIncome(makeWorld(), 'p2')).toBe(0);
  });
});
