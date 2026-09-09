import { describe, expect, it } from 'vitest';
import {
  createStarterWorld,
  createWorldFromSeed,
  STARTER_OPTIONS,
  STARTER_PLAYER_ID,
} from '../src/map/starterMap';

describe('createStarterWorld', () => {
  const world = createStarterWorld();
  const regions = Object.values(world.regions);

  it('je deterministická', () => {
    expect(createStarterWorld()).toEqual(world);
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

  it('každý region má tři až pět sousedů', () => {
    for (const region of regions) {
      expect(region.neighbours.length).toBeGreaterThanOrEqual(STARTER_OPTIONS.minNeighbours);
      expect(region.neighbours.length).toBeLessThanOrEqual(STARTER_OPTIONS.maxNeighbours);
    }
  });

  it('regiony jsou nepravidelně velké a nepravidelně tvarované', () => {
    const corners = regions.map((region) => region.shape.outline.length);

    expect(new Set(corners).size).toBeGreaterThan(2);
  });

  it('žádný region nezačíná s budovami', () => {
    expect(regions.every((region) => region.slots.every((slot) => slot.building === null))).toBe(
      true,
    );
  });

  it('každý region má aspoň jedno stavební místo a surovina přidá vlastní', () => {
    for (const region of regions) {
      const special = region.slots.filter((slot) => slot.requires !== null);

      expect(region.slots.length).toBeGreaterThan(0);
      expect(special.map((slot) => slot.requires)).toEqual([...region.resources]);
    }
  });

  it('některé regiony nesou strategické suroviny', () => {
    expect(regions.filter((region) => region.resources.length > 0).length).toBeGreaterThan(0);
  });
});

describe('createWorldFromSeed', () => {
  it('ze stejného semínka udělá stejnou mapu', () => {
    expect(createWorldFromSeed(123)).toEqual(createWorldFromSeed(123));
  });

  it('z jiného semínka udělá jinou mapu', () => {
    expect(createWorldFromSeed(123)).not.toEqual(createWorldFromSeed(124));
  });
});
