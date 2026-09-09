import { generateWorld, type WorldOptions } from './generateWorld';
import type { World } from '../types';

export const STARTER_PLAYER_ID = 'p1';

/** Semínko výchozí mapy. Změna čísla = jiná mapa. */
export const STARTER_SEED = 20260909;

/**
 * Mřížka určuje velikost světa; 44×40 vychází na zhruba 660 regionů. Poměr
 * stran je libovolný — na výsledek má vliv jen počet bodů, protože mapa se
 * stejně prohlíží výřezem.
 *
 * Strop 7 sousedů drží podíl vody kolem 23 %: zátoky a jezera zůstanou jako
 * přirozené hranice, ale pevnina se nerozpadne na souostroví, jak se to dělo
 * při stropu 5.
 */
export const STARTER_OPTIONS: WorldOptions = {
  seed: STARTER_SEED,
  columns: 44,
  rows: 40,
  spacing: 130,
  jitter: 0.3,
  dropChance: 0.18,
  minNeighbours: 3,
  maxNeighbours: 7,
  mergeChance: 0.45,
  coastErosion: 0.2,
  minRegions: 400,
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
