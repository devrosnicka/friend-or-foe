import { expect } from 'vitest';
import type { ApplyResult, RuleViolationCode, World } from '../../src/types';

/** Vytáhne nový svět z úspěšného výsledku, jinak test shodí. */
export function expectOk(result: ApplyResult): World {
  if (!result.ok) {
    expect.unreachable(`Očekáván úspěch, přišlo porušení pravidla ${result.error.code}`);
  }
  return result.world;
}

/** Ověří, že výsledek je porušení očekávaného pravidla. */
export function expectViolation(result: ApplyResult, code: RuleViolationCode): void {
  if (result.ok) {
    expect.unreachable(`Očekáváno porušení pravidla ${code}, akce ale prošla`);
  }
  expect(result.error.code).toBe(code);
  expect(result.error.message).not.toBe('');
}
