import {
  availableResources,
  playerIncome,
  STARTER_PLAYER_ID,
  type BuildingType,
  type World,
} from '@fof/engine';
import { useEffect, useState } from 'react';
import { fetchWorld, resetWorld, sendActions } from './api';
import { RegionMap } from './RegionMap';
import { RegionPanel } from './RegionPanel';

const CURRENT_PLAYER_ID = STARTER_PLAYER_ID;

export function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchWorld()
      .then((loaded) => {
        setWorld(loaded);
        // Kamera i panel startují na území hráče, ať je hned co dělat.
        const home = Object.values(loaded.regions).find(
          (region) => region.owner === CURRENT_PLAYER_ID,
        );
        setSelectedRegionId(home?.id ?? null);
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);

  async function run(task: () => Promise<World>) {
    setBusy(true);
    setError(null);
    try {
      setWorld(await task());
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!world) {
    return (
      <main className="loading">
        <p>{error ?? 'Načítám svět…'}</p>
      </main>
    );
  }

  const player = world.players[CURRENT_PLAYER_ID];
  const selectedRegion = selectedRegionId ? (world.regions[selectedRegionId] ?? null) : null;

  return (
    <main>
      <header>
        <h1>Friend or Foe</h1>
        <span>Tah {world.turn}</span>
        <span>
          Produkce <strong>{player?.production ?? 0}</strong> (+{playerIncome(world, CURRENT_PLAYER_ID)}/tah)
        </span>
        <span>
          Suroviny{' '}
          <strong>{availableResources(world, CURRENT_PLAYER_ID).join(', ') || '—'}</strong>
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => sendActions([{ type: 'endTurn', playerId: CURRENT_PLAYER_ID }]))}
        >
          Ukončit tah
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => run(resetWorld)}>
          Nová hra
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="layout">
        <RegionMap
          world={world}
          currentPlayerId={CURRENT_PLAYER_ID}
          selectedRegionId={selectedRegionId}
          onSelect={(regionId) => {
            setSelectedRegionId(regionId);
            setSelectedSlot(null);
          }}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
        <RegionPanel
          world={world}
          region={selectedRegion}
          currentPlayerId={CURRENT_PLAYER_ID}
          busy={busy}
          selectedSlot={selectedSlot}
          onClaim={(regionId) =>
            run(() =>
              sendActions([{ type: 'claimRegion', playerId: CURRENT_PLAYER_ID, regionId }]),
            )
          }
          onBuild={(regionId, slot, building: BuildingType) =>
            run(() =>
              sendActions([
                { type: 'build', playerId: CURRENT_PLAYER_ID, regionId, slot, building },
              ]),
            )
          }
        />
      </div>
    </main>
  );
}
