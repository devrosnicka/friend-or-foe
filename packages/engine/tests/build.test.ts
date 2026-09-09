import { describe, expect, it } from 'vitest';
import { BUILDING_COST } from '../src/constants';
import { build } from '../src/rules/build';
import type { BuildingType, World } from '../src/types';
import { expectOk, expectViolation } from './helpers/expect';
import { makeWorld, PLAYER_ID } from './helpers/makeWorld';

function buildIn(
  world: World = makeWorld(),
  regionId = 'home',
  building: BuildingType = 'farm',
  playerId = PLAYER_ID,
) {
  return build(world, { type: 'build', playerId, regionId, building });
}

describe('build', () => {
  it('postaví budovu ve vlastním regionu', () => {
    const world = expectOk(buildIn());

    expect(world.regions['home']?.buildings).toEqual(['farm']);
  });

  it('strhne cenu budovy z produkce hráče', () => {
    const world = expectOk(buildIn(makeWorld({ production: 50 }), 'home', 'mine'));

    expect(world.players[PLAYER_ID]?.production).toBe(50 - BUILDING_COST.mine);
  });

  it('povolí v regionu několik budov vedle sebe', () => {
    const first = expectOk(buildIn());
    const second = expectOk(buildIn(first, 'home', 'barracks'));

    expect(second.regions['home']?.buildings).toEqual(['farm', 'barracks']);
  });

  it('odmítne neznámého hráče', () => {
    expectViolation(buildIn(makeWorld(), 'home', 'farm', 'nikdo'), 'UNKNOWN_PLAYER');
  });

  it('odmítne neznámý region', () => {
    expectViolation(buildIn(makeWorld(), 'neexistuje'), 'UNKNOWN_REGION');
  });

  it('odmítne stavbu v neutrálním regionu', () => {
    expectViolation(buildIn(makeWorld(), 'near'), 'REGION_NOT_OWNED');
  });

  it('odmítne stavbu při nedostatku produkce', () => {
    const world = makeWorld({ production: BUILDING_COST.barracks - 1 });

    expectViolation(buildIn(world, 'home', 'barracks'), 'NOT_ENOUGH_PRODUCTION');
  });
});
