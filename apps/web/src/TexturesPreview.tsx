import type { Terrain } from '@fof/engine';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TERRAIN_LABEL } from './terrain';
import { TERRAINS, TerrainTextures, terrainFill, tileSizeOf } from './textures';
import './styles.css';

/**
 * Ladicí stránka textur na `/textures.html` (jen ve vývoji, `vite build`
 * staví pouze `index.html`).
 *
 * Na mapě jsou regiony malé a hranice vzor rozbijí, takže se opakování
 * pozná až na velké souvislé ploše. Tady je každý terén na plné ploše,
 * ve stejném měřítku jako na mapě, a dá se pod něj pustit mřížka dlaždic —
 * když je na spárách vidět šev, je to vidět právě na ní.
 */

/** Kolik jednotek mapy je dlaždice v jednotlivých pohledech. */
const SCALES: readonly { readonly label: string; readonly tile: number }[] = [
  { label: 'Okolí', tile: 32 },
  { label: 'Detail', tile: 56 },
  { label: 'Region', tile: 130 },
];

const WIDTH = 440;
const HEIGHT = 260;

interface SwatchProps {
  readonly terrain: Terrain;
  readonly tile: number;
  readonly grid: boolean;
}

function Swatch({ terrain, tile, grid }: SwatchProps) {
  const size = tileSizeOf(terrain, tile);

  return (
    <figure className="swatch">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <TerrainTextures tile={tile} />
        <defs>
          <pattern id={`grid-${terrain}`} width={size} height={size} patternUnits="userSpaceOnUse">
            <rect width={size} height={size} fill="none" stroke="#ff3b30" strokeWidth={1} />
          </pattern>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill={terrainFill(terrain, true)} />
        {grid && <rect width={WIDTH} height={HEIGHT} fill={`url(#grid-${terrain})`} />}
      </svg>

      <figcaption>
        <strong>{TERRAIN_LABEL[terrain]}</strong> <span className="muted">· {terrain}</span>
        <span className="muted"> · dlaždice {Math.round(size)}</span>
      </figcaption>
    </figure>
  );
}

function Preview() {
  const [tile, setTile] = useState(SCALES[1]?.tile ?? 56);
  const [grid, setGrid] = useState(false);

  return (
    <main className="textures-preview">
      <header>
        <h1>Textury terénu</h1>
        <div className="zoom-levels" role="group" aria-label="Měřítko">
          {SCALES.map((scale) => (
            <button
              key={scale.label}
              type="button"
              className={scale.tile === tile ? 'active' : ''}
              aria-pressed={scale.tile === tile}
              onClick={() => setTile(scale.tile)}
            >
              {scale.label}
            </button>
          ))}
        </div>
        <label>
          <input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} />
          Mřížka dlaždic
        </label>
      </header>

      <div className="swatches">
        {TERRAINS.map((terrain) => (
          <Swatch key={terrain} terrain={terrain} tile={tile} grid={grid} />
        ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<Preview />);
