import { RESOURCE_IMPROVEMENT } from '../constants';
import type { PlayerId, StrategicResource, World } from '../types';

/**
 * Suroviny, které hráč skutečně těží.
 *
 * Nestačí region se surovinou vlastnit — na jejím vyhrazeném místě musí stát
 * stavba, která ji zpřístupní. Odvozuje se to ze stavu světa, takže není co
 * držet ve stavu a nemůže se to rozejít se skutečností.
 */
export function availableResources(world: World, playerId: PlayerId): StrategicResource[] {
  const mined = new Set<StrategicResource>();

  for (const region of Object.values(world.regions)) {
    if (region.owner !== playerId) {
      continue;
    }
    for (const slot of region.slots) {
      if (slot.requires !== null && slot.building === RESOURCE_IMPROVEMENT[slot.requires]) {
        mined.add(slot.requires);
      }
    }
  }

  return [...mined].sort();
}
