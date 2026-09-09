import { BASE_REGION_PRODUCTION, BUILDING_PRODUCTION } from '../constants';
import type { PlayerId, Region, World } from '../types';

/** Kolik produkce region vynese za jeden tah. */
export function regionProduction(region: Region): number {
  return region.buildings.reduce(
    (sum, building) => sum + BUILDING_PRODUCTION[building],
    BASE_REGION_PRODUCTION,
  );
}

/** Celkový příjem hráče za tah ze všech jeho regionů. */
export function playerIncome(world: World, playerId: PlayerId): number {
  return Object.values(world.regions)
    .filter((region) => region.owner === playerId)
    .reduce((sum, region) => sum + regionProduction(region), 0);
}
