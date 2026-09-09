import type { ApplyResult, RuleViolationCode, World } from '../types';

export function ok(world: World): ApplyResult {
  return { ok: true, world };
}

export function fail(code: RuleViolationCode, message: string): ApplyResult {
  return { ok: false, error: { code, message } };
}
