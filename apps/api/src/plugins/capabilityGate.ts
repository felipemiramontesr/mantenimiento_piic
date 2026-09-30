import { FastifyInstance, FastifyPluginAsync, FastifyPluginCallback } from 'fastify';
import {
  requireUniverseCapability,
  CapabilityRequirement,
} from '../middleware/requireUniverseCapability';

/**
 * FC193 F2 (D7 / 373_AN) — envuelve un plugin de rutas de negocio con el gate de capacidad a nivel de
 * PLUGIN: el `preHandler` se registra en el scope contenedor, así que lo heredan TODAS las rutas del
 * plugin y sus dos registros (`/v1` y `/v1/mantenimiento`) sin listar ruta por ruta (53 de 137 rutas no
 * declaran guard propio, ver 372_AN §2.3). Corre antes que los `preHandler` del propio plugin (permiso).
 *
 * El prefijo lo aplica el scope contenedor; el plugin hijo se registra sin opciones para no duplicarlo.
 * El hijo es un plugin callback `(fastify, opts, done)`: los plugins de rutas no esperan nada al
 * registrarse (FC202 F2, S7503).
 */
export default function withCapability(
  requirement: CapabilityRequirement,
  plugin: FastifyPluginCallback
): FastifyPluginAsync {
  const gate = requireUniverseCapability(requirement);
  return async (scope: FastifyInstance): Promise<void> => {
    scope.addHook('preHandler', gate);
    await scope.register(plugin);
  };
}
