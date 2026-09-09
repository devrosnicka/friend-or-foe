import {
  BUILDING_COST,
  CLAIM_COST,
  RESOURCE_IMPROVEMENT,
  regionProduction,
  type BuildingType,
  type BuildSlot,
  type PlayerId,
  type Region,
  type World,
} from '@fof/engine';
import { TERRAIN_LABEL } from './terrain';

const BUILDING_LABEL: Record<BuildingType, string> = {
  farm: 'farma',
  mine: 'důl',
  barracks: 'kasárna',
};

/** Tvar do věty „Postavit …". */
const BUILDING_ACCUSATIVE: Record<BuildingType, string> = {
  farm: 'farmu',
  mine: 'důl',
  barracks: 'kasárna',
};

const BUILDINGS: BuildingType[] = ['farm', 'mine', 'barracks'];

/** Co se na tohle místo smí postavit. Surovinové bere jen svou stavbu. */
function allowedOn(slot: BuildSlot): BuildingType[] {
  return slot.requires === null ? BUILDINGS : [RESOURCE_IMPROVEMENT[slot.requires]];
}

interface RegionPanelProps {
  readonly world: World;
  readonly region: Region | null;
  readonly currentPlayerId: PlayerId;
  readonly busy: boolean;
  readonly selectedSlot: number | null;
  readonly onClaim: (regionId: string) => void;
  readonly onBuild: (regionId: string, slot: number, building: BuildingType) => void;
}

export function RegionPanel({
  world,
  region,
  currentPlayerId,
  busy,
  selectedSlot,
  onClaim,
  onBuild,
}: RegionPanelProps) {
  if (!region) {
    return (
      <aside className="panel">
        <p className="hint">Vyber region na mapě.</p>
      </aside>
    );
  }

  const production = world.players[currentPlayerId]?.production ?? 0;
  const mine = region.owner === currentPlayerId;
  const neutral = region.owner === null;
  const adjacent = region.neighbours.some((id) => world.regions[id]?.owner === currentPlayerId);

  const free = region.slots.filter((slot) => slot.building === null).length;
  const slot = selectedSlot === null ? null : (region.slots[selectedSlot] ?? null);

  return (
    <aside className="panel">
      <h2>{region.name}</h2>
      <dl>
        <dt>Terén</dt>
        <dd>{TERRAIN_LABEL[region.terrain]}</dd>
        <dt>Vlastník</dt>
        <dd>
          {region.owner === null ? 'neutrální' : (world.players[region.owner]?.name ?? region.owner)}
        </dd>
        <dt>Suroviny</dt>
        <dd>{region.resources.length > 0 ? region.resources.join(', ') : '—'}</dd>
        <dt>Stavební místa</dt>
        <dd>
          {region.slots.length - free} z {region.slots.length} obsazeno
        </dd>
        <dt>Produkce za tah</dt>
        <dd>{regionProduction(region)}</dd>
        <dt>Sousedé</dt>
        <dd>{region.neighbours.map((id) => world.regions[id]?.name ?? id).join(', ')}</dd>
      </dl>

      {neutral && (
        <button
          type="button"
          disabled={busy || !adjacent || production < CLAIM_COST}
          onClick={() => onClaim(region.id)}
        >
          Zabrat ({CLAIM_COST})
        </button>
      )}

      {neutral && !adjacent && <p className="hint">Nesousedí s tvým územím.</p>}

      {mine && slot === null && (
        <p className="hint">
          Přepni mapu do pohledu <strong>Region</strong> a vyber stavební místo.
        </p>
      )}

      {mine && slot !== null && slot.building !== null && (
        <p className="hint">
          Na vybraném místě stojí {BUILDING_LABEL[slot.building]}
          {slot.requires === null ? '' : ` a těží ${slot.requires}`}.
        </p>
      )}

      {mine && slot !== null && slot.building === null && (
        <div className="build-actions">
          <p className="slot-title">
            {slot.requires === null
              ? 'Obecné místo'
              : `Místo suroviny ${slot.requires} — postavením ji začneš využívat`}
          </p>
          {allowedOn(slot).map((building) => (
            <button
              key={building}
              type="button"
              disabled={busy || production < BUILDING_COST[building]}
              onClick={() => onBuild(region.id, selectedSlot as number, building)}
            >
              Postavit {BUILDING_ACCUSATIVE[building]} ({BUILDING_COST[building]})
            </button>
          ))}
        </div>
      )}

      {!mine && !neutral && <p className="hint">Cizí území.</p>}
    </aside>
  );
}
