import type { Random } from './random';

/**
 * Jména regionů se skládají jako anglická místní jména: kořen plus přípona.
 * Ashford, Thornbury, Ravenmoor. Dvě tabulky dají tisíce jednoslovných jmen
 * bez jediné závislosti — engine žádnou runtime závislost mít nesmí.
 *
 * Kořeny a přípony se nesmějí překrývat, jinak by vznikla jména jako
 * „Woodwood"; proto v kořenech není Wood, Vale ani Ridge.
 */
const ROOTS: readonly string[] = [
  'Alder', 'Amber', 'Ash', 'Barrow', 'Beech', 'Birch', 'Black', 'Bram', 'Bray', 'Briar',
  'Bright', 'Bracken', 'Cald', 'Carn', 'Cinder', 'Clay', 'Chalk', 'Cold', 'Copper', 'Corn',
  'Crag', 'Cross', 'Dark', 'Deep', 'Dun', 'Eagle', 'East', 'Elm', 'Ember', 'Fair',
  'Fal', 'Fen', 'Fern', 'Flint', 'Fox', 'Frost', 'Glen', 'Gold', 'Grass', 'Gray',
  'Green', 'Grim', 'Hale', 'Harrow', 'Hart', 'Hawk', 'Hazel', 'Heath', 'High', 'Holly',
  'Horn', 'Iron', 'Kes', 'Kirk', 'Lang', 'Lark', 'Long', 'Marsh', 'Mel', 'Mid',
  'Mill', 'Moss', 'Nether', 'Nettle', 'North', 'Oak', 'Old', 'Otter', 'Over', 'Pen',
  'Pike', 'Quarry', 'Raven', 'Red', 'Reed', 'Rook', 'Rose', 'Rush', 'Salt', 'Sand',
  'Sea', 'Shad', 'Shale', 'Sharp', 'Shel', 'Silver', 'Slate', 'Snow', 'Sorrel', 'South',
  'Sparrow', 'Stag', 'Stan', 'Stone', 'Storm', 'Stow', 'Swan', 'Tan', 'Thorn', 'Thrush',
  'Tor', 'Wain', 'Wal', 'Water', 'West', 'Wheat', 'Whin', 'White', 'Wild', 'Willow',
  'Wind', 'Wolf', 'Wren', 'Wyke', 'Yarrow', 'Yew',
];

const SUFFIXES: readonly string[] = [
  'bourne', 'brook', 'burgh', 'bury', 'cliff', 'combe', 'croft', 'dale', 'den', 'don',
  'field', 'ford', 'gate', 'grave', 'hall', 'ham', 'haven', 'hill', 'holm', 'hurst',
  'ley', 'mere', 'moor', 'mouth', 'ness', 'port', 'ridge', 'shaw', 'stead', 'stoke',
  'thorpe', 'ton', 'vale', 'wick', 'wood', 'worth',
];

/**
 * Když dojdou kombinace, jméno dostane přívlastek — pořád to zní jako
 * skutečná mapa (Upper Ashford), jen to není jedno slovo.
 */
const QUALIFIERS: readonly string[] = [
  'Upper', 'Lower', 'East', 'West', 'North', 'South', 'Old', 'New', 'Great', 'Little',
];

export interface NameTables {
  readonly roots: readonly string[];
  readonly suffixes: readonly string[];
  readonly qualifiers: readonly string[];
}

export const DEFAULT_NAME_TABLES: NameTables = {
  roots: ROOTS,
  suffixes: SUFFIXES,
  qualifiers: QUALIFIERS,
};

/** Kolik různých jmen tabulky unesou. */
export function nameCapacity(tables: NameTables = DEFAULT_NAME_TABLES): number {
  return tables.roots.length * tables.suffixes.length * (tables.qualifiers.length + 1);
}

/**
 * Vrátí `count` navzájem různých jmen. Pořadí je dané semínkem, takže
 * stejný svět má pokaždé stejná jména.
 */
export function makeNamePool(
  count: number,
  random: Random,
  tables: NameTables = DEFAULT_NAME_TABLES,
): string[] {
  const combinations = tables.roots.length * tables.suffixes.length;

  // Nejdřív se rozdají všechna jednoslovná jména a teprve když dojdou,
  // nastoupí přívlastky. Míchá se uvnitř každého kola, ne přes všechna.
  const picks: number[] = [];
  for (let round = 0; picks.length < count && round <= tables.qualifiers.length; round += 1) {
    const offset = round * combinations;
    picks.push(...random.shuffle(Array.from({ length: combinations }, (_, i) => offset + i)));
  }

  return picks.slice(0, count).map((pick) => {
    const root = tables.roots[Math.floor((pick % combinations) / tables.suffixes.length)] as string;
    const place = `${root}${tables.suffixes[pick % tables.suffixes.length] as string}`;
    const round = Math.floor(pick / combinations);
    return round === 0 ? place : `${tables.qualifiers[round - 1] as string} ${place}`;
  });
}
