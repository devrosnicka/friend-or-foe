import { triangulate } from './delaunay';
import { distanceSquared } from './geometry';
import type { Point } from '../types';

/**
 * Nejkratší společná hranice, kterou ještě bereme jako sousedství — jako
 * podíl vzdálenosti obou bodů, takže na měřítku mapy nezáleží.
 */
const MIN_BORDER_SHARE = 0.05;

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
 * Dotýkají se dvě buňky jen třískou místo pořádné hranice?
 *
 * Čtyři body kolem jednoho oka mřížky leží skoro na kružnici, takže oba
 * trojúhelníky, které to oko dělí, mají skoro stejný střed kružnice opsané.
 * Voronoi hrana duální k úhlopříčce pak vyjde jako tříska o délce setin
 * jednotky, zatímco typická hrana měří skoro celou rozteč. Takové dvě buňky
 * se prakticky dotýkají jediným bodem, a Delaunay si mezi oběma úhlopříčkami
 * vybírá podle zaokrouhlení — sousedství je tu artefakt triangulace, ne tvar
 * mapy. Kdyby takové buňky spadly do jednoho regionu, jeho obrys by se v tom
 * bodě sevřel a region by vypadal jako dva kusy spojené rohem.
 */
function touchesOnlyInPoint(
  vertices: readonly Point[],
  site: Point,
  other: Point,
  fan: readonly number[],
  otherFan: readonly number[],
): boolean {
  // Uzavřená buňka sdílí s každým sousedem právě dva trojúhelníky — jinak by
  // ji `closed` níž zahodilo — a jejich středy jsou konce společné hranice.
  const [from, to] = fan.filter((vertex) => otherFan.includes(vertex)) as [number, number];
  const border = distanceSquared(vertices[from] as Point, vertices[to] as Point);

  return border < MIN_BORDER_SHARE * MIN_BORDER_SHARE * distanceSquared(site, other);
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

    return {
      site,
      ring,
      neighbours: [...neighbours]
        .sort((a, b) => a - b)
        .filter(
          (other) =>
            !touchesOnlyInPoint(
              vertices,
              site,
              sites[other] as Point,
              fan,
              incident[other] as number[],
            ),
        ),
    };
  });

  return { sites, vertices, cells };
}
