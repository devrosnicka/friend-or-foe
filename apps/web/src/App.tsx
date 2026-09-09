import { playerIncome, STARTER_PLAYER_ID, type BuildingType, type World } from '@fof/engine';
import { useEffect, useState } from 'react';
import { fetchWorld, resetWorld, sendActions } from './api';
import { RegionMap } from './RegionMap';
import { RegionPanel } from './RegionPanel';

const CURRENT_PLAYER_ID = STARTER_PLAYER_ID;

export function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchWorld().then(setWorld).catch((cause: Error) => setError(cause.message));
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
          onSelect={setSelectedRegionId}
        />
        <RegionPanel
          world={world}
          region={selectedRegion}
          currentPlayerId={CURRENT_PLAYER_ID}
          busy={busy}
          onClaim={(regionId) =>
            run(() =>
              sendActions([{ type: 'claimRegion', playerId: CURRENT_PLAYER_ID, regionId }]),
            )
          }
          onBuild={(regionId, building: BuildingType) =>
            run(() =>
              sendActions([
                { type: 'build', playerId: CURRENT_PLAYER_ID, regionId, building },
              ]),
            )
          }
        />
      </div>
    </main>
  );
}
