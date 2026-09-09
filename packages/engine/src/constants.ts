import type { BuildingType, StrategicResource, Terrain } from './types';

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

/**
 * Kterou stavbou se surovina zpřístupní. Důl jde postavit i na obecné místo,
 * ale těžit se surovina začne, teprve když na jejím vyhrazeném místě stojí
 * tahle stavba. Koně potřebují pastvinu, ne šachtu — proto farma.
 */
export const RESOURCE_IMPROVEMENT: Readonly<Record<StrategicResource, BuildingType>> = {
  iron: 'mine',
  coal: 'mine',
  gold: 'mine',
  oil: 'mine',
  horses: 'farm',
};

/** Meze počtu obecných stavebních míst v regionu. */
export const MIN_GENERAL_SLOTS = 1;
export const MAX_GENERAL_SLOTS = 6;

/** Kolik obecných míst terén přidá nebo ubere oproti velikosti regionu. */
export const TERRAIN_SLOTS: Readonly<Record<Terrain, number>> = {
  plains: 1,
  forest: 0,
  coast: 0,
  hills: -1,
  mountains: -1,
};

/** Kolik míst dostane region o průměrné ploše, než se započítá terén. */
export const SLOTS_AT_MEDIAN_AREA = 3;
