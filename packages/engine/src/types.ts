export type RegionId = string;
export type PlayerId = string;

export type Terrain = 'plains' | 'forest' | 'hills' | 'mountains' | 'coast';

export type StrategicResource = 'iron' | 'coal' | 'horses' | 'oil' | 'gold';

export type BuildingType = 'farm' | 'mine' | 'barracks';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Tvar regionu na mapě. Engine ho nepoužívá, slouží jen k vykreslení —
 * pravidla znají výhradně seznam sousedů.
 */
export interface RegionShape {
  /** Obrys jako uzavřený mnohoúhelník; první bod se neopakuje na konci. */
  readonly outline: readonly Point[];
  /** Bod uvnitř regionu, kam patří popisek. */
  readonly centre: Point;
}

export interface Region {
  readonly id: RegionId;
  readonly name: string;
  readonly terrain: Terrain;
  readonly neighbours: readonly RegionId[];
  /** null = neutrální území */
  readonly owner: PlayerId | null;
  readonly resources: readonly StrategicResource[];
  readonly buildings: readonly BuildingType[];
  readonly shape: RegionShape;
}

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly production: number;
}

export interface World {
  readonly turn: number;
  readonly players: Readonly<Record<PlayerId, Player>>;
  readonly regions: Readonly<Record<RegionId, Region>>;
}

export interface ClaimRegionAction {
  readonly type: 'claimRegion';
  readonly playerId: PlayerId;
  readonly regionId: RegionId;
}

export interface BuildAction {
  readonly type: 'build';
  readonly playerId: PlayerId;
  readonly regionId: RegionId;
  readonly building: BuildingType;
}

export interface EndTurnAction {
  readonly type: 'endTurn';
  readonly playerId: PlayerId;
}

export type Action = ClaimRegionAction | BuildAction | EndTurnAction;

export type RuleViolationCode =
  | 'UNKNOWN_ACTION'
  | 'UNKNOWN_PLAYER'
  | 'UNKNOWN_REGION'
  | 'REGION_NOT_NEUTRAL'
  | 'REGION_NOT_ADJACENT'
  | 'REGION_NOT_OWNED'
  | 'NOT_ENOUGH_PRODUCTION';

export interface RuleViolation {
  readonly code: RuleViolationCode;
  readonly message: string;
}

export type ApplyResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly error: RuleViolation };
