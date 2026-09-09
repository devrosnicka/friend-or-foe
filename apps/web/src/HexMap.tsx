import type { PlayerId, Region, Terrain, World } from '@fof/engine';

const HEX_SIZE = 46;
const LABEL_MAX_LENGTH = 12;

const TERRAIN_FILL: Record<Terrain, string> = {
  plains: '#6f8f4a',
  forest: '#3f6b3a',
  hills: '#8a7a4a',
  mountains: '#6d6a68',
  coast: '#3f6f8a',
};

export const TERRAIN_LABEL: Record<Terrain, string> = {
  plains: 'roviny',
  forest: 'les',
  hills: 'kopce',
  mountains: 'hory',
  coast: 'pobřeží',
};

/** Axiální souřadnice -> střed hexu v pixelech (pointy-top). */
function hexCenter(q: number, r: number): { x: number; y: number } {
  return { x: HEX_SIZE * Math.sqrt(3) * (q + r / 2), y: HEX_SIZE * 1.5 * r };
}

function hexPoints(x: number, y: number): string {
  return Array.from({ length: 6 }, (_, corner) => {
    const angle = ((60 * corner - 30) * Math.PI) / 180;
    return `${x + HEX_SIZE * Math.cos(angle)},${y + HEX_SIZE * Math.sin(angle)}`;
  }).join(' ');
}

function shorten(name: string): string {
  return name.length > LABEL_MAX_LENGTH ? `${name.slice(0, LABEL_MAX_LENGTH - 1)}…` : name;
}

interface HexMapProps {
  readonly world: World;
  readonly currentPlayerId: PlayerId;
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
}

export function HexMap({ world, currentPlayerId, selectedRegionId, onSelect }: HexMapProps) {
  const regions = Object.values(world.regions);
  const centers = regions.map((region) => hexCenter(region.position.q, region.position.r));
  const xs = centers.map((center) => center.x);
  const ys = centers.map((center) => center.y);
  const padding = HEX_SIZE * 1.4;
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const width = Math.max(...xs) - minX + padding;
  const height = Math.max(...ys) - minY + padding;

  return (
    <svg
      className="hex-map"
      viewBox={`${minX} ${minY} ${width} ${height}`}
      role="group"
      aria-label="Mapa regionů"
    >
      {regions.map((region) => (
        <Hex
          key={region.id}
          region={region}
          mine={region.owner === currentPlayerId}
          selected={region.id === selectedRegionId}
          onSelect={onSelect}
        />
      ))}
    </svg>
  );
}

interface HexProps {
  readonly region: Region;
  readonly mine: boolean;
  readonly selected: boolean;
  readonly onSelect: (regionId: string) => void;
}

function Hex({ region, mine, selected, onSelect }: HexProps) {
  const { x, y } = hexCenter(region.position.q, region.position.r);
  const points = hexPoints(x, y);
  const ownerClass = mine ? 'mine' : region.owner === null ? 'neutral' : 'foreign';

  return (
    <g
      className={`hex ${ownerClass} ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(region.id)}
      role="button"
      tabIndex={0}
      aria-label={`${region.name}, ${TERRAIN_LABEL[region.terrain]}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(region.id);
        }
      }}
    >
      <polygon points={points} fill={TERRAIN_FILL[region.terrain]} />
      <polygon className="owner-overlay" points={points} />
      <polygon className="outline" points={points} />
      <text x={x} y={y - 6} className="hex-name">
        {shorten(region.name)}
      </text>
      {region.resources.length > 0 && (
        <text x={x} y={y + 10} className="hex-resource">
          {region.resources.join(', ')}
        </text>
      )}
      {region.buildings.length > 0 && (
        <text x={x} y={y + 26} className="hex-buildings">
          {'▪'.repeat(region.buildings.length)}
        </text>
      )}
    </g>
  );
}
