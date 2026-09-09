import { describe, expect, it } from 'vitest';
import { BUILDING_COST } from '../src/constants';
import { build } from '../src/rules/build';
import type { BuildingType, World } from '../src/types';
import { expectOk, expectViolation } from './helpers/expect';
import { emptySlot, makeRegion, makeWorld, PLAYER_ID } from './helpers/makeWorld';

function buildIn(
  world: World = makeWorld(),
  regionId = 'home',
  building: BuildingType = 'farm',
  slot = 0,
  playerId = PLAYER_ID,
) {
  return build(world, { type: 'build', playerId, regionId, slot, building });
}

/** Svět, kde domovský region má vedle obecných míst i místo se železem. */
function withIron(production = 100): World {
  return makeWorld({
    production,
    regions: {
      home: makeRegion('home', {
        owner: PLAYER_ID,
        neighbours: ['near'],
        resources: ['iron'],
        slots: [emptySlot(), emptySlot('iron')],
      }),
      near: makeRegion('near', { neighbours: ['home'] }),
    },
  });
}

describe('build', () => {
  it('postaví budovu na volné místo', () => {
    const world = expectOk(buildIn());

    expect(world.regions['home']?.slots[0]?.building).toBe('farm');
  });

  it('ostatní místa nechá volná', () => {
    const world = expectOk(buildIn());

    expect(world.regions['home']?.slots.slice(1).every((slot) => slot.building === null)).toBe(true);
  });

  it('strhne cenu budovy z produkce hráče', () => {
    const world = expectOk(buildIn(makeWorld({ production: 50 }), 'home', 'mine'));

    expect(world.players[PLAYER_ID]?.production).toBe(50 - BUILDING_COST.mine);
  });

  it('povolí v regionu několik budov vedle sebe', () => {
    const first = expectOk(buildIn());
    const second = expectOk(buildIn(first, 'home', 'barracks', 1));

    expect(second.regions['home']?.slots.map((slot) => slot.building)).toEqual([
      'farm',
      'barracks',
      null,
    ]);
  });

  it('důl se dá postavit i na obecné místo', () => {
    const world = expectOk(buildIn(withIron(), 'home', 'mine'));

    expect(world.regions['home']?.slots[0]?.building).toBe('mine');
  });

  it('na místo suroviny postaví stavbu, která ji zpřístupní', () => {
    const world = expectOk(buildIn(withIron(), 'home', 'mine', 1));

    expect(world.regions['home']?.slots[1]).toEqual({ requires: 'iron', building: 'mine' });
  });

  it('odmítne na místě suroviny stavbu, která k ní nepatří', () => {
    expectViolation(buildIn(withIron(), 'home', 'farm', 1), 'BUILDING_NOT_ALLOWED');
  });

  it('odmítne místo, které v regionu není', () => {
    expectViolation(buildIn(makeWorld(), 'home', 'farm', 99), 'UNKNOWN_SLOT');
  });

  it('odmítne obsazené místo', () => {
    const first = expectOk(buildIn());

    expectViolation(buildIn(first, 'home', 'barracks'), 'SLOT_TAKEN');
  });

  it('odmítne neznámého hráče', () => {
    expectViolation(buildIn(makeWorld(), 'home', 'farm', 0, 'nikdo'), 'UNKNOWN_PLAYER');
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
