import type { PlayerId, Point, Region, Terrain, World } from '@fof/engine';

const LABEL_MAX_LENGTH = 14;
/** Volný okraj kolem pevniny, aby se moře nedotýkalo hrany plátna. */
const MARGIN = 30;

const TERRAIN_FILL: Record<Terrain, string> = {
  plains: '#6f8f4a',
  forest: '#3f6b3a',
  hills: '#8a7a4a',
  mountains: '#6d6a68',
  coast: '#5f8a6d',
};

export const TERRAIN_LABEL: Record<Terrain, string> = {
  plains: 'roviny',
  forest: 'les',
  hills: 'kopce',
  mountains: 'hory',
  coast: 'pobřeží',
};

function toPath(outline: readonly Point[]): string {
  return `${outline.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')}`;
}

function shorten(name: string): string {
  return name.length > LABEL_MAX_LENGTH ? `${name.slice(0, LABEL_MAX_LENGTH - 1)}…` : name;
}

interface RegionMapProps {
  readonly world: World;
  readonly currentPlayerId: PlayerId;
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
}

export function RegionMap({
  world,
  currentPlayerId,
  selectedRegionId,
  onSelect,
}: RegionMapProps) {
  const regions = Object.values(world.regions);
  const points = regions.flatMap((region) => region.shape.outline);
  const minX = Math.min(...points.map((point) => point.x)) - MARGIN;
  const minY = Math.min(...points.map((point) => point.y)) - MARGIN;
  const width = Math.max(...points.map((point) => point.x)) + MARGIN - minX;
  const height = Math.max(...points.map((point) => point.y)) + MARGIN - minY;

  const selected = selectedRegionId ? world.regions[selectedRegionId] : undefined;
  const adjacent = new Set(selected?.neighbours ?? []);

  return (
    <svg
      className="region-map"
      viewBox={`${minX} ${minY} ${width} ${height}`}
      role="group"
      aria-label="Mapa regionů"
    >
      {/* Pobřežní lem: tytéž obrysy silnou linkou pod pevninou. */}
      <g className="shoreline">
        {regions.map((region) => (
          <polygon key={region.id} points={toPath(region.shape.outline)} />
        ))}
      </g>

      {regions.map((region) => (
        <RegionShape
          key={region.id}
          region={region}
          mine={region.owner === currentPlayerId}
          selected={region.id === selectedRegionId}
          adjacent={adjacent.has(region.id)}
          onSelect={onSelect}
        />
      ))}
    </svg>
  );
}

interface RegionShapeProps {
  readonly region: Region;
  readonly mine: boolean;
  readonly selected: boolean;
  readonly adjacent: boolean;
  readonly onSelect: (regionId: string) => void;
}

function RegionShape({ region, mine, selected, adjacent, onSelect }: RegionShapeProps) {
  const { outline, centre } = region.shape;
  const points = toPath(outline);
  const ownerClass = mine ? 'mine' : region.owner === null ? 'neutral' : 'foreign';
  const stateClass = [selected ? 'selected' : '', adjacent ? 'adjacent' : ''].join(' ').trim();

  return (
    <g
      className={`region ${ownerClass} ${stateClass}`}
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
      <text x={centre.x} y={centre.y - 4} className="region-name">
        {shorten(region.name)}
      </text>
      {region.resources.length > 0 && (
        <text x={centre.x} y={centre.y + 12} className="region-resource">
          {region.resources.join(', ')}
        </text>
      )}
      {region.buildings.length > 0 && (
        <text x={centre.x} y={centre.y + 28} className="region-buildings">
          {'▪'.repeat(region.buildings.length)}
        </text>
      )}
    </g>
  );
}
