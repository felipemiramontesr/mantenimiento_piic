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

    console.log('Creating fleet_maintenance_logs...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS fleet_maintenance_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        unit_id VARCHAR(50) NOT NULL,
        service_date DATE NOT NULL,
        odometer_at_service DECIMAL(12,2) NOT NULL,
        service_type ENUM('BASIC_10K', 'INTERMEDIATE_20K', 'MAJOR_30K', 'ADVANCED_50K', 'MINOR_MINING') NOT NULL,
        cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        technician VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_maint_cursor (created_at DESC, id DESC),
        INDEX idx_maint_unit (unit_id, service_date DESC),
        CONSTRAINT fk_maintenance_unit FOREIGN KEY (unit_id) REFERENCES fleet_units(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log('Creating fleet_maintenance_details...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS fleet_maintenance_details (
        maintenance_id INT NOT NULL,
        task_code VARCHAR(50) NOT NULL COMMENT 'e.g. FILTER_OIL, CVT_CHECK, WATER_SEP',
        status ENUM('PASS', 'FAIL', 'REPLACED', 'N_A') NOT NULL,
        notes VARCHAR(255) NULL,
        PRIMARY KEY (maintenance_id, task_code),
        CONSTRAINT fk_maint_detail FOREIGN KEY (maintenance_id) 
            REFERENCES fleet_maintenance_logs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log('Adding nextServiceReading_forecast column to fleet_units if not exists...');
    const [cols] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'fleet_units' 
      AND COLUMN_NAME = 'nextServiceReading_forecast'
    `);

    if (cols.length === 0) {
      console.log('Column does not exist. Adding column...');
      await connection.execute(`
        ALTER TABLE fleet_units ADD COLUMN nextServiceReading_forecast DECIMAL(12,2) NULL;
      `);
    } else {
      console.log('Column nextServiceReading_forecast already exists.');
    }

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
