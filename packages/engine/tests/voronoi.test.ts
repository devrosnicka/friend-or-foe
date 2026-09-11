import { describe, expect, it } from 'vitest';
import { buildVoronoi } from '../src/map/voronoi';
import { polygonArea } from '../src/map/geometry';
import type { Point } from '../src/types';

/** Bod uprostřed obklopený šesti dalšími — jediná uzavřená buňka je ta prostřední. */
const RING_OF_SIX: readonly Point[] = [
  { x: 0, y: 0 },
  ...Array.from({ length: 6 }, (_, corner) => ({
    x: 10 * Math.cos((corner * Math.PI) / 3),
    y: 10 * Math.sin((corner * Math.PI) / 3),
  })),
];

describe('buildVoronoi', () => {
  it('bod uvnitř dostane uzavřenou buňku, body na obalu ne', () => {
    const diagram = buildVoronoi(RING_OF_SIX);

    expect(diagram.cells[0]).not.toBeNull();
    expect(diagram.cells.slice(1).every((cell) => cell === null)).toBe(true);
  });

  it('uzavřená buňka má nezápornou plochu a sousedí se všemi okolními body', () => {
    const diagram = buildVoronoi(RING_OF_SIX);
    const centre = diagram.cells[0]!;

    expect(centre.neighbours).toEqual([1, 2, 3, 4, 5, 6]);
    expect(polygonArea(centre.ring.map((v) => diagram.vertices[v] as Point))).toBeGreaterThan(0);
  });

  it('sousednosti jsou vzájemné', () => {
    const grid: Point[] = [];
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        grid.push({ x: column * 10 + (row % 2) * 3, y: row * 10 });
      }
    }
    const diagram = buildVoronoi(grid);

    diagram.cells.forEach((cell, index) => {
      if (cell === null) {
        return;
      }
      for (const neighbour of cell.neighbours) {
        expect(diagram.cells[neighbour]?.neighbours ?? [index]).toContain(index);
      }
    });
  });

  it('buňka, která se dotýká jen rohem, soused není', () => {
    // Čtyři body kolem oka čtvercové mřížky leží na kružnici, takže oba
    // trojúhelníky, které oko dělí, mají týž střed kružnice opsané. Úhlopříčná
    // Voronoi hrana tak měří nulu — a kterou z obou úhlopříček Delaunay zvolí,
    // rozhodne zaokrouhlení. Sousedství přes roh proto neuznáváme.
    const grid: Point[] = [];
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        grid.push({ x: column * 10, y: row * 10 });
      }
    }
    const diagram = buildVoronoi(grid);

    // Prostřední bod mřížky má jen čtyři ortogonální sousedy, žádnou úhlopříčku.
    expect(diagram.cells[12]?.neighbours).toEqual([7, 11, 13, 17]);
    for (const cell of diagram.cells) {
      expect(cell === null || cell.neighbours.length === 4).toBe(true);
    }
  });

  it('bod bez jediného trojúhelníku uzavřenou buňku nemá', () => {
    const diagram = buildVoronoi([{ x: 0, y: 0 }, { x: 5, y: 5 }]);

    expect(diagram.cells).toEqual([null, null]);
    expect(diagram.vertices).toEqual([]);
  });
});
