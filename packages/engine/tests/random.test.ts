import { describe, expect, it } from 'vitest';
import { createRandom } from '../src/map/random';

describe('createRandom', () => {
  it('dává ze stejného semínka stejnou posloupnost', () => {
    const first = createRandom(42);
    const second = createRandom(42);

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });

  it('různá semínka dávají různé posloupnosti', () => {
    expect(createRandom(1).next()).not.toBe(createRandom(2).next());
  });

  it('vrací čísla z intervalu <0, 1)', () => {
    const random = createRandom(7);
    for (let i = 0; i < 500; i += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int nikdy nepřeteče zadanou mez', () => {
    const random = createRandom(9);
    for (let i = 0; i < 500; i += 1) {
      expect(random.int(5)).toBeGreaterThanOrEqual(0);
      expect(random.int(5)).toBeLessThan(5);
    }
  });

  it('shuffle zachová prvky a nemění vstup', () => {
    const random = createRandom(3);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = random.shuffle(input);

    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
  });

  it('shuffle zvládne prázdné i jednoprvkové pole', () => {
    const random = createRandom(3);

    expect(random.shuffle([])).toEqual([]);
    expect(random.shuffle(['a'])).toEqual(['a']);
  });
});
