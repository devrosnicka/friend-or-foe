/**
 * Sjednocení obrysů sousedních buněk. Obrysy jsou posloupnosti indexů
 * vrcholů se shodným směrem obchůzky, takže společná hrana se v jedné
 * buňce objeví jako (a → b) a v druhé jako (b → a). Takové dvojice se
 * vyruší a zbytek se zřetězí do jednoho obrysu.
 *
 * Vrací `null`, kdykoli výsledek není jeden prostý obrys — tedy když by
 * sloučení vzniklo s dírou uvnitř nebo se dotýkalo samo sebe v bodě.
 * Volající takové sloučení zahodí.
 */
export function unionRings(rings: readonly (readonly number[])[]): number[] | null {
  const directed = new Map<string, readonly [number, number]>();

  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 1) {
      const from = ring[i] as number;
      const to = ring[(i + 1) % ring.length] as number;
      const reverse = `${to},${from}`;

      if (directed.has(reverse)) {
        directed.delete(reverse);
        continue;
      }
      const key = `${from},${to}`;
      if (directed.has(key)) {
        return null;
      }
      directed.set(key, [from, to]);
    }
  }

  const next = new Map<number, number>();
  for (const [from, to] of directed.values()) {
    if (next.has(from)) {
      return null;
    }
    next.set(from, to);
  }
  if (next.size === 0) {
    return null;
  }

  const start = Math.min(...next.keys());
  const outline: number[] = [];
  let current = start;
  do {
    outline.push(current);
    current = next.get(current) as number;
  } while (current !== start);

  return outline.length === next.size ? outline : null;
}
