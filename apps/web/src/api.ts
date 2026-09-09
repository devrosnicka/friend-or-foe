import type { Action, World } from '@fof/engine';

interface ErrorBody {
  error?: { code?: string; message?: string };
}

async function request(path: string, init?: RequestInit): Promise<World> {
  const response = await fetch(path, init);
  const body: unknown = await response.json();

  if (!response.ok) {
    const message = (body as ErrorBody).error?.message;
    throw new Error(message ?? `Požadavek selhal (HTTP ${response.status}).`);
  }

  return (body as { world: World }).world;
}

export const fetchWorld = (): Promise<World> => request('/api/world');

export const sendActions = (actions: Action[]): Promise<World> =>
  request('/api/actions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actions }),
  });

export const resetWorld = (): Promise<World> => request('/api/reset', { method: 'POST' });
