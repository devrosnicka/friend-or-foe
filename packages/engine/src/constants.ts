import type { BuildingType } from './types';

/** Cena za zabrání sousedního neutrálního regionu. */
export const CLAIM_COST = 10;

export const BUILDING_COST: Readonly<Record<BuildingType, number>> = {
  farm: 5,
  mine: 8,
  barracks: 12,
};

/** Produkce, kterou region vynese i bez budov. */
export const BASE_REGION_PRODUCTION = 1;

/** Kasárna zatím nic nevynášejí — vojenská síla není ve scope prototypu. */
export const BUILDING_PRODUCTION: Readonly<Record<BuildingType, number>> = {
  farm: 2,
  mine: 3,
  barracks: 0,
};
