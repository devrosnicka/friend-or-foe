import { describe, expect, it } from 'vitest';
import { buildLayout, type LayoutOptions } from '../src/map/layout';
import { createRandom } from '../src/map/random';
import { polygonArea } from '../src/map/geometry';
import { contains, makeDiagram } from './helpers/diagram';

const OPTIONS: LayoutOptions = {
  minNeighbours: 3,
  maxNeighbours: 5,
  mergeChance: 0.45,
  coastErosion: 0.2,
  minRegions: 6,
};

/** Rozvržení z konkrétního semínka — pro případy, kde na semínku záleží. */
function layoutFor(columns: number, rows: number, seed: number, options: LayoutOptions = OPTIONS) {
  const { diagram, interior } = makeDiagram(columns, rows);
  const layout = buildLayout(diagram, interior, options, createRandom(seed));

  expect(layout, `mřížka ${columns}×${rows}, semínko ${seed}`).not.toBeNull();
  return layout as NonNullable<typeof layout>;
}

function isWhole(layout: readonly { neighbours: readonly number[] }[]): boolean {
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length > 0) {
    for (const neighbour of layout[queue.pop() as number]?.neighbours ?? []) {
      if (!seen.has(neighbour)) {
        seen.add(neighbour);
        queue.push(neighbour);
      }
    }
  }
  return seen.size === layout.length;
}

/** První semínko, se kterým se z dané mřížky rozvržení povede. */
function firstLayout(columns: number, rows: number, options: LayoutOptions = OPTIONS) {
  const { diagram, interior } = makeDiagram(columns, rows);
  for (let seed = 1; seed < 200; seed += 1) {
    const layout = buildLayout(diagram, interior, options, createRandom(seed));
    if (layout !== null) {
      return layout;
    }
  }
  throw new Error('Testovací mřížka nedala ani jedno rozvržení.');
}

describe('buildLayout', () => {
  const layout = firstLayout(9, 8);

  it('každý region má tři až pět sousedů', () => {
    for (const region of layout) {
      expect(region.neighbours.length).toBeGreaterThanOrEqual(OPTIONS.minNeighbours);
      expect(region.neighbours.length).toBeLessThanOrEqual(OPTIONS.maxNeighbours);
    }
  });

  it('sousednosti jsou vzájemné a nikdo nesousedí sám se sebou', () => {
    layout.forEach((region, index) => {
      expect(region.neighbours).not.toContain(index);
      for (const neighbour of region.neighbours) {
        expect(layout[neighbour]?.neighbours).toContain(index);
      }
    });
  });

  it('obrysy jsou prosté mnohoúhelníky s kladnou plochou', () => {
    for (const region of layout) {
      expect(region.outline.length).toBeGreaterThanOrEqual(3);
      expect(new Set(region.outline)).toHaveProperty('size', region.outline.length);
      expect(polygonArea(region.outline)).toBeCloseTo(region.area);
      expect(region.area).toBeGreaterThan(0);
    }
  });

  it('popisný bod leží uvnitř regionu', () => {
    for (const region of layout) {
      expect(contains(region.outline, region.centre)).toBe(true);
    }
  });

  it('regiony jsou nepravidelně velké', () => {
    const areas = layout.map((region) => region.area);

    expect(Math.max(...areas) / Math.min(...areas)).toBeGreaterThan(1.5);
  });

  it('mapa drží pohromadě — ze všech regionů se dá dojít všude', () => {
    expect(isWhole(layout)).toBe(true);
  });

  it('nezaplaví region, kterým mapa drží pohromadě', () => {
    // Semínko 337 na mřížce 11×9 vede na šíji: zaplavení jednoho regionu by
    // pevninu rozdělilo, takže generátor musí sáhnout po jiném.
    const narrow = layoutFor(11, 9, 337);

    expect(isWhole(narrow)).toBe(true);
    expect(narrow.length).toBeGreaterThanOrEqual(OPTIONS.minRegions);
  });

  it('nesloučí regiony, které by kolem někoho uzavřely kruh', () => {
    // Semínko 10 na mřížce 9×8: osamělý region má souseda, se kterým by
    // dohromady obklíčily třetí region. Takové sloučení se musí zahodit,
    // jinak by vznikl obrys s dírou uprostřed.
    const ringed = layoutFor(9, 8, 10, { ...OPTIONS, maxNeighbours: 4 });
    expect(ringed.length).toBeGreaterThanOrEqual(OPTIONS.minRegions);

    for (const region of ringed) {
      expect(new Set(region.outline)).toHaveProperty('size', region.outline.length);
      expect(polygonArea(region.outline)).toBeGreaterThan(0);
    }
  });

  it('některé regiony leží u vody', () => {
    expect(layout.some((region) => region.coastal)).toBe(true);
  });

  it('bez slévání vzniknou jen konvexní buňky, se sléváním i větší regiony', () => {
    const plain = firstLayout(9, 8, { ...OPTIONS, mergeChance: 0 });
    const merged = firstLayout(9, 8, { ...OPTIONS, mergeChance: 1 });

    expect(Math.max(...merged.map((r) => r.area))).toBeGreaterThan(
      Math.max(...plain.map((r) => r.area)),
    );
  });

  it('okusování pobřeží se dá vypnout i zapnout naplno', () => {
    expect(firstLayout(9, 8, { ...OPTIONS, coastErosion: 0 }).length).toBeGreaterThan(0);
    expect(firstLayout(9, 8, { ...OPTIONS, coastErosion: 1 }).length).toBeGreaterThan(0);
  });

  it.each([
    [3, 4],
    [3, 7],
  ])('dodrží i jiné okno než výchozí — %i až %i sousedů', (min, max) => {
    const custom = firstLayout(9, 8, { ...OPTIONS, minNeighbours: min, maxNeighbours: max });

    for (const region of custom) {
      expect(region.neighbours.length).toBeGreaterThanOrEqual(min);
      expect(region.neighbours.length).toBeLessThanOrEqual(max);
    }
  });

  it('vrátí null, když by mapa klesla pod požadovaný počet regionů', () => {
    const { diagram, interior } = makeDiagram(9, 8);

    expect(buildLayout(diagram, interior, { ...OPTIONS, minRegions: 500 }, createRandom(1))).toBeNull();
  });

  it('vrátí null, když je uvnitř jediná buňka', () => {
    const { diagram, interior } = makeDiagram(3, 3);

    expect(interior).toHaveLength(1);
    expect(buildLayout(diagram, interior, OPTIONS, createRandom(1))).toBeNull();
  });
});
