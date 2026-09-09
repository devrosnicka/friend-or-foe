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

interface Candidate extends Triangle {
  readonly radiusSquared: number;
}

/**
 * Jak daleko sahá pomocný trojúhelník, měřeno v šířkách mapy.
 *
 * Musí obsáhnout kružnice opsané všech skutečných trojúhelníků, jinak by
 * jeho vrcholy do triangulace zasáhly a některé trojúhelníky by vypadly.
 * Skoro kolineární trojice na okraji přitom mají kružnici opsanou o poloměru
 * mnoha set šířek mapy, takže rezerva musí být velkorysá.
 */
const SUPER_SPREAD = 4096;

/**
 * Trojúhelník i s kružnicí opsanou.
 *
 * Vrcholy nikdy neleží na přímce, takže kružnice opsaná vždycky existuje.
 * Pomocný trojúhelník je z konstrukce pořádný a vkládaný bod leží vždy
 * uvnitř díry, kterou vyplňuje: kdyby padl přesně na některou její hranu,
 * ležel by uvnitř kružnice opsané trojúhelníku za tou hranou — a ta hrana
 * by se tím pádem na obvodu díry vůbec neobjevila.
 */
function makeCandidate(points: readonly Point[], a: number, b: number, c: number): Candidate {
  const centre = circumcentre(
    points[a] as Point,
    points[b] as Point,
    points[c] as Point,
  ) as Point;
  const [first, second, third] = [a, b, c].sort((left, right) => left - right) as [
    number,
    number,
    number,
  ];
  return {
    a: first,
    b: second,
    c: third,
    centre,
    radiusSquared: distanceSquared(centre, points[a] as Point),
  };
}

interface Frame {
  readonly centreX: number;
  readonly centreY: number;
  readonly extent: number;
}

/**
 * Souřadnice se pro stavbu přepočítají do jednotkového rámce kolem počátku.
 * Pomocný trojúhelník je tisíckrát větší než mapa a v původních souřadnicích
 * by jeho vrcholy ležely tak daleko, že by výpočet středů kružnic ztrácel
 * platné číslice.
 */
function frameOf(sites: readonly Point[]): Frame {
  const xs = sites.map((site) => site.x);
  const ys = sites.map((site) => site.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    centreX: (minX + maxX) / 2,
    centreY: (minY + maxY) / 2,
    extent: Math.max(maxX - minX, maxY - minY, Number.MIN_VALUE),
  };
}

/** Hrany se předávají vždy od nižšího indexu k vyššímu, tak stačí je spojit. */
function edgeKey(from: number, to: number): string {
  return `${from},${to}`;
}

/**
 * Delaunayova triangulace algoritmem Bowyer–Watson.
 *
 * Body se vkládají jeden po druhém. Trojúhelníky, kterým nový bod padne do
 * kružnice opsané, přestávají platit; díra, kterou po sobě nechají, se
 * vyplní vějířem z nového bodu. Je to O(n²) — proti dřívějšímu zkoušení
 * všech trojic, které rostlo zhruba jako n^3,8, to na tisícovce bodů dělá
 * rozdíl mezi minutami a zlomkem sekundy.
 *
 * Trojúhelníky se vracejí seřazené podle indexů vrcholů, takže výsledek
 * nezávisí na pořadí vkládání.
 */
export function triangulate(sites: readonly Point[]): Triangle[] {
  if (sites.length < 3) {
    return [];
  }

  const frame = frameOf(sites);
  const normalise = (site: Point): Point => ({
    x: (site.x - frame.centreX) / frame.extent,
    y: (site.y - frame.centreY) / frame.extent,
  });

  const points: Point[] = [
    ...sites.map(normalise),
    { x: -SUPER_SPREAD, y: -SUPER_SPREAD },
    { x: SUPER_SPREAD, y: -SUPER_SPREAD },
    { x: 0, y: SUPER_SPREAD },
  ];
  const outer = sites.length;
  let mesh = [makeCandidate(points, outer, outer + 1, outer + 2)];

  for (let index = 0; index < sites.length; index += 1) {
    const point = points[index] as Point;
    const kept: Candidate[] = [];
    const stale: Candidate[] = [];

    for (const triangle of mesh) {
      if (distanceSquared(triangle.centre, point) < triangle.radiusSquared) {
        stale.push(triangle);
      } else {
        kept.push(triangle);
      }
    }

    // Hrana, která se mezi zrušenými trojúhelníky objeví jen jednou, leží na
    // obvodu díry. Ta, která je tam dvakrát, vedla mezi nimi a zaniká.
    const boundary = new Map<string, readonly [number, number]>();
    for (const triangle of stale) {
      for (const [from, to] of [
        [triangle.a, triangle.b],
        [triangle.b, triangle.c],
        [triangle.a, triangle.c],
      ] as const) {
        const key = edgeKey(from, to);
        if (boundary.has(key)) {
          boundary.delete(key);
        } else {
          boundary.set(key, [from, to]);
        }
      }
    }

    mesh = kept;
    for (const [from, to] of boundary.values()) {
      mesh.push(makeCandidate(points, index, from, to));
    }
  }

  return mesh
    .filter((triangle) => triangle.c < outer)
    .map(({ a, b, c, centre }): Triangle => ({
      a,
      b,
      c,
      centre: {
        x: centre.x * frame.extent + frame.centreX,
        y: centre.y * frame.extent + frame.centreY,
      },
    }))
    .sort((left, right) => left.a - right.a || left.b - right.b || left.c - right.c);
}
