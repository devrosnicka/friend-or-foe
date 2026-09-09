import { distanceSquared, polygonArea, polygonCentroid } from './geometry';
import { unionRings } from './rings';
import type { Random } from './random';
import type { VoronoiCell, VoronoiDiagram } from './voronoi';
import type { Point } from '../types';

/** Největší region vznikne slitím tolika Voronoi buněk. */
const MAX_GROUP_CELLS = 3;
/** Podíl slitých regionů, které dostanou třetí buňku místo druhé. */
const TRIPLE_SHARE = 0.35;

/** Kolikrát víc váží soused sražený pod minimum než soused sražený na minimum. */
const STARVED_PENALTY = 6;

export interface LayoutOptions {
  /** Kolik sousedů smí mít region. Mimo tento rozsah se rozvržení zahodí. */
  readonly minNeighbours: number;
  readonly maxNeighbours: number;
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

/**
 * Region během skládání mapy. Na rozdíl od výsledku se ještě mění: může
 * pohltit souseda nebo sám zmizet pod vodou.
 */
interface Territory {
  cells: number[];
  ring: number[];
  /** Jen žijící sousedé; zaplavený region se ze seznamů rovnou vyškrtne. */
  readonly neighbours: Set<number>;
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
): { cells: number[]; ring: number[] }[] {
  const free = new Set(playable);
  const groups: { cells: number[]; ring: number[] }[] = [];

  for (const start of random.shuffle(playable)) {
    if (!free.has(start)) {
      continue;
    }

    const group = { cells: [start], ring: [...(diagram.cells[start] as VoronoiCell).ring] };
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

/** Ze skupin buněk udělá regiony a propojí je podle sousedností buněk. */
function toTerritories(
  diagram: VoronoiDiagram,
  groups: readonly { cells: number[]; ring: number[] }[],
): Territory[] {
  const owner = new Map<number, number>();
  groups.forEach((group, index) => {
    for (const cell of group.cells) {
      owner.set(cell, index);
    }
  });

  return groups.map((group, index) => {
    const neighbours = new Set<number>();
    for (const cell of group.cells) {
      for (const other of (diagram.cells[cell] as VoronoiCell).neighbours) {
        const otherGroup = owner.get(other);
        if (otherGroup !== undefined && otherGroup !== index) {
          neighbours.add(otherGroup);
        }
      }
    }
    return { cells: [...group.cells], ring: [...group.ring], neighbours };
  });
}

function isConnected(territories: readonly Territory[], alive: ReadonlySet<number>): boolean {
  const [first] = alive;
  if (first === undefined) {
    return false;
  }

  const seen = new Set([first]);
  const queue = [first];
  while (queue.length > 0) {
    for (const neighbour of (territories[queue.pop() as number] as Territory).neighbours) {
      if (!seen.has(neighbour)) {
        seen.add(neighbour);
        queue.push(neighbour);
      }
    }
  }

  return seen.size === alive.size;
}

/** Zaplaví region mořem. Vrátí false, když by tím mapa spadla na ostrovy. */
function drown(territories: readonly Territory[], alive: Set<number>, victim: number): boolean {
  const lost = territories[victim] as Territory;
  for (const neighbour of lost.neighbours) {
    (territories[neighbour] as Territory).neighbours.delete(victim);
  }
  alive.delete(victim);

  if (isConnected(territories, alive)) {
    return true;
  }

  alive.add(victim);
  for (const neighbour of lost.neighbours) {
    (territories[neighbour] as Territory).neighbours.add(victim);
  }
  return false;
}

/**
 * Nechá `host` pohltit souseda `guest`. Vrátí false, když by z těch dvou
 * nevznikl jeden prostý obrys — třeba když by spolu uzavřely region uvnitř.
 */
function absorb(territories: readonly Territory[], alive: Set<number>, host: number, guest: number): boolean {
  const keeper = territories[host] as Territory;
  const eaten = territories[guest] as Territory;

  const merged = unionRings([keeper.ring, eaten.ring]);
  if (merged === null) {
    return false;
  }

  keeper.cells = [...keeper.cells, ...eaten.cells];
  keeper.ring = merged;

  for (const neighbour of eaten.neighbours) {
    const other = territories[neighbour] as Territory;
    other.neighbours.delete(guest);
    if (neighbour !== host) {
      other.neighbours.add(host);
      keeper.neighbours.add(neighbour);
    }
  }
  keeper.neighbours.delete(guest);
  alive.delete(guest);
  return true;
}

/**
 * Doladí mapu, dokud nemá každý region sousedů v požadovaném rozsahu.
 *
 * Voronoi mozaika má ve vnitrozemí zhruba šest sousedů na buňku, takže na
 * obě hranice je potřeba jiný nástroj:
 *
 * - **Moc sousedů** — jeden ze sousedů se zaplaví mořem. Odtud zátoky a jezera.
 * - **Málo sousedů** — region pohltí souseda a tím si jich přibere. Bez toho
 *   by regiony u pobřeží, které mají tři sousedy z podstaty, musely mizet,
 *   a jejich zmizením by se pobřežím stalo vnitrozemí za nimi. Kaskáda by
 *   ukusovala dovnitř, dokud by z mapy nezbylo nic.
 *
 * Obě operace ubírají jeden region, takže smyčka vždycky skončí.
 */
function repair(
  diagram: VoronoiDiagram,
  territories: readonly Territory[],
  options: LayoutOptions,
  random: Random,
): Set<number> | null {
  const alive = new Set(territories.map((_, index) => index));
  const degree = (group: number): number => (territories[group] as Territory).neighbours.size;
  const living = (group: number): number[] => [...(territories[group] as Territory).neighbours];

  /** Kolik sousedů by po zásahu spadlo pod minimum. */
  const damage = (dropping: readonly number[]): number =>
    dropping.reduce((total, neighbour) => {
      const after = degree(neighbour) - 1;
      return (
        total +
        (after < options.minNeighbours ? STARVED_PENALTY : 0) +
        (after === options.minNeighbours ? 1 : 0)
      );
    }, 0);

  const areaOf = (group: number): number =>
    polygonArea(
      (territories[group] as Territory).ring.map((vertex) => diagram.vertices[vertex] as Point),
    );

  /**
   * Osamělý region si přibere souseda; když to nejde, zmizí pod vodou.
   *
   * Z použitelných sousedů se bere ten **nejmenší**, který zároveň zvedne
   * počet sousedů na požadované minimum. Bez toho se pohlcování nabaluje:
   * region po sloučení bývá pořád osamělý, pohltí dalšího, a protože se na
   * velikost nikde nekoukalo, jeden region snadno spolykal pětinu pevniny.
   */
  const grow = (group: number): boolean => {
    const mine = new Set(living(group));
    // Vzestupně podle indexu: řazení níž je stabilní, takže tenhle pořádek
    // rozhoduje o shodách a mapa vyjde z téhož semínka pokaždé stejně.
    const scored = [...mine]
      .sort((left, right) => left - right)
      .map((candidate) => {
        const union = new Set([...mine, ...living(candidate)]);
        union.delete(group);
        union.delete(candidate);
        const shared = living(candidate).filter((neighbour) => mine.has(neighbour));
        return {
          candidate,
          fits: union.size <= options.maxNeighbours ? 0 : 1,
          damage: damage(shared),
          settles: union.size >= options.minNeighbours ? 0 : 1,
          area: areaOf(candidate),
        };
      })
      .sort(
        (left, right) =>
          left.fits - right.fits ||
          left.damage - right.damage ||
          left.settles - right.settles ||
          left.area - right.area,
      );

    return (
      scored.some((option) => absorb(territories, alive, group, option.candidate)) ||
      drown(territories, alive, group)
    );
  };

  /** Přelidněnému regionu se ubere soused. */
  const thin = (crowded: readonly number[]): boolean => {
    const crowdedSet = new Set(crowded);
    const victims = [...new Set(crowded.flatMap(living))].sort(
      (left, right) =>
        damage(living(left)) - damage(living(right)) ||
        living(right).filter((n) => crowdedSet.has(n)).length -
          living(left).filter((n) => crowdedSet.has(n)).length ||
        degree(left) - degree(right) ||
        left - right,
    );

    return victims.some((victim) => drown(territories, alive, victim));
  };

  for (;;) {
    const lonely = [...alive]
      .filter((group) => degree(group) < options.minNeighbours)
      .sort((left, right) => degree(left) - degree(right) || left - right);
    const crowded = [...alive].filter((group) => degree(group) > options.maxNeighbours);

    if (lonely.length === 0 && crowded.length === 0) {
      break;
    }
    if (!(lonely.length > 0 ? grow(lonely[0] as number) : thin(crowded))) {
      return null;
    }
    if (alive.size < options.minRegions) {
      return null;
    }
  }

  // Pobřeží se okusuje až nakonec — je to kosmetika a nesmí rozbít rozsah.
  const shore = coastal(diagram, territories, alive);
  for (const group of random.shuffle([...alive])) {
    const safe =
      shore[group] === true &&
      random.next() < options.coastErosion &&
      alive.size - 1 >= options.minRegions &&
      living(group).every((neighbour) => degree(neighbour) - 1 >= options.minNeighbours);
    if (safe) {
      drown(territories, alive, group);
    }
  }

  return alive;
}

/** Region leží u vody, když některá jeho buňka sousedí s mořem nebo s okrajem. */
function coastal(
  diagram: VoronoiDiagram,
  territories: readonly Territory[],
  alive: ReadonlySet<number>,
): boolean[] {
  const owner = new Map<number, number>();
  for (const group of alive) {
    for (const cell of (territories[group] as Territory).cells) {
      owner.set(cell, group);
    }
  }

  return territories.map((territory) =>
    territory.cells.some((cell) =>
      (diagram.cells[cell] as VoronoiCell).neighbours.some((other) => !owner.has(other)),
    ),
  );
}

/**
 * Popisný bod regionu. Těžiště plochy může u konkávního tvaru vypadnout ven,
 * proto se vrací nejbližší Voronoi bod — ten leží uvnitř vždy.
 */
function labelPoint(diagram: VoronoiDiagram, cells: readonly number[], outline: readonly Point[]): Point {
  const centroid = polygonCentroid(outline);
  let best = (diagram.cells[cells[0] as number] as VoronoiCell).site;
  for (const cell of cells) {
    const site = (diagram.cells[cell] as VoronoiCell).site;
    if (distanceSquared(site, centroid) < distanceSquared(best, centroid)) {
      best = site;
    }
  }
  return best;
}

/**
 * Poskládá z Voronoi diagramu rozvržení mapy: nepravidelně velké regiony,
 * každý s počtem sousedů v požadovaném rozsahu.
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
  const territories = toTerritories(
    diagram,
    growGroups(diagram, playable, options.mergeChance, random),
  );

  const alive = repair(diagram, territories, options, random);
  if (alive === null) {
    return null;
  }

  const shore = coastal(diagram, territories, alive);
  const kept = [...alive].sort((left, right) => {
    const a = polygonCentroid((territories[left] as Territory).ring.map((v) => diagram.vertices[v] as Point));
    const b = polygonCentroid((territories[right] as Territory).ring.map((v) => diagram.vertices[v] as Point));
    return a.y - b.y || a.x - b.x;
  });
  const positionOf = new Map(kept.map((group, index) => [group, index]));

  return kept.map((group): RegionLayout => {
    const territory = territories[group] as Territory;
    const outline = territory.ring.map((vertex) => diagram.vertices[vertex] as Point);
    return {
      outline,
      centre: labelPoint(diagram, territory.cells, outline),
      area: polygonArea(outline),
      neighbours: [...territory.neighbours]
        .sort((a, b) => a - b)
        .map((neighbour) => positionOf.get(neighbour) as number),
      coastal: shore[group] as boolean,
    };
  });
}
