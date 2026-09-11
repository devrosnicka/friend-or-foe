import type { PlayerId, Point, Region, World } from '@fof/engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RegionView } from './RegionView';
import { TERRAIN_LABEL } from './terrain';
import { TerrainTextures, terrainFill } from './textures';

/**
 * Úrovně přiblížení. Šířka výřezu se počítá jako násobek typického průměru
 * regionu, takže úrovně sedí na malou i velkou mapu bez ohledu na to, jak
 * hustá je mřížka, ze které vznikla.
 */
interface ZoomLevel {
  readonly label: string;
  readonly span: number;
  /** Co se u regionu vypíše. Na dálku by se popisky stejně slily. */
  readonly labels: 'full' | 'name' | 'none';
  /** Pobřežní lem zdvojuje každý obrys, takže na dálku se vypíná. */
  readonly shore: boolean;
  /** Na dálku je region jen pár desítek pixelů a z textury by zbyl šum. */
  readonly texture: boolean;
}

const ZOOM_LEVELS: readonly ZoomLevel[] = [
  { label: 'Detail', span: 5, labels: 'full', shore: true, texture: true },
  { label: 'Okolí', span: 9, labels: 'name', shore: true, texture: true },
  { label: 'Přehled', span: 26, labels: 'none', shore: false, texture: false },
];

const DEFAULT_ZOOM = 1;

/** Strana dlaždice textury jako podíl typického průměru regionu. */
const TILE_SHARE = 0.28;

interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function boundsOf(outline: readonly Point[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of outline) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, maxX, maxY };
}

function overlaps(a: Box, b: Box): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/** Rozměr prvku v pixelech — potřebný, aby výřez seděl na poměr stran. */
function useElementSize(): [React.RefObject<HTMLDivElement | null>, { width: number; height: number }] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) {
        setSize({ width: box.width, height: box.height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

/** Přibližná šířka znaku popisku v pixelech. */
const CHARACTER_WIDTH = 7;
/** Kratší popisek než tohle už nic neřekne, tak se radši nekreslí. */
const MIN_LABEL_CHARS = 4;

/**
 * Popisek se vejde jen do šířky svého regionu. Bez toho se u sousedních
 * drobných regionů jména slijí do jedné kaše.
 */
function fitLabel(name: string, availablePixels: number): string | null {
  const room = Math.floor(availablePixels / CHARACTER_WIDTH);
  if (room < MIN_LABEL_CHARS) {
    return null;
  }
  return name.length > room ? `${name.slice(0, room - 1)}…` : name;
}

interface RegionMapProps {
  readonly world: World;
  readonly currentPlayerId: PlayerId;
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly selectedSlot: number | null;
  readonly onSelectSlot: (slot: number | null) => void;
}

export function RegionMap({
  world,
  currentPlayerId,
  selectedRegionId,
  onSelect,
  selectedSlot,
  onSelectSlot,
}: RegionMapProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [wrapper, size] = useElementSize();

  const regions = useMemo(() => Object.values(world.regions), [world]);

  /** Obálky se počítají jednou; na velké mapě by to jinak bylo při každém překreslení. */
  const boxes = useMemo(() => {
    const map = new Map<string, Box>();
    for (const region of regions) {
      map.set(region.id, boundsOf(region.shape.outline));
    }
    return map;
  }, [regions]);

  /** Typický průměr regionu — měřítko, ze kterého se odvozují úrovně přiblížení. */
  const unit = useMemo(() => {
    const widths = regions
      .map((region) => {
        const box = boxes.get(region.id) as Box;
        return (box.maxX - box.minX + box.maxY - box.minY) / 2;
      })
      .sort((a, b) => a - b);
    return widths[Math.floor(widths.length / 2)] ?? 1;
  }, [regions, boxes]);

  const home = regions.find((region) => region.owner === currentPlayerId);
  const focus =
    (selectedRegionId === null ? undefined : world.regions[selectedRegionId]) ?? home ?? regions[0];

  if (focus === undefined) {
    return <div className="region-map empty">Svět je prázdný.</div>;
  }

  const inRegion = zoom === ZOOM_LEVELS.length;
  const level = ZOOM_LEVELS[Math.min(zoom, ZOOM_LEVELS.length - 1)] as ZoomLevel;
  const viewWidth = unit * level.span;
  const aspect = size.width > 0 ? size.height / size.width : 0.75;
  const viewHeight = viewWidth * aspect;

  const view: Box = {
    minX: focus.shape.centre.x - viewWidth / 2,
    minY: focus.shape.centre.y - viewHeight / 2,
    maxX: focus.shape.centre.x + viewWidth / 2,
    maxY: focus.shape.centre.y + viewHeight / 2,
  };

  // Co se do výřezu nevejde, se nevykreslí — na mapě o stovkách regionů je
  // to rozdíl mezi několika desítkami tvarů a všemi.
  const visible = regions.filter((region) => overlaps(boxes.get(region.id) as Box, view));

  // Dlaždice je zlomek typického regionu, ne obrazovky — textura pak drží
  // měřítko světa a při přiblížení se zvětší spolu s ním.
  const tile = unit * TILE_SHARE;

  /** Popisky se nesmějí zmenšovat s výřezem, jinak by na dálku zmizely. */
  const textScale = size.width > 0 ? viewWidth / size.width : 1;
  const adjacent = new Set(focus.neighbours);

  const controls = (
    <>
      <div className="map-controls">
        <div className="zoom-levels" role="group" aria-label="Přiblížení">
          {[...ZOOM_LEVELS.map((option) => option.label), 'Region'].map((label, index) => (
            <button
              key={label}
              type="button"
              className={index === zoom ? 'active' : ''}
              aria-pressed={index === zoom}
              onClick={() => setZoom(index)}
            >
              {label}
            </button>
          ))}
        </div>
        {home !== undefined && (
          <button type="button" className="secondary" onClick={() => onSelect(home.id)}>
            Moje území
          </button>
        )}
      </div>

      <p className="map-status">
        {inRegion
          ? `${focus.name} · ${focus.slots.length} stavebních míst`
          : `${focus.name} · ${visible.length} z ${regions.length} regionů v záběru`}
      </p>
    </>
  );

  if (inRegion) {
    return (
      <div className="region-map" ref={wrapper}>
        <RegionView
          world={world}
          region={focus}
          canBuild={focus.owner === currentPlayerId}
          selectedSlot={selectedSlot}
          onSelectSlot={onSelectSlot}
          onSelectRegion={onSelect}
        />
        {controls}
      </div>
    );
  }

  return (
    <div className="region-map" ref={wrapper}>
      <svg
        viewBox={`${view.minX} ${view.minY} ${viewWidth} ${viewHeight}`}
        role="group"
        aria-label={`Mapa regionů, střed ${focus.name}, ${visible.length} z ${regions.length} regionů v záběru`}
      >
        {level.texture && <TerrainTextures tile={tile} />}

        {/* Pobřežní lem: tytéž obrysy silnou linkou pod pevninou. */}
        {level.shore && (
          <g className="shoreline">
            {visible.map((region) => (
              <polygon key={region.id} points={pointsOf(region.shape.outline)} />
            ))}
          </g>
        )}

        {visible.map((region) => (
          <RegionShape
            key={region.id}
            region={region}
            mine={region.owner === currentPlayerId}
            focused={region.id === focus.id}
            selected={region.id === selectedRegionId}
            adjacent={adjacent.has(region.id)}
            labels={level.labels}
            textured={level.texture}
            textScale={textScale}
            widthPixels={roomAround(region, boxes.get(region.id) as Box) / textScale}
            onSelect={onSelect}
          />
        ))}
      </svg>

      {controls}
    </div>
  );
}

/**
 * Kolik místa má popisek kolem svého bodu. Ten leží uvnitř regionu, ale
 * zdaleka ne uprostřed, takže měřit celou obálku by popisky pouštělo
 * do sousedů.
 */
function roomAround(region: Region, box: Box): number {
  const { x } = region.shape.centre;
  return 2 * Math.min(x - box.minX, box.maxX - x);
}

/** Kolik staveb v regionu stojí. */
function built(region: Region): number {
  return region.slots.filter((slot) => slot.building !== null).length;
}

function pointsOf(outline: readonly Point[]): string {
  return outline.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

interface RegionShapeProps {
  readonly region: Region;
  readonly mine: boolean;
  readonly focused: boolean;
  readonly selected: boolean;
  readonly adjacent: boolean;
  readonly labels: ZoomLevel['labels'];
  readonly textured: boolean;
  readonly textScale: number;
  /** Kolik pixelů je region na obrazovce široký — do toho se musí vejít popisek. */
  readonly widthPixels: number;
  readonly onSelect: (regionId: string) => void;
}

function RegionShape({
  region,
  mine,
  focused,
  selected,
  adjacent,
  labels,
  textured,
  textScale,
  widthPixels,
  onSelect,
}: RegionShapeProps) {
  const { outline, centre } = region.shape;
  const points = pointsOf(outline);
  const ownerClass = mine ? 'mine' : region.owner === null ? 'neutral' : 'foreign';
  const state = [selected ? 'selected' : '', adjacent && !focused ? 'adjacent' : ''].join(' ').trim();
  const label = labels === 'none' ? null : fitLabel(region.name, widthPixels);

  return (
    <g
      className={`region ${ownerClass} ${state}`}
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
      <polygon points={points} fill={terrainFill(region.terrain, textured)} />
      {/* Neutrální region žádnou barvu vlastníka nepotřebuje, a je jich většina. */}
      {region.owner !== null && <polygon className="owner-overlay" points={points} />}
      <polygon className="outline" points={points} vectorEffect="non-scaling-stroke" />

      {label !== null && (
        <text
          x={centre.x}
          y={centre.y - (labels === 'full' ? 4 : -4) * textScale}
          className="region-name"
          style={{ fontSize: 13 * textScale, strokeWidth: 3 * textScale }}
        >
          {label}
        </text>
      )}

      {labels === 'full' && label !== null && region.resources.length > 0 && (
        <text
          x={centre.x}
          y={centre.y + 12 * textScale}
          className="region-resource"
          style={{ fontSize: 11 * textScale, strokeWidth: 3 * textScale }}
        >
          {region.resources.join(', ')}
        </text>
      )}

      {labels === 'full' && label !== null && built(region) > 0 && (
        <text
          x={centre.x}
          y={centre.y + 28 * textScale}
          className="region-buildings"
          style={{ fontSize: 14 * textScale, strokeWidth: 3 * textScale }}
        >
          {'▪'.repeat(built(region))}
        </text>
      )}
    </g>
  );
}
