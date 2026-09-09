import { describe, expect, it } from 'vitest';
import { DEFAULT_NAME_TABLES, makeNamePool, nameCapacity, type NameTables } from '../src/map/names';
import { createRandom } from '../src/map/random';

const TINY: NameTables = {
  roots: ['Ash', 'Thorn'],
  suffixes: ['ford', 'moor'],
  qualifiers: ['Upper', 'Lower'],
};

describe('makeNamePool', () => {
  it('ze stejného semínka dá stejná jména', () => {
    expect(makeNamePool(50, createRandom(9))).toEqual(makeNamePool(50, createRandom(9)));
  });

  it('z jiného semínka dá jiná jména', () => {
    expect(makeNamePool(50, createRandom(9))).not.toEqual(makeNamePool(50, createRandom(10)));
  });

  it('vrátí přesně tolik jmen, kolik se chce', () => {
    expect(makeNamePool(0, createRandom(1))).toEqual([]);
    expect(makeNamePool(1, createRandom(1))).toHaveLength(1);
    expect(makeNamePool(900, createRandom(1))).toHaveLength(900);
  });

  it('žádné jméno se neopakuje ani na velké mapě', () => {
    const pool = makeNamePool(1200, createRandom(3));

    expect(new Set(pool).size).toBe(pool.length);
  });

  it('dokud kombinace stačí, jsou jména jednoslovná a anglická', () => {
    for (const name of makeNamePool(600, createRandom(4))) {
      expect(name).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  it('kapacita odpovídá kořenům krát příponám krát kolům', () => {
    expect(nameCapacity(TINY)).toBe(2 * 2 * 3);
    expect(nameCapacity()).toBe(
      DEFAULT_NAME_TABLES.roots.length *
        DEFAULT_NAME_TABLES.suffixes.length *
        (DEFAULT_NAME_TABLES.qualifiers.length + 1),
    );
  });

  it('kořeny a přípony se nepřekrývají, aby nevzniklo Woodwood', () => {
    const roots = new Set(DEFAULT_NAME_TABLES.roots.map((root) => root.toLowerCase()));

    expect(DEFAULT_NAME_TABLES.suffixes.filter((suffix) => roots.has(suffix))).toEqual([]);
  });

  it('když kombinace dojdou, nastoupí přívlastek', () => {
    const pool = makeNamePool(6, createRandom(5), TINY);

    expect(new Set(pool).size).toBe(6);
    expect(pool.slice(0, 4).every((name) => !name.includes(' '))).toBe(true);
    expect(pool.slice(4).every((name) => /^(Upper|Lower) /.test(name))).toBe(true);
  });

  it('víc jmen, než tabulky unesou, nevymyslí', () => {
    expect(makeNamePool(99, createRandom(6), TINY)).toHaveLength(nameCapacity(TINY));
  });
});
