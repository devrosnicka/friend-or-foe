/**
 * Deterministický generátor pseudonáhodných čísel (mulberry32).
 *
 * Engine nesmí sáhnout na `Math.random()`, generování mapy ale náhodu
 * potřebuje. Řešením je PRNG se semínkem: stejné semínko = stejná mapa,
 * takže engine zůstává čistou funkcí a testy jsou opakovatelné.
 */
export interface Random {
  /** Číslo z intervalu <0, 1). */
  readonly next: () => number;
  /** Celé číslo z intervalu <0, bound). */
  readonly int: (bound: number) => number;
  /** Kopie pole v náhodném pořadí (Fisher–Yates). */
  readonly shuffle: <T>(items: readonly T[]) => T[];
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (bound: number): number => Math.floor(next() * bound);

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  };

  return { next, int, shuffle };
}
