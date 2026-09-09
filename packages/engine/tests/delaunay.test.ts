import { describe, expect, it } from 'vitest';
import { triangulate } from '../src/map/delaunay';
import { distanceSquared } from '../src/map/geometry';
import type { Point } from '../src/types';

const SQUARE: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
  { x: 4, y: 6 },
];

describe('triangulate', () => {
  it('žádný bod neleží v kružnici opsané cizímu trojúhelníku', () => {
    const triangles = triangulate(SQUARE);

    expect(triangles.length).toBeGreaterThan(0);
    for (const triangle of triangles) {
      const radiusSquared = distanceSquared(triangle.centre, SQUARE[triangle.a] as Point);
      SQUARE.forEach((site, index) => {
        if (index === triangle.a || index === triangle.b || index === triangle.c) {
          return;
        }
        expect(distanceSquared(triangle.centre, site)).toBeGreaterThan(radiusSquared * 0.999);
      });
    }
  });

  it('vrchol trojúhelníku je vždy vzestupně seřazená trojice', () => {
    for (const triangle of triangulate(SQUARE)) {
      expect(triangle.a).toBeLessThan(triangle.b);
      expect(triangle.b).toBeLessThan(triangle.c);
    }
  });

  it('trojice bodů na přímce se přeskočí', () => {
    const collinear: readonly Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 6 },
    ];
    const triangles = triangulate(collinear);

    expect(triangles).toHaveLength(2);
    expect(triangles.some((t) => t.a === 0 && t.b === 1 && t.c === 2)).toBe(false);
  });

  it('méně než tři body nedají žádný trojúhelník', () => {
    expect(triangulate([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([]);
  });
});
