import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import db from '../services/db';

async function seed() {
  console.log('🔱 Archon Maintenance Relational Migrator starting...');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Create maintenance_tasks table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_tasks (
        code VARCHAR(50) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        is_critical TINYINT(1) NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 2. Create maintenance_plan_tasks table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_plan_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_type VARCHAR(50) NOT NULL,
        task_code VARCHAR(50) NOT NULL,
        FOREIGN KEY (task_code) REFERENCES maintenance_tasks(code) ON DELETE CASCADE,
        UNIQUE KEY unique_type_task (service_type, task_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 3. Create maintenance_brand_rules table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_brand_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand_id INT NULL,
        fuel_type_id INT NULL,
        service_type VARCHAR(50) NOT NULL,
        task_code VARCHAR(50) NOT NULL,
        FOREIGN KEY (task_code) REFERENCES maintenance_tasks(code) ON DELETE CASCADE,
        UNIQUE KEY unique_brand_fuel_type_task (brand_id, fuel_type_id, service_type, task_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log('Tables created successfully. Inserting tasks...');

    // Tasks Array
    const tasks = [
      // Standard 10K Common
      { code: 'OIL_CHANGE', label: 'Cambio de aceite', is_critical: 1 },
      { code: 'OIL_FILTER', label: 'Cambio de filtro de aceite', is_critical: 1 },
      { code: 'LEVELS_CHECK', label: 'Revisión de niveles', is_critical: 1 },
      { code: 'BRAKES_CHECK', label: 'Revisión de frenos', is_critical: 1 },
      { code: 'SUSPENSION_CHECK', label: 'Revisión de suspensión', is_critical: 1 },
      { code: 'BATTERY_CHECK', label: 'Revisión de batería', is_critical: 0 },
      { code: 'TIRES_CHECK', label: 'Revisión de llantas', is_critical: 1 },
      { code: 'TIRE_ROTATION', label: 'Rotación de neumáticos', is_critical: 0 },
      { code: 'BASIC_SCAN', label: 'Escaneo básico', is_critical: 0 },
      // Standard 10K Brand Specific
      { code: 'BASIC_WASH', label: 'Lavado básico de vehículo', is_critical: 0 },
      { code: 'STRICT_PREVENTIVE_INSPECT', label: 'Inspección preventiva más estricta', is_critical: 1 },
      { code: 'FLEET_ECONOMY_FOCUS', label: 'Énfasis en mantenimiento económico de flotilla', is_critical: 0 },
      { code: 'VITAL_POINTS_INSPECT', label: 'Inspección de puntos vitales del vehículo', is_critical: 1 },
      { code: 'CHASSIS_CARGO_INSPECT', label: 'Inspección de chasis y componentes de carga', is_critical: 1 },

      // Standard 20K Common
      { code: 'AIR_FILTER_CHANGE', label: 'Cambio de filtro de aire', is_critical: 1 },
      { code: 'CABIN_FILTER_CHANGE', label: 'Cambio de filtro de cabina', is_critical: 0 },
      { code: 'BRAKES_CLEANING', label: 'Limpieza de frenos', is_critical: 1 },
      { code: 'BELTS_HOSES_CHECK', label: 'Revisión de bandas y mangueras', is_critical: 1 },
      { code: 'COOLING_SYSTEM_CHECK', label: 'Revisión del sistema de enfriamiento', is_critical: 1 },
      // Standard 20K Brand Specific
      { code: 'PREVENTIVE_SECURITY_INSPECT', label: 'Inspección de seguridad preventiva', is_critical: 1 },
      { code: 'URBAN_DELIVERY_ADJUST', label: 'Ajustes orientados a uso urbano/reparto', is_critical: 0 },
      { code: 'CVT_COMPONENTS_CHECK', label: 'Revisión de componentes CVT', is_critical: 1 },
      { code: 'ELECTRICAL_BODY_CHECK', label: 'Revisión de sistema eléctrico y carrocería', is_critical: 0 },
      { code: 'AXLES_CARGO_INSPECT', label: 'Inspección de ejes y componentes de carga', is_critical: 1 },

      // Standard 30K Common
      { code: 'INJECTORS_CLEANING', label: 'Limpieza de inyectores', is_critical: 1 },
      { code: 'THROTTLE_BODY_CLEANING', label: 'Limpieza de cuerpo de aceleración', is_critical: 1 },
      { code: 'BRAKE_FLUID_CHANGE', label: 'Cambio de líquido de frenos', is_critical: 1 },
      { code: 'DEEP_SUSPENSION_CHECK', label: 'Revisión profunda de suspensión', is_critical: 1 },
      { code: 'TRANSMISSION_CHECK', label: 'Revisión de transmisión', is_critical: 1 },
      { code: 'LIGHT_TUNEUP', label: 'Afinación ligera', is_critical: 1 },
      { code: 'SPARK_PLUGS_CHANGE', label: 'Cambio de bujías', is_critical: 1 },
      // Standard 30K Brand Specific
      { code: 'ELECTRICAL_SYSTEM_CHECK', label: 'Revisión de sistema eléctrico', is_critical: 0 },
      { code: 'DEEP_STEERING_FUEL_CHECK', label: 'Revisión profunda de dirección y combustible', is_critical: 1 },
      { code: 'CVT_DEEP_FOCUS', label: 'Mayor enfoque en revisión CVT', is_critical: 1 },
      { code: 'STEERING_HEAVY_USE_FOCUS', label: 'Mayor enfoque en dirección y uso rudo', is_critical: 1 },
      { code: 'DEEP_DIFF_HEAVY_CARGO_CHECK', label: 'Revisión profunda de diferencial y carga pesada', is_critical: 1 },

      // Standard 50K Common
      { code: 'COOLANT_CHANGE', label: 'Cambio de anticongelante', is_critical: 1 },
      { code: 'TRANSMISSION_CVT_SERVICE', label: 'Servicio de transmisión/CVT', is_critical: 1 },
      { code: 'DEEP_SUSPENSION_CHECK_ADV', label: 'Revisión profunda de suspensión', is_critical: 1 },
      { code: 'FUEL_SYSTEM_CHECK', label: 'Revisión de sistema de combustible', is_critical: 1 },
      // Standard 50K Brand Specific
      { code: 'SHOCK_ABSORBERS_CHECK', label: 'Revisión de amortiguadores', is_critical: 1 },
      { code: 'SUV_PICKUPS_DIFF_CHECK', label: 'Revisión de diferencial en SUV/pickups', is_critical: 1 },
      { code: 'ELECTRONIC_HYDRAULIC_STEERING_CHECK', label: 'Revisión de dirección electrónica/hidráulica', is_critical: 1 },
      { code: 'OFFROAD_DIFF_COMPONENTS_INSPECT', label: 'Inspección de diferenciales y componentes off-road', is_critical: 1 },
      { code: 'TOWING_CHASSIS_HEAVY_DIFF_CHECK', label: 'Revisión de remolque, chasis y diferenciales pesados', is_critical: 1 },

      // Mining Specific Tasks
      { code: 'OIL_CHANGE_MINING', label: 'Cambio de aceite de motor', is_critical: 1 },
      { code: 'OIL_FILTER_MINING', label: 'Reemplazo de filtro de aceite', is_critical: 1 },
      { code: 'AIR_FILTER_MINING', label: 'Reemplazo de filtro de aire', is_critical: 1 },
      { code: 'FUEL_FILTER_MINING', label: 'Reemplazo de filtro de combustible', is_critical: 1 },
      { code: 'CABIN_FILTER_MINING', label: 'Reemplazo de filtro de cabina', is_critical: 0 },
      { code: 'WATER_SEPARATOR_MINING', label: 'Reemplazo de filtro separador de agua', is_critical: 1 },
    ];

    for (const t of tasks) {
      await conn.execute(
        `INSERT INTO maintenance_tasks (code, label, is_critical) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE label = VALUES(label), is_critical = VALUES(is_critical)`,
        [t.code, t.label, t.is_critical]
      );
    }

    // Standard Plan Mapping (Common Tasks per Milestone)
    const planMappings = [
      // 10K Básico
      { service_type: 'BASIC_10K', task_code: 'OIL_CHANGE' },
      { service_type: 'BASIC_10K', task_code: 'OIL_FILTER' },
      { service_type: 'BASIC_10K', task_code: 'LEVELS_CHECK' },
      { service_type: 'BASIC_10K', task_code: 'BRAKES_CHECK' },
      { service_type: 'BASIC_10K', task_code: 'SUSPENSION_CHECK' },
      { service_type: 'BASIC_10K', task_code: 'BATTERY_CHECK' },
      { service_type: 'BASIC_10K', task_code: 'TIRES_CHECK' },
      { service_type: 'BASIC_10K', task_code: 'TIRE_ROTATION' },
      { service_type: 'BASIC_10K', task_code: 'BASIC_SCAN' },

      // 20K Intermedio
      { service_type: 'INTERMEDIATE_20K', task_code: 'AIR_FILTER_CHANGE' },
      { service_type: 'INTERMEDIATE_20K', task_code: 'CABIN_FILTER_CHANGE' },
      { service_type: 'INTERMEDIATE_20K', task_code: 'BRAKES_CLEANING' },
      { service_type: 'INTERMEDIATE_20K', task_code: 'BELTS_HOSES_CHECK' },
      { service_type: 'INTERMEDIATE_20K', task_code: 'COOLING_SYSTEM_CHECK' },

      // 30K Mayor
      { service_type: 'MAJOR_30K', task_code: 'INJECTORS_CLEANING' },
      { service_type: 'MAJOR_30K', task_code: 'THROTTLE_BODY_CLEANING' },
      { service_type: 'MAJOR_30K', task_code: 'BRAKE_FLUID_CHANGE' },
      { service_type: 'MAJOR_30K', task_code: 'DEEP_SUSPENSION_CHECK' },
      { service_type: 'MAJOR_30K', task_code: 'TRANSMISSION_CHECK' },
      { service_type: 'MAJOR_30K', task_code: 'LIGHT_TUNEUP' },
      { service_type: 'MAJOR_30K', task_code: 'SPARK_PLUGS_CHANGE' },

      // 50K Avanzado
      { service_type: 'ADVANCED_50K', task_code: 'COOLANT_CHANGE' },
      { service_type: 'ADVANCED_50K', task_code: 'TRANSMISSION_CVT_SERVICE' },
      { service_type: 'ADVANCED_50K', task_code: 'DEEP_SUSPENSION_CHECK_ADV' },
      { service_type: 'ADVANCED_50K', task_code: 'FUEL_SYSTEM_CHECK' },

      // Mining Common
      { service_type: 'MINOR_MINING', task_code: 'OIL_CHANGE_MINING' },
      { service_type: 'MINOR_MINING', task_code: 'OIL_FILTER_MINING' },
      { service_type: 'MINOR_MINING', task_code: 'AIR_FILTER_MINING' },
      { service_type: 'MINOR_MINING', task_code: 'FUEL_FILTER_MINING' },
    ];

    for (const pm of planMappings) {
      await conn.execute(
        `INSERT INTO maintenance_plan_tasks (service_type, task_code) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE service_type = VALUES(service_type)`,
        [pm.service_type, pm.task_code]
      );
    }

    // Brand Specific Rules (Standard & Mining)
    // Brands: 23 = Nissan, 253 = Toyota, 33 = RAM, 35 = Mitsubishi, 37 = KIA
    // Fuel: 10 = Diésel, 11 = Gasolina
    const brandRules = [
      // 10K Brand rules
      { brand_id: 23, fuel_type_id: null, service_type: 'BASIC_10K', task_code: 'BASIC_WASH' },
      { brand_id: 253, fuel_type_id: null, service_type: 'BASIC_10K', task_code: 'STRICT_PREVENTIVE_INSPECT' },
      { brand_id: 37, fuel_type_id: null, service_type: 'BASIC_10K', task_code: 'FLEET_ECONOMY_FOCUS' },
      { brand_id: 35, fuel_type_id: null, service_type: 'BASIC_10K', task_code: 'VITAL_POINTS_INSPECT' },
      { brand_id: 33, fuel_type_id: null, service_type: 'BASIC_10K', task_code: 'CHASSIS_CARGO_INSPECT' },

      // 20K Brand rules
      { brand_id: 253, fuel_type_id: null, service_type: 'INTERMEDIATE_20K', task_code: 'PREVENTIVE_SECURITY_INSPECT' },
      { brand_id: 37, fuel_type_id: null, service_type: 'INTERMEDIATE_20K', task_code: 'URBAN_DELIVERY_ADJUST' },
      { brand_id: 23, fuel_type_id: null, service_type: 'INTERMEDIATE_20K', task_code: 'CVT_COMPONENTS_CHECK' },
      { brand_id: 35, fuel_type_id: null, service_type: 'INTERMEDIATE_20K', task_code: 'ELECTRICAL_BODY_CHECK' },
      { brand_id: 33, fuel_type_id: null, service_type: 'INTERMEDIATE_20K', task_code: 'AXLES_CARGO_INSPECT' },

      // 30K Brand rules
      { brand_id: 37, fuel_type_id: null, service_type: 'MAJOR_30K', task_code: 'ELECTRICAL_SYSTEM_CHECK' },
      { brand_id: 253, fuel_type_id: null, service_type: 'MAJOR_30K', task_code: 'DEEP_STEERING_FUEL_CHECK' },
      { brand_id: 23, fuel_type_id: null, service_type: 'MAJOR_30K', task_code: 'CVT_DEEP_FOCUS' },
      { brand_id: 35, fuel_type_id: null, service_type: 'MAJOR_30K', task_code: 'STEERING_HEAVY_USE_FOCUS' },
      { brand_id: 33, fuel_type_id: null, service_type: 'MAJOR_30K', task_code: 'DEEP_DIFF_HEAVY_CARGO_CHECK' },

      // 50K Brand rules
      { brand_id: 23, fuel_type_id: null, service_type: 'ADVANCED_50K', task_code: 'SHOCK_ABSORBERS_CHECK' },
      { brand_id: 253, fuel_type_id: null, service_type: 'ADVANCED_50K', task_code: 'SUV_PICKUPS_DIFF_CHECK' },
      { brand_id: 37, fuel_type_id: null, service_type: 'ADVANCED_50K', task_code: 'ELECTRONIC_HYDRAULIC_STEERING_CHECK' },
      { brand_id: 35, fuel_type_id: null, service_type: 'ADVANCED_50K', task_code: 'OFFROAD_DIFF_COMPONENTS_INSPECT' },
      { brand_id: 33, fuel_type_id: null, service_type: 'ADVANCED_50K', task_code: 'TOWING_CHASSIS_HEAVY_DIFF_CHECK' },

      // Mining Fuel Specific rules (Gasolina vs Diesel)
      { brand_id: null, fuel_type_id: 11, service_type: 'MINOR_MINING', task_code: 'CABIN_FILTER_MINING' },
      { brand_id: null, fuel_type_id: 10, service_type: 'MINOR_MINING', task_code: 'WATER_SEPARATOR_MINING' },
    ];

    for (const br of brandRules) {
      await conn.execute(
        `INSERT INTO maintenance_brand_rules (brand_id, fuel_type_id, service_type, task_code) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE task_code = VALUES(task_code)`,
        [br.brand_id, br.fuel_type_id, br.service_type, br.task_code]
      );
    }

    await conn.commit();
    console.log('🔱 Archon Maintenance Relational Migrator completed successfully!');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    conn.release();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
