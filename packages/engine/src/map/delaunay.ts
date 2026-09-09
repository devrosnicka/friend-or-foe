import { circumcentre, distanceSquared } from './geometry';
import type { Point } from '../types';

export interface Triangle {
  /** Indexy bodů, vždy vzestupně. */
  readonly a: number;
  readonly b: number;
  readonly c: number;
  /** Střed kružnice opsané — zároveň vrchol Voronoi diagramu. */
  readonly centre: Point;
}

/**
 * Delaunayova triangulace hrubou silou: trojúhelník patří do triangulace,
 * když v jeho kružnici opsané neleží žádný další bod.
 *
 * Je to O(n^4), což pro pár desítek bodů mapy trvá zlomek milisekundy
 * a ušetří stovky řádků chytřejšího algoritmu.
 */
export function triangulate(sites: readonly Point[]): Triangle[] {
  const triangles: Triangle[] = [];

  for (let a = 0; a < sites.length; a += 1) {
    for (let b = a + 1; b < sites.length; b += 1) {
      for (let c = b + 1; c < sites.length; c += 1) {
        const centre = circumcentre(sites[a] as Point, sites[b] as Point, sites[c] as Point);
        if (centre === null) {
          continue;
        }

        const radiusSquared = distanceSquared(centre, sites[a] as Point);
        const tolerance = radiusSquared * 1e-9;
        const empty = sites.every(
          (site, index) =>
            index === a ||
            index === b ||
            index === c ||
            distanceSquared(centre, site) > radiusSquared - tolerance,
        );

        if (empty) {
          triangles.push({ a, b, c, centre });
        }
      }
    }
  }

  return triangles;
}
