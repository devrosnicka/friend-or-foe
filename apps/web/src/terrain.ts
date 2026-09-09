import type { Terrain } from '@fof/engine';

export const TERRAIN_FILL: Record<Terrain, string> = {
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
