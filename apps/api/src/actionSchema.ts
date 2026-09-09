import type { Action } from '@fof/engine';
import { z } from 'zod';

/**
 * Validace tvaru požadavku na hranici API. Herní pravidla řeší engine —
 * tady jde jen o to, že přišel opravdu `Action` a ne libovolný JSON.
 */
const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('claimRegion'),
    playerId: z.string().min(1),
    regionId: z.string().min(1),
  }),
  z.object({
    type: z.literal('build'),
    playerId: z.string().min(1),
    regionId: z.string().min(1),
    building: z.enum(['farm', 'mine', 'barracks']),
  }),
  z.object({
    type: z.literal('endTurn'),
    playerId: z.string().min(1),
  }),
]);

export const actionsBodySchema = z.object({
  actions: z.array(actionSchema).min(1),
});

export type ActionsBody = { actions: Action[] };
