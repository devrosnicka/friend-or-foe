import { triangulate } from './delaunay';
import type { Point } from '../types';

export interface VoronoiCell {
  readonly site: Point;
  /** Obrys jako indexy do `VoronoiDiagram.vertices`, v jednotném směru obchůzky. */
  readonly ring: readonly number[];
  /** Indexy sousedních bodů. */
  readonly neighbours: readonly number[];
}

export interface VoronoiDiagram {
  readonly sites: readonly Point[];
  /** Vrcholy diagramu, index odpovídá pořadí trojúhelníku triangulace. */
  readonly vertices: readonly Point[];
  /** `null` u bodů na okraji, jejichž buňka je neomezená. */
  readonly cells: readonly (VoronoiCell | null)[];
}

function edgeKey(from: number, to: number): string {
  return from < to ? `${from},${to}` : `${to},${from}`;
}

/**
 * Voronoi diagram odvozený z Delaunayovy triangulace: vrcholy buněk jsou
 * středy kružnic opsaných. Díky tomu sdílejí sousední buňky doslova tytéž
 * vrcholy, takže se dají později spojovat bez zaokrouhlovacích chyb.
 *
 * Buňky bodů na konvexním obalu jsou neomezené — vrací se jako `null`.
 */
export function buildVoronoi(sites: readonly Point[]): VoronoiDiagram {
  const triangles = triangulate(sites);
  const vertices = triangles.map((triangle) => triangle.centre);

  const incident = sites.map((): number[] => []);
  const edgeUses = new Map<string, number>();

  triangles.forEach((triangle, index) => {
    for (const corner of [triangle.a, triangle.b, triangle.c]) {
      (incident[corner] as number[]).push(index);
    }
    for (const [from, to] of [
      [triangle.a, triangle.b],
      [triangle.b, triangle.c],
      [triangle.a, triangle.c],
    ]) {
      const key = edgeKey(from as number, to as number);
      edgeUses.set(key, (edgeUses.get(key) ?? 0) + 1);
    }
  });

  const cells = sites.map((site, index): VoronoiCell | null => {
    const fan = incident[index] as number[];
    const neighbours = new Set<number>();
    let closed = fan.length > 0;

    for (const triangleIndex of fan) {
      const triangle = triangles[triangleIndex] as { a: number; b: number; c: number };
      for (const corner of [triangle.a, triangle.b, triangle.c]) {
        if (corner === index) {
          continue;
        }
        neighbours.add(corner);
        if (edgeUses.get(edgeKey(index, corner)) !== 2) {
          closed = false;
        }
      }
    }

    if (!closed) {
      return null;
    }

    const ring = [...fan].sort((left, right) => {
      const a = vertices[left] as Point;
      const b = vertices[right] as Point;
      return Math.atan2(a.y - site.y, a.x - site.x) - Math.atan2(b.y - site.y, b.x - site.x);
    });

    return { site, ring, neighbours: [...neighbours].sort((a, b) => a - b) };
  });

  return { sites, vertices, cells };
}
