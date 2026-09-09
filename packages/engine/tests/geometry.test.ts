import { describe, expect, it } from 'vitest';
import { circumcentre, distanceSquared, polygonArea, polygonCentroid } from '../src/map/geometry';

const SQUARE = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
];

describe('distanceSquared', () => {
  it('počítá druhou mocninu vzdálenosti', () => {
    expect(distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });
});

describe('circumcentre', () => {
  it('najde střed kružnice opsané', () => {
    const centre = circumcentre({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 4 });

    expect(centre?.x).toBeCloseTo(2);
    expect(centre?.y).toBeCloseTo(2);
  });

  it('je stejně daleko od všech tří vrcholů', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 6, y: 3 };
    const c = { x: 2, y: 7 };
    const centre = circumcentre(a, b, c);

    expect(distanceSquared(centre!, a)).toBeCloseTo(distanceSquared(centre!, b));
    expect(distanceSquared(centre!, b)).toBeCloseTo(distanceSquared(centre!, c));
  });

  it('pro body na přímce kružnice neexistuje', () => {
    expect(circumcentre({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
  });
});

describe('polygonArea', () => {
  it('počítá plochu bez ohledu na směr obchůzky', () => {
    expect(polygonArea(SQUARE)).toBe(16);
    expect(polygonArea([...SQUARE].reverse())).toBe(16);
  });
});

describe('polygonCentroid', () => {
  it('najde těžiště plochy', () => {
    expect(polygonCentroid(SQUARE)).toEqual({ x: 2, y: 2 });
  });

  it('u zdegenerovaného obrysu padá zpět na průměr vrcholů', () => {
    const centroid = polygonCentroid([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 4 },
    ]);

    expect(centroid).toEqual({ x: 2, y: 2 });
  });
});
