const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function runMigration() {
  console.log('Connecting to DB...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archon',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Create catalog table
    console.log('Creating maintenance_task_statuses...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_task_statuses (
        code  VARCHAR(50)  NOT NULL,
        label VARCHAR(100) NOT NULL,
        PRIMARY KEY (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    // 2. Seed base statuses
    console.log('Seeding maintenance_task_statuses...');
    await connection.execute(`
      INSERT INTO maintenance_task_statuses (code, label) VALUES
        ('PASS',       'Correcto / Sin novedad'),
        ('FAIL',       'Falla detectada'),
        ('REPLACED',   'Componente reemplazado'),
        ('N_A',        'No aplica'),
        ('SKIPPED_NA', 'Omitido — no aplica para esta unidad'),
        ('DEFERRED',   'Diferido — pendiente para próxima orden')
      ON DUPLICATE KEY UPDATE label = VALUES(label)
    `);

    // 3. Add status_code column (nullable for the copy step)
    console.log('Adding status_code column to fleet_maintenance_details...');
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'fleet_maintenance_details'
        AND COLUMN_NAME  = 'status_code'
    `);
    if (cols.length === 0) {
      await connection.execute(`
        ALTER TABLE fleet_maintenance_details
          ADD COLUMN status_code VARCHAR(50) NULL AFTER task_code
      `);
    }

    // 4. Copy existing ENUM values into status_code
    console.log('Migrating existing status data → status_code...');
    await connection.execute(`
      UPDATE fleet_maintenance_details
      SET status_code = status
      WHERE status_code IS NULL
    `);

    // 5. Make status_code NOT NULL + add FK
    console.log('Enforcing NOT NULL and FK on status_code...');
    const [fkRows] = await connection.execute(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA    = DATABASE()
        AND TABLE_NAME      = 'fleet_maintenance_details'
        AND COLUMN_NAME     = 'status_code'
        AND CONSTRAINT_NAME != 'PRIMARY'
    `);
    if (fkRows.length === 0) {
      await connection.execute(`
        ALTER TABLE fleet_maintenance_details
          MODIFY COLUMN status_code VARCHAR(50) NOT NULL,
          ADD CONSTRAINT fk_fmd_status
            FOREIGN KEY (status_code) REFERENCES maintenance_task_statuses(code)
      `);
    }

    // 6. Drop legacy ENUM column
    console.log('Dropping legacy status column...');
    const [oldCol] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'fleet_maintenance_details'
        AND COLUMN_NAME  = 'status'
    `);
    if (oldCol.length > 0) {
      await connection.execute(`
        ALTER TABLE fleet_maintenance_details DROP COLUMN status
      `);
    }

    await connection.commit();
    console.log('✅ Migration 085 applied successfully.');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Migration 085 failed — rolled back.', err);
    process.exit(1);
  } finally {
    connection.release();
    pool.end();
  }
}

runMigration();
