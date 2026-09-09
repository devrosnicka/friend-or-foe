/**
 * Zmrazí objekt do hloubky. Testy tím vynucují čistotu enginu: jakýkoli pokus
 * o mutaci vstupního světa skončí v ESM (strict mode) výjimkou.
 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}
