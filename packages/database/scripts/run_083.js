const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function runMigration() {
  console.log('Connecting to DB...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archon',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  const connection = await pool.getConnection();

  try {
    console.log('Starting migration transaction...');
    await connection.beginTransaction();

    console.log('Adding last_chassis_inspection_odometer column to fleet_units if not exists...');
    const [colsChassis] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'fleet_units' 
      AND COLUMN_NAME = 'last_chassis_inspection_odometer'
    `);

    if (colsChassis.length === 0) {
      console.log('Column last_chassis_inspection_odometer does not exist. Adding...');
      await connection.execute(`
        ALTER TABLE fleet_units ADD COLUMN last_chassis_inspection_odometer INT NOT NULL DEFAULT 0;
      `);
    } else {
      console.log('Column last_chassis_inspection_odometer already exists.');
    }

    console.log('Adding last_distribution_change_odometer column to fleet_units if not exists...');
    const [colsDist] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'fleet_units' 
      AND COLUMN_NAME = 'last_distribution_change_odometer'
    `);

    if (colsDist.length === 0) {
      console.log('Column last_distribution_change_odometer does not exist. Adding...');
      await connection.execute(`
        ALTER TABLE fleet_units ADD COLUMN last_distribution_change_odometer INT NOT NULL DEFAULT 0;
      `);
    } else {
      console.log('Column last_distribution_change_odometer already exists.');
    }

    console.log('Seeding predictive tasks into maintenance_tasks table...');
    await connection.execute(`
      INSERT INTO maintenance_tasks (code, label, is_critical) VALUES 
        ('CHASSIS_SHOCKS_HEAVY', 'Inspección de chasis pesado y amortiguadores (Alerta Predictiva Delta)', 1),
        ('DISTRIBUTION_KIT_WATER_PUMP', 'Reemplazo de kit de distribución y bomba de agua (Alerta Predictiva Delta)', 1)
      ON DUPLICATE KEY UPDATE 
        label = VALUES(label), 
        is_critical = VALUES(is_critical);
    `);

    await connection.commit();
    console.log('Migration successfully applied!');
  } catch (err) {
    console.error('Migration failed, rolling back.', err);
    await connection.rollback();
  } finally {
    connection.release();
    pool.end();
  }
}

runMigration();
