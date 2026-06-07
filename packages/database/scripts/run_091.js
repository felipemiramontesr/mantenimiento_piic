/**
 * run_091.js
 *
 * Crea las tablas UPA para el pipeline de mantenimiento Universal Process Archon.
 *
 * Idempotente: usa CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 * Seguro para ejecutar N veces contra la misma base de datos.
 *
 * Uso (local):
 *   node run_091.js
 *
 * Uso (producción — apuntar al host remoto antes de ejecutar):
 *   DB_HOST=srv... DB_USER=u701509674_Mant_piic DB_PASSWORD=XXX DB_NAME=u701509674_Mant_piic node run_091.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function runMigration() {
  console.log('[091] Conectando a BD...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archon',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();

  try {
    console.log('[091] Iniciando transacción...');
    await connection.beginTransaction();

    console.log('[091] Creando tabla upa_work_orders...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS upa_work_orders (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid          CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
        vehicle_id    VARCHAR(36) NOT NULL,
        fleet_type    ENUM('urban', 'mining') NOT NULL DEFAULT 'urban',
        status        ENUM('IN_PROGRESS', 'AWAITING_AUTH', 'CLOSED') NOT NULL DEFAULT 'IN_PROGRESS',
        pending_since DATETIME NULL,
        opened_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at     DATETIME NULL,
        CONSTRAINT fk_upa_wo_vehicle FOREIGN KEY (vehicle_id) REFERENCES fleet_units(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('[091] Creando tabla upa_work_order_tasks...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS upa_work_order_tasks (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        work_order_id   INT UNSIGNED NOT NULL,
        task_id         VARCHAR(100) NOT NULL,
        stage           ENUM('triage', 'minor_service', 'cascade', 'deferred', 'closure') NOT NULL,
        package_level   ENUM('10k', '20k', '30k', '50k') NULL,
        description     TEXT NOT NULL,
        status          ENUM('pending', 'completed', 'DEFERRED_FINANCIAL', 'N_A_STRUCTURAL') NOT NULL DEFAULT 'pending',
        evidence_urls   JSON NULL,
        evidence_notes  TEXT NULL,
        completed_at    DATETIME NULL,
        CONSTRAINT fk_upa_task_wo FOREIGN KEY (work_order_id) REFERENCES upa_work_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('[091] Creando índices...');
    // IF NOT EXISTS disponible en MySQL 8.0.29+ — en versiones anteriores, ignorar error 1061
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_upa_wo_vehicle ON upa_work_orders(vehicle_id)',
      'CREATE INDEX IF NOT EXISTS idx_upa_wo_status  ON upa_work_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_upa_task_wo    ON upa_work_order_tasks(work_order_id)',
    ];
    for (const idx of indexes) {
      try {
        await connection.execute(idx);
      } catch (e) {
        if (e.errno === 1061) {
          console.log(`[091]   índice ya existe — omitido (${e.sqlMessage})`);
        } else {
          throw e;
        }
      }
    }

    await connection.commit();
    console.log('[091] ✅ Migración aplicada exitosamente.');
    console.log('[091]    Tablas: upa_work_orders, upa_work_order_tasks');
  } catch (err) {
    await connection.rollback();
    console.error('[091] ❌ Falló — rollback ejecutado.', err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

runMigration();
