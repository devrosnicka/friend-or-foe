import { describe, expect, it } from 'vitest';
import { createStarterWorld, STARTER_PLAYER_ID } from '../src/map/starterMap';

describe('createStarterWorld', () => {
  const world = createStarterWorld();
  const regions = Object.values(world.regions);

  it('je deterministická', () => {
    expect(createStarterWorld()).toEqual(world);
  });

  it('má 19 regionů (hexové pole o poloměru 2)', () => {
    expect(regions).toHaveLength(19);
  });

  it('začíná prvním tahem a jedním hráčem', () => {
    expect(world.turn).toBe(1);
    expect(Object.keys(world.players)).toEqual([STARTER_PLAYER_ID]);
  });

  it('hráč vlastní právě jeden startovní region, zbytek je neutrální', () => {
    const owned = regions.filter((region) => region.owner === STARTER_PLAYER_ID);

    expect(owned).toHaveLength(1);
    expect(regions.filter((region) => region.owner !== null)).toEqual(owned);
  });

  it('hráč si může hned dovolit zabrat sousední region', () => {
    const [home] = regions.filter((region) => region.owner === STARTER_PLAYER_ID);

    expect(home?.neighbours.length).toBeGreaterThan(0);
    expect(world.players[STARTER_PLAYER_ID]?.production).toBeGreaterThan(0);
  });

  it('sousednosti odkazují jen na existující regiony', () => {
    for (const region of regions) {
      for (const neighbourId of region.neighbours) {
        expect(world.regions[neighbourId], `${region.id} -> ${neighbourId}`).toBeDefined();
      }
    }
  });

  it('sousednosti jsou vzájemné a žádný region nesousedí sám se sebou', () => {
    for (const region of regions) {
      expect(region.neighbours).not.toContain(region.id);
      for (const neighbourId of region.neighbours) {
        expect(world.regions[neighbourId]?.neighbours).toContain(region.id);
      }
    }
  });

  it('vnitřní hex má šest sousedů, okrajové méně', () => {
    const center = world.regions['0,0'];
    const corner = world.regions['2,0'];

    expect(center?.neighbours).toHaveLength(6);
    expect(corner?.neighbours).toHaveLength(3);
  });

  it('žádný region nezačíná s budovami', () => {
    expect(regions.every((region) => region.buildings.length === 0)).toBe(true);
  });

  it('některé regiony nesou strategické suroviny', () => {
    expect(regions.filter((region) => region.resources.length > 0).length).toBeGreaterThan(0);
  });
});
