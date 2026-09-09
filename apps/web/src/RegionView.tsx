import { RESOURCE_IMPROVEMENT, type BuildSlot, type Point, type Region, type World } from '@fof/engine';
import { useMemo } from 'react';
import { TERRAIN_FILL } from './terrain';

/** Kolik místa kolem regionu zbude na náznak sousedů. */
const SURROUNDS = 0.14;
/** Jak daleko za hranicí regionu sedí popisek souseda, podíl velikosti regionu. */
const NAME_OFFSET = 0.07;
/** Poloměr kroužku stavebního místa jako podíl kratší strany regionu. */
const SLOT_RADIUS = 0.13;
/** Jak hustě se plocha regionu proseje při hledání míst. */
const SAMPLE_STEPS = 26;

interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function boundsOf(outline: readonly Point[]): Box {
  const xs = outline.map((point) => point.x);
  const ys = outline.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function pointsOf(outline: readonly Point[]): string {
  return outline.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

/** Leží bod uvnitř mnohoúhelníku? Ray casting doprava. */
function contains(outline: readonly Point[], point: Point): boolean {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
    const a = outline[i] as Point;
    const b = outline[j] as Point;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Vzdálenost bodu od nejbližší hrany obrysu. */
function distanceToEdge(outline: readonly Point[], point: Point): number {
  let best = Infinity;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
    const a = outline[j] as Point;
    const b = outline[i] as Point;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    const nearest = { x: a.x + t * dx, y: a.y + t * dy };
    best = Math.min(best, Math.hypot(point.x - nearest.x, point.y - nearest.y));
  }
  return best;
}

/**
 * Rozmístí stavební místa po regionu.
 *
 * Prstenec kolem popisného bodu nestačí — regiony bývají konkávní a vznikly
 * slitím buněk, takže by místa vyčnívala do moře. Proto se plocha proseje
 * mřížkou, nechají se jen body, do kterých se kroužek celý vejde, a z nich
 * se hladově vybírají ty nejvzdálenější od už vybraných.
 */
function slotPositions(region: Region, radius: number): Point[] {
  const { outline, centre } = region.shape;
  const box = boundsOf(outline);
  const step = Math.max((box.maxX - box.minX) / SAMPLE_STEPS, (box.maxY - box.minY) / SAMPLE_STEPS);

  const room: { point: Point; clearance: number }[] = [];
  for (let y = box.minY; y <= box.maxY; y += step) {
    for (let x = box.minX; x <= box.maxX; x += step) {
      const point = { x, y };
      if (!contains(outline, point)) {
        continue;
      }
      const clearance = distanceToEdge(outline, point);
      if (clearance >= radius) {
        room.push({ point, clearance });
      }
    }
  }

  if (room.length === 0) {
    return Array.from({ length: region.slots.length }, () => centre);
  }

  // Začne se tam, kde je nejvíc místa, a dál vždy co nejdál od už vybraných.
  const chosen: Point[] = [
    (room.reduce((best, candidate) => (candidate.clearance > best.clearance ? candidate : best)))
      .point,
  ];

  while (chosen.length < region.slots.length) {
    let best = room[0] as { point: Point; clearance: number };
    let bestGap = -1;
    for (const candidate of room) {
      const gap = Math.min(
        ...chosen.map((taken) => Math.hypot(candidate.point.x - taken.x, candidate.point.y - taken.y)),
      );
      if (gap > bestGap) {
        bestGap = gap;
        best = candidate;
      }
    }
    chosen.push(best.point);
  }

  return chosen;
}

function vertexKey(point: Point): string {
  return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

/**
 * Kam napsat jméno souseda.
 *
 * Sousední regiony vzešly z téhož Voronoi diagramu, takže mají společnou
 * hranici doslova ze stejných vrcholů. Popisek sedí na jejím středu, kousek
 * za hranicí — na těžišti souseda by při těsném výřezu skončil mimo plátno
 * a navíc by neříkal, kterou stranou se k regionu tiskne.
 */
function nameAnchor(focus: Region, neighbour: Region, reach: number): Point {
  const own = new Set(focus.shape.outline.map(vertexKey));
  const shared = neighbour.shape.outline.filter((point) => own.has(vertexKey(point)));

  if (shared.length === 0) {
    return neighbour.shape.centre;
  }

  const middle = {
    x: shared.reduce((sum, point) => sum + point.x, 0) / shared.length,
    y: shared.reduce((sum, point) => sum + point.y, 0) / shared.length,
  };

  const dx = middle.x - focus.shape.centre.x;
  const dy = middle.y - focus.shape.centre.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: middle.x + (dx / length) * reach, y: middle.y + (dy / length) * reach };
}

interface RegionViewProps {
  readonly world: World;
  readonly region: Region;
  readonly canBuild: boolean;
  readonly selectedSlot: number | null;
  readonly onSelectSlot: (slot: number | null) => void;
  readonly onSelectRegion: (regionId: string) => void;
}

export function RegionView({
  world,
  region,
  canBuild,
  selectedSlot,
  onSelectSlot,
  onSelectRegion,
}: RegionViewProps) {
  const box = boundsOf(region.shape.outline);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const slotRadius = Math.min(width, height) * SLOT_RADIUS;
  const positions = useMemo(() => slotPositions(region, slotRadius), [region, slotRadius]);

  const margin = Math.max(width, height) * SURROUNDS;
  const view = {
    x: box.minX - margin,
    y: box.minY - margin,
    width: width + margin * 2,
    height: height + margin * 2,
  };

  // Popisky nesmí zmenšit výřez, proto se počítají v jednotkách mapy.
  const scale = view.width / 900;
  const offset = Math.max(width, height) * NAME_OFFSET;
  const neighbours = region.neighbours
    .map((id) => world.regions[id])
    .filter((neighbour): neighbour is Region => neighbour !== undefined);

  return (
    <div className="region-view">
      <svg
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        role="group"
        aria-label={`Region ${region.name}, ${region.slots.length} stavebních míst`}
      >
        <defs>
          <filter id="haze" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={Math.max(width, height) * 0.012} />
          </filter>
        </defs>

        {/* Sousedé jen jako rozmazaný náznak — kam sahá moře, nekreslí se nic. */}
        <g className="surrounds" filter="url(#haze)">
          {neighbours.map((neighbour) => (
            <polygon
              key={neighbour.id}
              points={pointsOf(neighbour.shape.outline)}
              fill={TERRAIN_FILL[neighbour.terrain]}
            />
          ))}
        </g>

        {neighbours.map((neighbour) => {
          const at = nameAnchor(region, neighbour, offset);
          return (
            <text
              key={neighbour.id}
              className="surrounds-name"
              x={at.x}
              y={at.y}
              style={{ fontSize: 15 * scale, strokeWidth: 3 * scale }}
              onClick={() => onSelectRegion(neighbour.id)}
            >
              {neighbour.name}
            </text>
          );
        })}

        <polygon
          className="focus"
          points={pointsOf(region.shape.outline)}
          fill={TERRAIN_FILL[region.terrain]}
        />

        {region.slots.map((slot, index) => (
          <Slot
            key={index}
            slot={slot}
            at={positions[index] as Point}
            radius={slotRadius}
            scale={scale}
            selected={index === selectedSlot}
            enabled={canBuild}
            onSelect={() => onSelectSlot(index === selectedSlot ? null : index)}
          />
        ))}
      </svg>
    </div>
  );
}

const BUILDING_MARK: Record<string, string> = { farm: '🌾', mine: '⛏', barracks: '🛡' };

interface SlotProps {
  readonly slot: BuildSlot;
  readonly at: Point;
  readonly radius: number;
  readonly scale: number;
  readonly selected: boolean;
  readonly enabled: boolean;
  readonly onSelect: () => void;
}

function Slot({ slot, at, radius, scale, selected, enabled, onSelect }: SlotProps) {
  const state = [
    slot.requires === null ? 'general' : 'resource',
    slot.building === null ? 'free' : 'taken',
    selected ? 'selected' : '',
  ]
    .join(' ')
    .trim();

  const label =
    slot.building === null
      ? (slot.requires ?? '')
      : `${BUILDING_MARK[slot.building] ?? ''} ${slot.building}`;

  return (
    <g
      className={`slot ${state}`}
      onClick={enabled ? onSelect : undefined}
      role={enabled ? 'button' : 'img'}
      tabIndex={enabled ? 0 : -1}
      aria-label={
        slot.building === null
          ? `Volné místo${slot.requires === null ? '' : ` pro surovinu ${slot.requires}`}`
          : `${slot.building}${slot.requires === null ? '' : ` na surovině ${slot.requires}`}`
      }
      onKeyDown={(event) => {
        if (enabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <circle cx={at.x} cy={at.y} r={radius} vectorEffect="non-scaling-stroke" />
      {label !== '' && (
        <text x={at.x} y={at.y + 5 * scale} style={{ fontSize: 13 * scale, strokeWidth: 3 * scale }}>
          {label}
        </text>
      )}
    </g>
  );
}
