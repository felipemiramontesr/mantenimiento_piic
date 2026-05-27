const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'archon',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const PLAN_TASKS = [
  // BASIC_10K — 9 tareas genéricas compartidas
  { service_type: 'BASIC_10K', interval_km: 10000, interval_days: 180, task_code: 'OIL_CHANGE' },
  { service_type: 'BASIC_10K', interval_km: 10000, interval_days: 180, task_code: 'OIL_FILTER' },
  { service_type: 'BASIC_10K', interval_km: 10000, interval_days: 180, task_code: 'LEVELS_CHECK' },
  { service_type: 'BASIC_10K', interval_km: 10000, interval_days: 180, task_code: 'BRAKES_CHECK' },
  {
    service_type: 'BASIC_10K',
    interval_km: 10000,
    interval_days: 180,
    task_code: 'SUSPENSION_CHECK',
  },
  { service_type: 'BASIC_10K', interval_km: 10000, interval_days: 180, task_code: 'BATTERY_CHECK' },
  { service_type: 'BASIC_10K', interval_km: 10000, interval_days: 180, task_code: 'TIRES_CHECK' },
  { service_type: 'BASIC_10K', interval_km: 10000, interval_days: 180, task_code: 'TIRE_ROTATION' },
  { service_type: 'BASIC_10K', interval_km: 10000, interval_days: 180, task_code: 'BASIC_SCAN' },

  // INTERMEDIATE_20K — 5 tareas genéricas
  {
    service_type: 'INTERMEDIATE_20K',
    interval_km: 20000,
    interval_days: 360,
    task_code: 'AIR_FILTER_CHANGE',
  },
  {
    service_type: 'INTERMEDIATE_20K',
    interval_km: 20000,
    interval_days: 360,
    task_code: 'CABIN_FILTER_CHANGE',
  },
  {
    service_type: 'INTERMEDIATE_20K',
    interval_km: 20000,
    interval_days: 360,
    task_code: 'BRAKES_CLEANING',
  },
  {
    service_type: 'INTERMEDIATE_20K',
    interval_km: 20000,
    interval_days: 360,
    task_code: 'BELTS_HOSES_CHECK',
  },
  {
    service_type: 'INTERMEDIATE_20K',
    interval_km: 20000,
    interval_days: 360,
    task_code: 'COOLING_SYSTEM_CHECK',
  },

  // MAJOR_30K — 7 tareas genéricas
  {
    service_type: 'MAJOR_30K',
    interval_km: 30000,
    interval_days: 540,
    task_code: 'INJECTORS_CLEANING',
  },
  {
    service_type: 'MAJOR_30K',
    interval_km: 30000,
    interval_days: 540,
    task_code: 'THROTTLE_BODY_CLEANING',
  },
  {
    service_type: 'MAJOR_30K',
    interval_km: 30000,
    interval_days: 540,
    task_code: 'BRAKE_FLUID_CHANGE',
  },
  {
    service_type: 'MAJOR_30K',
    interval_km: 30000,
    interval_days: 540,
    task_code: 'DEEP_SUSPENSION_CHECK',
  },
  {
    service_type: 'MAJOR_30K',
    interval_km: 30000,
    interval_days: 540,
    task_code: 'TRANSMISSION_CHECK',
  },
  { service_type: 'MAJOR_30K', interval_km: 30000, interval_days: 540, task_code: 'LIGHT_TUNEUP' },
  {
    service_type: 'MAJOR_30K',
    interval_km: 30000,
    interval_days: 540,
    task_code: 'SPARK_PLUGS_CHANGE',
  },

  // ADVANCED_50K — 4 tareas genéricas
  {
    service_type: 'ADVANCED_50K',
    interval_km: 50000,
    interval_days: 900,
    task_code: 'COOLANT_CHANGE',
  },
  {
    service_type: 'ADVANCED_50K',
    interval_km: 50000,
    interval_days: 900,
    task_code: 'TRANSMISSION_CVT_SERVICE',
  },
  {
    service_type: 'ADVANCED_50K',
    interval_km: 50000,
    interval_days: 900,
    task_code: 'DEEP_SUSPENSION_CHECK',
  },
  {
    service_type: 'ADVANCED_50K',
    interval_km: 50000,
    interval_days: 900,
    task_code: 'FUEL_SYSTEM_CHECK',
  },

  // MINOR_MINING — 4 comunes + 2 dependientes de combustible (filtradas a nivel app)
  {
    service_type: 'MINOR_MINING',
    interval_km: 5000,
    interval_days: 90,
    task_code: 'OIL_CHANGE_MINING',
  },
  {
    service_type: 'MINOR_MINING',
    interval_km: 5000,
    interval_days: 90,
    task_code: 'OIL_FILTER_MINING',
  },
  {
    service_type: 'MINOR_MINING',
    interval_km: 5000,
    interval_days: 90,
    task_code: 'AIR_FILTER_MINING',
  },
  {
    service_type: 'MINOR_MINING',
    interval_km: 5000,
    interval_days: 90,
    task_code: 'FUEL_FILTER_MINING',
  },
  {
    service_type: 'MINOR_MINING',
    interval_km: 5000,
    interval_days: 90,
    task_code: 'CABIN_FILTER_MINING',
  }, // Gasolina — app-level filter
  {
    service_type: 'MINOR_MINING',
    interval_km: 5000,
    interval_days: 90,
    task_code: 'WATER_SEPARATOR_MINING',
  }, // Diésel   — app-level filter
];

const BRAND_RULES = [
  // Nissan — brand_id: 23
  { brand_id: 23, service_type: 'BASIC_10K', task_code: 'BASIC_WASH' },
  { brand_id: 23, service_type: 'INTERMEDIATE_20K', task_code: 'PREVENTIVE_SECURITY_INSPECT' },
  { brand_id: 23, service_type: 'MAJOR_30K', task_code: 'ELECTRICAL_BODY_CHECK' },
  { brand_id: 23, service_type: 'ADVANCED_50K', task_code: 'SHOCK_ABSORBERS_CHECK' },

  // Toyota — brand_id: 253
  { brand_id: 253, service_type: 'BASIC_10K', task_code: 'STRICT_PREVENTIVE_INSPECT' },
  { brand_id: 253, service_type: 'INTERMEDIATE_20K', task_code: 'URBAN_DELIVERY_ADJUST' },
  { brand_id: 253, service_type: 'MAJOR_30K', task_code: 'DEEP_STEERING_FUEL_CHECK' },
  { brand_id: 253, service_type: 'ADVANCED_50K', task_code: 'SUV_PICKUPS_DIFF_CHECK' },

  // Chevrolet — brand_id: 37
  { brand_id: 37, service_type: 'BASIC_10K', task_code: 'FLEET_ECONOMY_FOCUS' },
  { brand_id: 37, service_type: 'INTERMEDIATE_20K', task_code: 'CVT_COMPONENTS_CHECK' },
  { brand_id: 37, service_type: 'MAJOR_30K', task_code: 'CVT_DEEP_FOCUS' },
  { brand_id: 37, service_type: 'ADVANCED_50K', task_code: 'ELECTRONIC_HYDRAULIC_STEERING_CHECK' },

  // Ford / Dodge — brand_id: 35
  { brand_id: 35, service_type: 'BASIC_10K', task_code: 'VITAL_POINTS_INSPECT' },
  { brand_id: 35, service_type: 'INTERMEDIATE_20K', task_code: 'ELECTRICAL_BODY_CHECK_FORD' },
  { brand_id: 35, service_type: 'MAJOR_30K', task_code: 'STEERING_HEAVY_USE_FOCUS' },
  { brand_id: 35, service_type: 'ADVANCED_50K', task_code: 'OFFROAD_DIFF_COMPONENTS_INSPECT' },

  // Isuzu / RAM — brand_id: 33
  { brand_id: 33, service_type: 'BASIC_10K', task_code: 'CHASSIS_CARGO_INSPECT' },
  { brand_id: 33, service_type: 'INTERMEDIATE_20K', task_code: 'AXLES_CARGO_INSPECT' },
  { brand_id: 33, service_type: 'MAJOR_30K', task_code: 'DEEP_DIFF_HEAVY_CARGO_CHECK' },
  { brand_id: 33, service_type: 'ADVANCED_50K', task_code: 'TOWING_CHASSIS_HEAVY_DIFF_CHECK' },
];

// ─── Migration ────────────────────────────────────────────────────────────────

async function runMigration() {
  console.log('[086] Connecting...');
  const pool = mysql.createPool(DB_CONFIG);
  const connection = await pool.getConnection();

  try {
    // ── Phase 1: Schema additions + new task upsert ──────────────────────────
    await connection.beginTransaction();

    console.log('[086] Adding interval columns to maintenance_plan_tasks...');
    for (const col of ['interval_km', 'interval_days']) {
      const [rows] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_plan_tasks'
         AND COLUMN_NAME = ?`,
        [col]
      );
      if (rows.length === 0) {
        await connection.execute(`ALTER TABLE maintenance_plan_tasks ADD COLUMN ${col} INT NULL`);
      }
    }

    console.log('[086] Adding interval columns to maintenance_brand_rules...');
    for (const col of ['interval_km', 'interval_days']) {
      const [rows] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_brand_rules'
         AND COLUMN_NAME = ?`,
        [col]
      );
      if (rows.length === 0) {
        await connection.execute(`ALTER TABLE maintenance_brand_rules ADD COLUMN ${col} INT NULL`);
      }
    }

    console.log('[086] Upserting ELECTRICAL_BODY_CHECK_FORD into maintenance_tasks...');
    await connection.execute(
      `INSERT INTO maintenance_tasks (code, label, is_critical) VALUES
         ('ELECTRICAL_BODY_CHECK_FORD', 'Revisión de sistema eléctrico y carrocería', 0)
       ON DUPLICATE KEY UPDATE label = VALUES(label), is_critical = VALUES(is_critical)`
    );

    await connection.commit();
    console.log('[086] Phase 1 complete.');

    // ── Phase 2: TRUNCATE (DDL — auto-commits, outside transaction) ──────────
    console.log('[086] Truncating catalog tables...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE maintenance_plan_tasks');
    await connection.execute('TRUNCATE TABLE maintenance_brand_rules');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[086] Tables truncated.');

    // ── Phase 3: Re-seed ─────────────────────────────────────────────────────
    await connection.beginTransaction();

    console.log('[086] Seeding maintenance_plan_tasks...');
    for (const row of PLAN_TASKS) {
      await connection.execute(
        `INSERT INTO maintenance_plan_tasks (service_type, task_code, interval_km, interval_days)
         VALUES (?, ?, ?, ?)`,
        [row.service_type, row.task_code, row.interval_km, row.interval_days]
      );
    }
    console.log(`[086]  → ${PLAN_TASKS.length} plan tasks inserted.`);

    console.log('[086] Seeding maintenance_brand_rules...');
    for (const row of BRAND_RULES) {
      await connection.execute(
        `INSERT INTO maintenance_brand_rules (brand_id, fuel_type_id, service_type, task_code)
         VALUES (?, NULL, ?, ?)`,
        [row.brand_id, row.service_type, row.task_code]
      );
    }
    console.log(`[086]  → ${BRAND_RULES.length} brand rules inserted.`);

    await connection.commit();
    console.log('[086] ✅ Migration complete.');
  } catch (err) {
    await connection.rollback();
    console.error('[086] ❌ Migration failed — rolled back.', err);
    process.exit(1);
  } finally {
    connection.release();
    pool.end();
  }
}

runMigration();
