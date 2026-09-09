import { generateWorld, type WorldOptions } from './generateWorld';
import type { World } from '../types';

export const STARTER_PLAYER_ID = 'p1';

/** Semínko výchozí mapy. Změna čísla = jiná mapa. */
export const STARTER_SEED = 20260909;

export const STARTER_OPTIONS: WorldOptions = {
  seed: STARTER_SEED,
  columns: 11,
  rows: 9,
  spacing: 130,
  jitter: 0.3,
  dropChance: 0.18,
  mergeChance: 0.45,
  coastErosion: 0.2,
  minRegions: 12,
  attempts: 64,
  playerId: STARTER_PLAYER_ID,
  playerName: 'Hráč',
  startingProduction: 20,
};

/** Vytvoří výchozí stav světa. Deterministické — stejné semínko, stejná mapa. */
export function createStarterWorld(): World {
  return generateWorld(STARTER_OPTIONS);
}

/** Nová mapa z vlastního semínka, jinak se stejným nastavením. */
export function createWorldFromSeed(seed: number): World {
  return generateWorld({ ...STARTER_OPTIONS, seed });
}
