import { createStarterWorld, type World } from '@fof/engine';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/** Celý stav světa žije v jednom JSON souboru — pro prototyp to stačí. */
const DATA_FILE = resolve(process.env['FOF_DATA_FILE'] ?? 'data/world.json');

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}

/** Načte svět; při prvním spuštění vytvoří a uloží startovní mapu. */
export async function loadWorld(): Promise<World> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8')) as World;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
    return resetWorld();
  }
}

/** Zapíše svět atomicky (tmp soubor + rename), aby pád nezanechal půlku stavu. */
export async function saveWorld(world: World): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.tmp`;
  await writeFile(tmpFile, `${JSON.stringify(world, null, 2)}\n`, 'utf8');
  await rename(tmpFile, DATA_FILE);
}

export async function resetWorld(): Promise<World> {
  const world = createStarterWorld();
  await saveWorld(world);
  return world;
}

export const dataFilePath = DATA_FILE;
