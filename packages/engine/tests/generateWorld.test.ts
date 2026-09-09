import { describe, expect, it } from 'vitest';
import { generateWorld, type WorldOptions } from '../src/map/generateWorld';
import { STARTER_OPTIONS } from '../src/map/starterMap';

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

/**
 * Vlastnosti mapy se ověřují na malé mřížce — jsou stejné jako na ostré,
 * jen se to negeneruje desetinu sekundy. Že sedí i produkční nastavení,
 * hlídá zvlášť test dole a `starterMap.test.ts`.
 */
function withSeed(seed: number): WorldOptions {
  return { ...STARTER_OPTIONS, seed, columns: 15, rows: 13, minRegions: 12 };
}

describe('generateWorld', () => {
  it('je deterministická', () => {
    expect(generateWorld(withSeed(11))).toEqual(generateWorld(withSeed(11)));
  });

  it('jiné semínko dá jinou mapu', () => {
    expect(generateWorld(withSeed(11))).not.toEqual(generateWorld(withSeed(12)));
  });

  it.each(SEEDS)('semínko %i dá hratelnou mapu', (seed) => {
    const options = withSeed(seed);
    const world = generateWorld(options);
    const regions = Object.values(world.regions);

    expect(regions.length).toBeGreaterThanOrEqual(options.minRegions);
    expect(world.turn).toBe(1);

    for (const region of regions) {
      expect(region.neighbours.length).toBeGreaterThanOrEqual(STARTER_OPTIONS.minNeighbours);
      expect(region.neighbours.length).toBeLessThanOrEqual(STARTER_OPTIONS.maxNeighbours);
      expect(region.neighbours).not.toContain(region.id);
      expect(region.buildings).toEqual([]);
      expect(region.shape.outline.length).toBeGreaterThanOrEqual(3);

      for (const neighbour of region.neighbours) {
        expect(world.regions[neighbour]?.neighbours).toContain(region.id);
      }
    }
  });

  it.each(SEEDS)('semínko %i dá jednoho hráče s jedním startovním regionem', (seed) => {
    const world = generateWorld(withSeed(seed));
    const owned = Object.values(world.regions).filter((region) => region.owner !== null);

    expect(Object.keys(world.players)).toEqual([STARTER_OPTIONS.playerId]);
    expect(owned).toHaveLength(1);
    expect(owned[0]?.owner).toBe(STARTER_OPTIONS.playerId);
    expect(world.players[STARTER_OPTIONS.playerId]?.production).toBe(
      STARTER_OPTIONS.startingProduction,
    );
  });

  it.each(SEEDS)('semínko %i dá pojmenované regiony a smysluplné suroviny', (seed) => {
    const regions = Object.values(generateWorld(withSeed(seed)).regions);
    const names = regions.map((region) => region.name);

    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => /^[A-Z][a-z]+$/.test(name))).toBe(true);

    for (const region of regions) {
      expect(region.resources.length).toBeLessThanOrEqual(1);
      if (region.terrain === 'plains') {
        expect(region.resources.every((resource) => resource === 'horses')).toBe(true);
      }
    }
  });

  it('dohromady se objeví všechny druhy terénu i strategických surovin', () => {
    const regions = SEEDS.flatMap((seed) => Object.values(generateWorld(withSeed(seed)).regions));

    expect(new Set(regions.map((region) => region.terrain))).toEqual(
      new Set(['plains', 'forest', 'hills', 'mountains', 'coast']),
    );
    expect(new Set(regions.flatMap((region) => region.resources)).size).toBeGreaterThan(3);
  });

  it('regiony se nepřekrývají, protože každou hranu sdílí nanejvýš dva z nich', () => {
    const world = generateWorld(withSeed(4));
    const edges = new Map<string, number>();

    for (const region of Object.values(world.regions)) {
      const outline = region.shape.outline;
      for (let i = 0; i < outline.length; i += 1) {
        const a = outline[i]!;
        const b = outline[(i + 1) % outline.length]!;
        const key = [`${a.x},${a.y}`, `${b.x},${b.y}`].sort().join('|');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }

    expect([...edges.values()].every((count) => count <= 2)).toBe(true);
  });

  it('ostré nastavení dá mapu o stovkách regionů', () => {
    const world = generateWorld(STARTER_OPTIONS);
    const regions = Object.values(world.regions);

    expect(regions.length).toBeGreaterThanOrEqual(STARTER_OPTIONS.minRegions);
    for (const region of regions) {
      expect(region.neighbours.length).toBeGreaterThanOrEqual(STARTER_OPTIONS.minNeighbours);
      expect(region.neighbours.length).toBeLessThanOrEqual(STARTER_OPTIONS.maxNeighbours);
    }
    expect(new Set(regions.map((region) => region.name)).size).toBe(regions.length);
  });

  it('dodrží i jinak nastavené okno sousednosti', () => {
    // Podlaha 4 vyjde jen na některých semínkách — mapa se kvůli ní zmenší,
    // protože regiony na pobřeží mají přirozeně tři sousedy a musí pryč.
    const world = generateWorld({
      ...withSeed(202),
      minNeighbours: 4,
      maxNeighbours: 9,
      minRegions: 6,
      attempts: 300,
    });

    expect(Object.keys(world.regions).length).toBeGreaterThan(0);

    for (const region of Object.values(world.regions)) {
      expect(region.neighbours.length).toBeGreaterThanOrEqual(4);
      expect(region.neighbours.length).toBeLessThanOrEqual(9);
    }
  });

  it('vzdá to, když z tak malé mřížky mapa vzniknout nemůže', () => {
    expect(() =>
      generateWorld({ ...STARTER_OPTIONS, columns: 3, rows: 3, attempts: 16 }),
    ).toThrow(/16 pokusů/);
  });
});
