import { describe, expect, it } from 'vitest';
import { availableResources } from '../src/rules/resources';
import { emptySlot, filledSlot, makeRegion, makeWorld, PLAYER_ID } from './helpers/makeWorld';

describe('availableResources', () => {
  it('vlastnit region se surovinou nestačí', () => {
    const world = makeWorld({
      regions: {
        home: makeRegion('home', {
          owner: PLAYER_ID,
          resources: ['iron'],
          slots: [emptySlot(), emptySlot('iron')],
        }),
      },
    });

    expect(availableResources(world, PLAYER_ID)).toEqual([]);
  });

  it('surovina se počítá, až když na jejím místě stojí správná stavba', () => {
    const world = makeWorld({
      regions: {
        home: makeRegion('home', {
          owner: PLAYER_ID,
          resources: ['iron'],
          slots: [filledSlot('mine', 'iron')],
        }),
      },
    });

    expect(availableResources(world, PLAYER_ID)).toEqual(['iron']);
  });

  it('důl na obecném místě surovinu nezpřístupní', () => {
    const world = makeWorld({
      regions: {
        home: makeRegion('home', {
          owner: PLAYER_ID,
          resources: ['iron'],
          slots: [filledSlot('mine'), emptySlot('iron')],
        }),
      },
    });

    expect(availableResources(world, PLAYER_ID)).toEqual([]);
  });

  it('koně zpřístupní farma, ne důl', () => {
    const world = makeWorld({
      regions: {
        pastvina: makeRegion('pastvina', {
          owner: PLAYER_ID,
          resources: ['horses'],
          slots: [filledSlot('farm', 'horses')],
        }),
        sachta: makeRegion('sachta', {
          owner: PLAYER_ID,
          resources: ['horses'],
          slots: [filledSlot('mine', 'horses')],
        }),
      },
    });

    expect(availableResources(world, PLAYER_ID)).toEqual(['horses']);
  });

  it('cizí ani neutrální regiony se nepočítají', () => {
    const world = makeWorld({
      regions: {
        cizi: makeRegion('cizi', { owner: 'p2', resources: ['gold'], slots: [filledSlot('mine', 'gold')] }),
        nicoji: makeRegion('nicoji', { resources: ['coal'], slots: [filledSlot('mine', 'coal')] }),
      },
    });

    expect(availableResources(world, PLAYER_ID)).toEqual([]);
  });

  it('sesbírá suroviny z celé říše a nikdy je neopakuje', () => {
    const world = makeWorld({
      regions: {
        a: makeRegion('a', { owner: PLAYER_ID, resources: ['iron'], slots: [filledSlot('mine', 'iron')] }),
        b: makeRegion('b', { owner: PLAYER_ID, resources: ['iron'], slots: [filledSlot('mine', 'iron')] }),
        c: makeRegion('c', { owner: PLAYER_ID, resources: ['gold'], slots: [filledSlot('mine', 'gold')] }),
      },
    });

    expect(availableResources(world, PLAYER_ID)).toEqual(['gold', 'iron']);
  });
});
