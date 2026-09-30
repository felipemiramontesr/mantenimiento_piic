import mysql from 'mysql2/promise';
import type { PoolConnection as CorePoolConnection, QueryError } from 'mysql2';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

/**
 * DATABASE POOL - ARCHON Master Standard
 *
 * @remarks
 * Instantiates a strict promise-based connection pool to the underlying MySQL mechanism.
 * By default, this enforces SSL/TLS across the transmission layer (`rejectUnauthorized`)
 * and caps connection limits to prevent DOS flooding in the DB memory limits.
 *
 * Connections must exclusively be acquired and released directly via the pool
 * to adhere strictly to the non-blocking stateless architecture.
 */
// Environmental Fallback Logic (Certified for High-Availability)
export const resolveDbHost = (): string => process.env.DB_HOST || 'localhost';

/**
 * Zona horaria operativa de la flota (México/Zacatecas).
 * Offset fijo: México abolió el horario de verano en 2022 — sin riesgo DST.
 * Ancla CURDATE()/NOW()/TIMESTAMPDIFF a hora local en cualquier servidor (Hostinger corre UTC),
 * eliminando el corrimiento de +1 día en alertas, forecast y outbox después de las 18:00 MX.
 */
export const MEXICO_TZ_OFFSET = '-06:00';

// Incidente DB-1045 (FC082, Alfa/Bravo P1) — enableKeepAlive mantiene los
// sockets del pool vivos entre requests, reduciendo los handshakes nuevos que
// el burst concurrente del SPA fuerza al arrancar frío. connectionLimit NO se
// toca aquí — Bravo lo marcó como experimento a medir con datos de antes/después
// (Cond.2), no como cambio a aplicar a ciegas junto con esto.
const db = mysql.createPool({
  host: resolveDbHost(),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
});

// FC202 F2 (S9383) — `mysql2/promise` tipa este evento con el `PoolConnection` de promesas, pero el
// pool reemite el evento del pool core (lib/promise/pool.js `inheritEvents`): en runtime llega la
// conexión CALLBACK, cuyo `query()` devuelve un `Query` que lanza si se le invoca `.then` (incidente
// P0 V.78.103.262). Se usa la API callback con su tipo real: una conexión sin la zona horaria o el
// charset de la app corrompería fechas y textos en silencio, así que se destruye y queda en el log.
db.on('connection', (promiseTypedConnection) => {
  const connection = promiseTypedConnection as unknown as CorePoolConnection;
  let failed = false;
  const onSessionInit = (err: QueryError | null): void => {
    if (!err || failed) return;
    failed = true;
    connection.destroy();
    // eslint-disable-next-line no-console -- mismo canal que la traza `db-pool-boot` de este módulo
    console.error(JSON.stringify({ msg: 'db-session-init-failed', error: err.message }));
  };
  connection.query(`SET time_zone = '${MEXICO_TZ_OFFSET}'`, onSessionInit);
  connection.query(`SET NAMES utf8mb4`, onSessionInit);
});

// Incidente DB-1045 (Cond.6 Bravo) — traza de arranque de la config de conexión
// SIN password, para poder correlacionar despliegues con el comportamiento del
// pool en los logs (host/usuario/base/límite ya son públicos en el propio error
// de MySQL que se está diagnosticando; el password nunca se loguea).
// eslint-disable-next-line no-console
console.log(
  JSON.stringify({
    msg: 'db-pool-boot',
    host: resolveDbHost(),
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    pid: process.pid,
    connectionLimit: 10,
  })
);

export default db;
