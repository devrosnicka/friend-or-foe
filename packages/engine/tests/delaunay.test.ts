import { describe, expect, it } from 'vitest';
import { triangulate, type Triangle } from '../src/map/delaunay';
import { circumcentre, distanceSquared, polygonArea } from '../src/map/geometry';
import { createRandom } from '../src/map/random';
import type { Point } from '../src/types';

function randomSites(count: number, seed: number): Point[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => ({ x: random.next() * 1000, y: random.next() * 700 }));
}

function jitteredGrid(columns: number, rows: number, seed: number): Point[] {
  const random = createRandom(seed);
  const sites: Point[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      sites.push({
        x: (column + 0.5 + (random.next() - 0.5) * 0.6) * 130,
        y: (row + 0.5 + (random.next() - 0.5) * 0.6) * 130,
      });
    }
  }
  return sites;
}

/** Konvexní obal (Andrew monotone chain) — triangulace ho musí přesně pokrýt. */
function hull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (source: readonly Point[]) => {
    const stack: Point[] = [];
    for (const point of source) {
      while (
        stack.length >= 2 &&
        cross(stack[stack.length - 2] as Point, stack[stack.length - 1] as Point, point) <= 0
      ) {
        stack.pop();
      }
      stack.push(point);
    }
    stack.pop();
    return stack;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
}

function triangleArea(sites: readonly Point[], triangle: Triangle): number {
  const a = sites[triangle.a] as Point;
  const b = sites[triangle.b] as Point;
  const c = sites[triangle.c] as Point;
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

const CASES: readonly (readonly [string, Point[]])[] = [
  ['12 náhodných bodů', randomSites(12, 1)],
  ['40 náhodných bodů', randomSites(40, 2)],
  ['90 náhodných bodů', randomSites(90, 3)],
  ['rozházená mřížka 9×8', jitteredGrid(9, 8, 5)],
  ['rozházená mřížka 15×13', jitteredGrid(15, 13, 6)],
];

describe('triangulate', () => {
  it.each(CASES)('%s: v žádné kružnici opsané neleží cizí bod', (_label, sites) => {
    for (const triangle of triangulate(sites)) {
      const radiusSquared = distanceSquared(triangle.centre, sites[triangle.a] as Point);
      sites.forEach((site, index) => {
        if (index === triangle.a || index === triangle.b || index === triangle.c) {
          return;
        }
        expect(distanceSquared(triangle.centre, site)).toBeGreaterThan(radiusSquared * (1 - 1e-9));
      });
    }
  });

  it.each(CASES)('%s: každá hrana patří nejvýš dvěma trojúhelníkům', (_label, sites) => {
    const uses = new Map<string, number>();
    for (const { a, b, c } of triangulate(sites)) {
      for (const [from, to] of [
        [a, b],
        [b, c],
        [a, c],
      ]) {
        const key = `${from},${to}`;
        uses.set(key, (uses.get(key) ?? 0) + 1);
      }
    }

    expect([...uses.values()].filter((count) => count > 2)).toEqual([]);
  });

  it.each(CASES)('%s: trojúhelníky přesně pokryjí konvexní obal', (_label, sites) => {
    const covered = triangulate(sites).reduce(
      (total, triangle) => total + triangleArea(sites, triangle),
      0,
    );

    expect(covered).toBeCloseTo(polygonArea(hull(sites)), 6);
  });

  it('vrchol trojúhelníku je vždy vzestupně seřazená trojice', () => {
    for (const triangle of triangulate(randomSites(40, 2))) {
      expect(triangle.a).toBeLessThan(triangle.b);
      expect(triangle.b).toBeLessThan(triangle.c);
    }
  });

  it('výsledek nezávisí na pořadí vkládání', () => {
    const sites = randomSites(30, 8);
    const shuffled = createRandom(4).shuffle(sites.map((_, index) => index));
    const reordered = shuffled.map((index) => sites[index] as Point);

    const asIs = triangulate(sites).map((t) => [t.a, t.b, t.c].map((i) => sites[i]));
    const mixed = triangulate(reordered).map((t) =>
      [t.a, t.b, t.c].map((i) => reordered[i]).sort((a, b) => a!.x - b!.x || a!.y - b!.y),
    );

    expect(mixed).toHaveLength(asIs.length);
  });

  it('trojice bodů na přímce se nepoužije', () => {
    const collinear: readonly Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 6 },
    ];

    expect(triangulate(collinear).some((t) => t.a === 0 && t.b === 1 && t.c === 2)).toBe(false);
  });

  it('méně než tři body nedají žádný trojúhelník', () => {
    expect(triangulate([])).toEqual([]);
    expect(triangulate([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([]);
  });

  it('střed kružnice opsané je stejně daleko od všech tří vrcholů', () => {
    const sites = randomSites(25, 9);
    for (const triangle of triangulate(sites)) {
      const distances = [triangle.a, triangle.b, triangle.c].map((corner) =>
        distanceSquared(triangle.centre, sites[corner] as Point),
      );

      expect(distances[1]).toBeCloseTo(distances[0] as number, 4);
      expect(distances[2]).toBeCloseTo(distances[0] as number, 4);
      expect(circumcentre(
        sites[triangle.a] as Point,
        sites[triangle.b] as Point,
        sites[triangle.c] as Point,
      )).not.toBeNull();
    }
  });
});
