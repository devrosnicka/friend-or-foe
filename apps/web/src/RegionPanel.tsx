import {
  BUILDING_COST,
  CLAIM_COST,
  regionProduction,
  type BuildingType,
  type PlayerId,
  type Region,
  type World,
} from '@fof/engine';
import { TERRAIN_LABEL } from './RegionMap';

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

interface RegionPanelProps {
  readonly world: World;
  readonly region: Region | null;
  readonly currentPlayerId: PlayerId;
  readonly busy: boolean;
  readonly onClaim: (regionId: string) => void;
  readonly onBuild: (regionId: string, building: BuildingType) => void;
}

export function RegionPanel({
  world,
  region,
  currentPlayerId,
  busy,
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
  const adjacent = region.neighbours.some(
    (id) => world.regions[id]?.owner === currentPlayerId,
  );

  return (
    <aside className="panel">
      <h2>{region.name}</h2>
      <dl>
        <dt>Terén</dt>
        <dd>{TERRAIN_LABEL[region.terrain]}</dd>
        <dt>Vlastník</dt>
        <dd>{region.owner === null ? 'neutrální' : (world.players[region.owner]?.name ?? region.owner)}</dd>
        <dt>Suroviny</dt>
        <dd>{region.resources.length > 0 ? region.resources.join(', ') : '—'}</dd>
        <dt>Budovy</dt>
        <dd>
          {region.buildings.length > 0
            ? region.buildings.map((building) => BUILDING_LABEL[building]).join(', ')
            : '—'}
        </dd>
        <dt>Produkce za tah</dt>
        <dd>{regionProduction(region)}</dd>
        <dt>Sousedé</dt>
        <dd>
          {region.neighbours
            .map((id) => world.regions[id]?.name ?? id)
            .join(', ')}
        </dd>
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

      {mine && (
        <div className="build-actions">
          {BUILDINGS.map((building) => (
            <button
              key={building}
              type="button"
              disabled={busy || production < BUILDING_COST[building]}
              onClick={() => onBuild(region.id, building)}
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
