import { FastifyInstance } from 'fastify';

/**
 * FC200 F2 — programador de tareas periódicas disparado por TRÁFICO (generaliza el disparador de
 * FC199 F4; Dictamen O 432_AN). Medido en prod: el proceso de la API en Hostinger se duerme sin
 * tráfico y un cron dentro de él no dispara. Aquí, tras enviar cada respuesta, cada tarea vencida
 * se lanza en segundo plano:
 *
 *   RUN_t ≡ ¬BUSY_t ∧ DUE_t      (tabla de verdad del FC200)
 *
 * Por tarea: máx. una corrida por `intervalMs`, nunca dos a la vez, y su fallo o lentitud no
 * afecta a las demás ni a la respuesta HTTP (Inv-2). Sin tráfico no se crea nada que procesar.
 */

export interface TrafficTask {
  readonly name: string;
  readonly intervalMs: number;
  readonly run: () => Promise<unknown>;
}

interface TaskState {
  lastStartedAt: number;
  busy: boolean;
}

/** Lanza `task` en segundo plano y deja el resultado (o el fallo) en el log con su nombre. */
function launch(fastify: FastifyInstance, task: TrafficTask, state: TaskState): void {
  task
    .run()
    .then((report) => fastify.log.info({ task: task.name, report }, 'Traffic task done'))
    .catch((err: unknown) => fastify.log.error({ task: task.name, err }, 'Traffic task failed'))
    .finally(() => {
      state.busy = false;
    });
}

/** Registra un solo hook `onResponse` que dispara cada tarea de `tasks` cuando le toca. */
export default function registerTrafficTaskScheduler(
  fastify: FastifyInstance,
  tasks: readonly TrafficTask[],
  now: () => number = Date.now
): void {
  const states = tasks.map((): TaskState => ({ lastStartedAt: -Infinity, busy: false }));

  fastify.addHook('onResponse', async () => {
    const startedAt = now();
    tasks.forEach((task, i) => {
      const state = states[i];
      if (state.busy || startedAt - state.lastStartedAt < task.intervalMs) return;
      state.busy = true;
      state.lastStartedAt = startedAt;
      launch(fastify, task, state);
    });
  });
}
