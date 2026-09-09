import type { Point } from '../types';

/** Tolerance pro porovnání s nulou. Souřadnice mapy jsou v řádu stovek. */
const EPSILON = 1e-9;

export function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Střed kružnice opsané trojúhelníku — a tím i vrchol Voronoi diagramu.
 * Pro tři body na přímce kružnice neexistuje a funkce vrací `null`.
 */
export function circumcentre(a: Point, b: Point, c: Point): Point | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < EPSILON) {
    return null;
  }

  const aa = a.x * a.x + a.y * a.y;
  const bb = b.x * b.x + b.y * b.y;
  const cc = c.x * c.x + c.y * c.y;

  return {
    x: (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / d,
    y: (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / d,
  };
}

/** Dvojnásobek orientované plochy mnohoúhelníku (shoelace). */
function doubleSignedArea(ring: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const current = ring[i] as Point;
    const next = ring[(i + 1) % ring.length] as Point;
    sum += current.x * next.y - next.x * current.y;
  }
  return sum;
}

export function polygonArea(ring: readonly Point[]): number {
  return Math.abs(doubleSignedArea(ring)) / 2;
}

/**
 * Těžiště plochy mnohoúhelníku. Pro zdegenerovaný obrys s nulovou plochou
 * padá zpět na průměr vrcholů.
 */
export function polygonCentroid(ring: readonly Point[]): Point {
  const doubleArea = doubleSignedArea(ring);
  if (Math.abs(doubleArea) < EPSILON) {
    const sum = ring.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), {
      x: 0,
      y: 0,
    });
    return { x: sum.x / ring.length, y: sum.y / ring.length };
  }

  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const current = ring[i] as Point;
    const next = ring[(i + 1) % ring.length] as Point;
    const cross = current.x * next.y - next.x * current.y;
    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }

  return { x: x / (3 * doubleArea), y: y / (3 * doubleArea) };
}
