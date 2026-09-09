import { applyActions, type World } from '@fof/engine';
import Fastify from 'fastify';
import { actionsBodySchema, type ActionsBody } from './actionSchema';
import { dataFilePath, loadWorld, resetWorld, saveWorld } from './storage';

/**
 * Tenká vrstva nad enginem: validace vstupu, načtení stavu, zavolání enginu,
 * uložení stavu. Žádné herní pravidlo tady být nesmí.
 */
const app = Fastify({ logger: true });

/**
 * Požadavky, které mění svět, jdou jeden po druhém — jinak by souběžné
 * čtení a zápis souboru mohlo o změnu přijít.
 */
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => undefined);
  return result;
}

app.get('/api/world', async () => ({ world: await loadWorld() }));

app.post('/api/actions', async (request, reply) => {
  const parsed = actionsBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({
      error: { code: 'INVALID_REQUEST', message: 'Neplatný tvar akcí.' },
      issues: parsed.error.issues,
    });
  }

  const { actions } = parsed.data as ActionsBody;

  return serialize(async (): Promise<{ world: World } | undefined> => {
    const world = await loadWorld();
    const result = applyActions(world, actions);

    if (!result.ok) {
      await reply.code(400).send({ error: result.error });
      return undefined;
    }

    await saveWorld(result.world);
    return { world: result.world };
  });
});

app.post('/api/reset', async () => serialize(async () => ({ world: await resetWorld() })));

const port = Number(process.env['PORT'] ?? 3000);

app
  .listen({ port, host: '127.0.0.1' })
  .then(() => app.log.info(`Stav světa: ${dataFilePath}`))
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
