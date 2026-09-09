import { describe, expect, it } from 'vitest';
import { BASE_REGION_PRODUCTION, BUILDING_PRODUCTION } from '../src/constants';
import { endTurn } from '../src/rules/endTurn';
import { expectOk, expectViolation } from './helpers/expect';
import { filledSlot, makePlayer, makeRegion, makeWorld, PLAYER_ID } from './helpers/makeWorld';

const endTurnFor = (world = makeWorld(), playerId = PLAYER_ID) =>
  endTurn(world, { type: 'endTurn', playerId });

describe('endTurn', () => {
  it('posune číslo tahu', () => {
    const world = expectOk(endTurnFor(makeWorld({ turn: 7 })));

    expect(world.turn).toBe(8);
  });

  it('připíše základní produkci za vlastněný region', () => {
    const world = expectOk(endTurnFor(makeWorld({ production: 0 })));

    expect(world.players[PLAYER_ID]?.production).toBe(BASE_REGION_PRODUCTION);
  });

  it('započítá výnos budov', () => {
    const start = makeWorld({
      production: 0,
      regions: {
        home: makeRegion('home', { owner: PLAYER_ID, slots: [filledSlot('farm'), filledSlot('mine')] }),
      },
    });

    const world = expectOk(endTurnFor(start));

    expect(world.players[PLAYER_ID]?.production).toBe(
      BASE_REGION_PRODUCTION + BUILDING_PRODUCTION.farm + BUILDING_PRODUCTION.mine,
    );
  });

  it('nepřipisuje nic za neutrální regiony', () => {
    const start = makeWorld({
      production: 0,
      regions: {
        home: makeRegion('home', { owner: PLAYER_ID }),
        divocina: makeRegion('divocina', { slots: [filledSlot('farm')] }),
      },
    });

    const world = expectOk(endTurnFor(start));

    expect(world.players[PLAYER_ID]?.production).toBe(BASE_REGION_PRODUCTION);
  });

  it('připíše příjem všem hráčům, nejen tomu, kdo tah ukončil', () => {
    const start = makeWorld({
      production: 0,
      players: {
        p1: makePlayer('p1', { production: 0 }),
        p2: makePlayer('p2', { production: 0 }),
      },
      regions: {
        home: makeRegion('home', { owner: 'p1' }),
        vychod: makeRegion('vychod', { owner: 'p2', slots: [filledSlot('farm')] }),
      },
    });

    const world = expectOk(endTurnFor(start));

    expect(world.players['p1']?.production).toBe(BASE_REGION_PRODUCTION);
    expect(world.players['p2']?.production).toBe(
      BASE_REGION_PRODUCTION + BUILDING_PRODUCTION.farm,
    );
  });

  it('kasárna zatím nic nevynášejí', () => {
    const start = makeWorld({
      production: 0,
      regions: { home: makeRegion('home', { owner: PLAYER_ID, slots: [filledSlot('barracks')] }) },
    });

    const world = expectOk(endTurnFor(start));

    expect(world.players[PLAYER_ID]?.production).toBe(BASE_REGION_PRODUCTION);
  });

  it('odmítne neznámého hráče', () => {
    expectViolation(endTurnFor(makeWorld(), 'nikdo'), 'UNKNOWN_PLAYER');
  });
});
