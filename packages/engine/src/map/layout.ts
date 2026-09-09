import { distanceSquared, polygonArea, polygonCentroid } from './geometry';
import { unionRings } from './rings';
import type { Random } from './random';
import type { VoronoiCell, VoronoiDiagram } from './voronoi';
import type { Point } from '../types';

/** Kolik sousedů smí mít region. Mimo tento rozsah se rozvržení zahodí. */
export const MIN_NEIGHBOURS = 3;
export const MAX_NEIGHBOURS = 5;

/** Největší region vznikne slitím tolika Voronoi buněk. */
const MAX_GROUP_CELLS = 3;
/** Kolikrát víc váží soused sražený pod minimum než soused sražený na minimum. */
const STARVED_PENALTY = 6;

/** Podíl slitých regionů, které dostanou třetí buňku místo druhé. */
const TRIPLE_SHARE = 0.35;

export interface LayoutOptions {
  /** Pravděpodobnost, že se buňka slije se sousedem do většího regionu. */
  readonly mergeChance: number;
  /** Pravděpodobnost, že se pobřežní region promění v moře. Tvaruje pobřeží. */
  readonly coastErosion: number;
  /** Nejmenší přijatelný počet regionů. */
  readonly minRegions: number;
}

export interface RegionLayout {
  readonly outline: readonly Point[];
  readonly centre: Point;
  readonly area: number;
  /** Indexy do pole rozvržení. */
  readonly neighbours: readonly number[];
  /** Region sousedí s mořem nebo s okrajem mapy. */
  readonly coastal: boolean;
}

interface Group {
  readonly cells: number[];
  readonly ring: number[];
}

/**
 * Slije buňky do skupin, z nichž se stanou regiony. Skupina přibírá jen
 * dosud volné sousedy, takže regiony vyjdou nepravidelně velké.
 */
function growGroups(
  diagram: VoronoiDiagram,
  playable: readonly number[],
  mergeChance: number,
  random: Random,
): Group[] {
  const free = new Set(playable);
  const groups: Group[] = [];

  for (const start of random.shuffle(playable)) {
    if (!free.has(start)) {
      continue;
    }

    const group: Group = { cells: [start], ring: [...(diagram.cells[start] as VoronoiCell).ring] };
    groups.push(group);
    free.delete(start);

    const target =
      random.next() < mergeChance ? (random.next() < TRIPLE_SHARE ? MAX_GROUP_CELLS : 2) : 1;

    while (group.cells.length < target) {
      const [candidate] = random.shuffle(
        [
          ...new Set(
            group.cells.flatMap((cell) =>
              (diagram.cells[cell] as VoronoiCell).neighbours.filter((id) => free.has(id)),
            ),
          ),
        ].sort((a, b) => a - b),
      );

      if (candidate === undefined) {
        break;
      }

      // Sousední buňka sdílí se skupinou celou hranu, takže jejich sjednocení
      // je vždycky jeden prostý obrys — u nejvýš tří buněk nemá kde vzniknout
      // ani díra, ani dotyk v jediném bodě.
      const merged = unionRings([
        group.ring,
        (diagram.cells[candidate] as VoronoiCell).ring,
      ]) as number[];

      group.cells.push(candidate);
      group.ring.splice(0, group.ring.length, ...merged);
      free.delete(candidate);
    }
  }

  return groups;
}

/** Sousednosti mezi skupinami odvozené ze sousedností buněk. */
function groupAdjacency(diagram: VoronoiDiagram, groups: readonly Group[]): number[][] {
  const groupOfCell = new Map<number, number>();
  groups.forEach((group, index) => {
    for (const cell of group.cells) {
      groupOfCell.set(cell, index);
    }
  });

  return groups.map((group, index) => {
    const neighbours = new Set<number>();
    for (const cell of group.cells) {
      for (const other of (diagram.cells[cell] as VoronoiCell).neighbours) {
        const otherGroup = groupOfCell.get(other);
        if (otherGroup !== undefined && otherGroup !== index) {
          neighbours.add(otherGroup);
        }
      }
    }
    return [...neighbours].sort((a, b) => a - b);
  });
}

function isConnected(alive: ReadonlySet<number>, adjacency: readonly number[][]): boolean {
  const [first] = alive;
  if (first === undefined) {
    return false;
  }

  const seen = new Set([first]);
  const queue = [first];
  while (queue.length > 0) {
    for (const neighbour of adjacency[queue.pop() as number] as number[]) {
      if (alive.has(neighbour) && !seen.has(neighbour)) {
        seen.add(neighbour);
        queue.push(neighbour);
      }
    }
  }

  return seen.size === alive.size;
}

/**
 * Zaplaví část skupin mořem, dokud nemá každý zbylý region 3 až 5 sousedů.
 *
 * Voronoi mozaika má ve vnitrozemí zhruba šest sousedů na buňku, takže horní
 * hranici jde udržet jedině tím, že se mezi regiony objeví voda. Odebírá se
 * vždy jeden region: buď takový, který sám do rozsahu nespadá, nebo soused
 * přelidněného. Z několika možností vyhrává ta, která uleví nejvíc
 * přelidněným regionům a nejméně jich přitom srazí pod minimum.
 */
function carveSea(
  adjacency: readonly number[][],
  coastal: readonly boolean[],
  options: LayoutOptions,
  random: Random,
): Set<number> | null {
  const alive = new Set(adjacency.map((_, index) => index));
  const livingNeighbours = (group: number): number[] =>
    (adjacency[group] as number[]).filter((neighbour) => alive.has(neighbour));
  const degree = (group: number): number => livingNeighbours(group).length;

  const remove = (victim: number): boolean => {
    alive.delete(victim);
    if (isConnected(alive, adjacency)) {
      return true;
    }
    alive.add(victim);
    return false;
  };

  for (;;) {
    const crowded = [...alive].filter((group) => degree(group) > MAX_NEIGHBOURS);
    const lonely = [...alive].filter((group) => degree(group) < MIN_NEIGHBOURS);
    if (crowded.length === 0 && lonely.length === 0) {
      break;
    }

    // Region pod minimem musí pryč tak jako tak, takže má přednost.
    const candidates =
      lonely.length > 0
        ? lonely
        : [...new Set(crowded.flatMap((group) => livingNeighbours(group)))];

    const crowdedSet = new Set(crowded);
    const relief = (victim: number): number =>
      (adjacency[victim] as number[]).filter((neighbour) => crowdedSet.has(neighbour)).length;
    // Soused sražený pod minimum je chyba, soused sražený přesně na minimum
    // jen ochuzuje mapu — proto se počítá jako menší škoda.
    const damage = (victim: number): number =>
      livingNeighbours(victim).reduce((total, neighbour) => {
        const after = degree(neighbour) - 1;
        return total + (after < MIN_NEIGHBOURS ? STARVED_PENALTY : 0) + (after === MIN_NEIGHBOURS ? 1 : 0);
      }, 0);

    const ordered = [...candidates].sort(
      (left, right) =>
        damage(left) - damage(right) ||
        relief(right) - relief(left) ||
        degree(left) - degree(right) ||
        left - right,
    );

    if (!ordered.some((victim) => remove(victim))) {
      return null;
    }
    if (alive.size < options.minRegions) {
      return null;
    }
  }

  // Pobřeží se okusuje až nakonec — je to kosmetika a nesmí rozbít rozsah.
  for (const group of random.shuffle([...alive])) {
    const safe =
      coastal[group] === true &&
      random.next() < options.coastErosion &&
      alive.size - 1 >= options.minRegions &&
      livingNeighbours(group).every((neighbour) => degree(neighbour) - 1 >= MIN_NEIGHBOURS);
    if (safe) {
      remove(group);
    }
  }

  return alive;
}

/** Region leží u vody, když některá jeho buňka sousedí s mořem nebo s okrajem. */
function coastalGroups(
  diagram: VoronoiDiagram,
  groups: readonly Group[],
  alive: ReadonlySet<number>,
): boolean[] {
  const groupOfCell = new Map<number, number>();
  groups.forEach((group, index) => {
    for (const cell of group.cells) {
      groupOfCell.set(cell, index);
    }
  });

  return groups.map((group) =>
    group.cells.some((cell) =>
      (diagram.cells[cell] as VoronoiCell).neighbours.some((other) => {
        const otherGroup = groupOfCell.get(other);
        return otherGroup === undefined || !alive.has(otherGroup);
      }),
    ),
  );
}

/**
 * Popisný bod regionu. Těžiště plochy může u konkávního tvaru vypadnout ven,
 * proto se vrací nejbližší Voronoi bod — ten leží uvnitř vždy.
 */
function labelPoint(diagram: VoronoiDiagram, group: Group, outline: readonly Point[]): Point {
  const centroid = polygonCentroid(outline);
  let best = (diagram.cells[group.cells[0] as number] as VoronoiCell).site;
  for (const cell of group.cells) {
    const site = (diagram.cells[cell] as VoronoiCell).site;
    if (distanceSquared(site, centroid) < distanceSquared(best, centroid)) {
      best = site;
    }
  }
  return best;
}

/**
 * Poskládá z Voronoi diagramu rozvržení mapy: nepravidelně velké regiony,
 * každý se třemi až pěti sousedy.
 *
 * `interior` jsou body, které smějí být pevninou. Zbytek diagramu je jen rám:
 * jeho buňky bývají neomezené nebo se táhnou daleko za mapu, takže se
 * nevykreslují — jen zaručují, že vnitřní buňky mají poctivý tvar.
 *
 * Vrací `null`, když se z tohoto rozsypání bodů mapa poskládat nepovedla;
 * volající to zkusí znovu s dalším semínkem.
 */
export function buildLayout(
  diagram: VoronoiDiagram,
  interior: readonly number[],
  options: LayoutOptions,
  random: Random,
): RegionLayout[] | null {
  const playable = interior.filter((index) => diagram.cells[index] !== null);
  const groups = growGroups(diagram, playable, options.mergeChance, random);
  const adjacency = groupAdjacency(diagram, groups);
  const everyoneAlive = new Set(groups.map((_, index) => index));

  const alive = carveSea(adjacency, coastalGroups(diagram, groups, everyoneAlive), options, random);
  if (alive === null) {
    return null;
  }

  const coastal = coastalGroups(diagram, groups, alive);
  const kept = [...alive].sort((left, right) => {
    const a = polygonCentroid((groups[left] as Group).ring.map((v) => diagram.vertices[v] as Point));
    const b = polygonCentroid(
      (groups[right] as Group).ring.map((v) => diagram.vertices[v] as Point),
    );
    return a.y - b.y || a.x - b.x;
  });
  const positionOf = new Map(kept.map((group, index) => [group, index]));

  return kept.map((group): RegionLayout => {
    const source = groups[group] as Group;
    const outline = source.ring.map((vertex) => diagram.vertices[vertex] as Point);
    return {
      outline,
      centre: labelPoint(diagram, source, outline),
      area: polygonArea(outline),
      neighbours: (adjacency[group] as number[])
        .filter((neighbour) => alive.has(neighbour))
        .map((neighbour) => positionOf.get(neighbour) as number),
      coastal: coastal[group] as boolean,
    };
  });
}
