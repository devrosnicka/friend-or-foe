import { buildVoronoi, type VoronoiDiagram } from '../../src/map/voronoi';
import type { Point } from '../../src/types';

export interface TestDiagram {
  readonly diagram: VoronoiDiagram;
  /** Indexy bodů, ze kterých smí být pevnina — vnější prstenec je jen rám. */
  readonly interior: number[];
}

/** Pravidelná mřížka s lehkým posunem lichých řad, aby nevznikly čtverce. */
export function makeDiagram(columns: number, rows: number): TestDiagram {
  const points: Point[] = [];
  const interior: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const onFrame = column === 0 || row === 0 || column === columns - 1 || row === rows - 1;
      if (!onFrame) {
        interior.push(points.length);
      }
      points.push({ x: column * 100 + (row % 2) * 17, y: row * 100 + (column % 3) * 9 });
    }
  }

  return { diagram: buildVoronoi(points), interior };
}

/** Leží bod uvnitř mnohoúhelníku? Ray casting doprava. */
export function contains(outline: readonly Point[], point: Point): boolean {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
    const a = outline[i] as Point;
    const b = outline[j] as Point;
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}
