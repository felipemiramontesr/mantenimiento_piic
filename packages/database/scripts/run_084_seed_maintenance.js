const mysql = require('mysql2/promise');

const tasks = [
  { code: 'OIL_CHANGE', label: 'Cambio de aceite', is_critical: true },
  { code: 'OIL_FILTER', label: 'Cambio de filtro de aceite', is_critical: true },
  { code: 'LEVELS_CHECK', label: 'Revisión de niveles', is_critical: false },
  { code: 'BRAKES_CHECK', label: 'Revisión de frenos', is_critical: true },
  { code: 'SUSPENSION_CHECK', label: 'Revisión de suspensión', is_critical: true },
  { code: 'BATTERY_CHECK', label: 'Revisión de batería', is_critical: false },
  { code: 'TIRES_CHECK', label: 'Revisión de llantas', is_critical: true },
  { code: 'TIRE_ROTATION', label: 'Rotación de neumáticos', is_critical: false },
  { code: 'BASIC_SCAN', label: 'Escaneo básico', is_critical: false },
  { code: 'AIR_FILTER_CHANGE', label: 'Cambio de filtro de aire', is_critical: true },
  { code: 'CABIN_FILTER_CHANGE', label: 'Cambio de filtro de cabina', is_critical: false },
  { code: 'BRAKES_CLEANING', label: 'Limpieza de frenos', is_critical: false },
  { code: 'BELTS_HOSES_CHECK', label: 'Revisión de bandas y mangueras', is_critical: true },
  { code: 'COOLING_SYSTEM_CHECK', label: 'Revisión del sistema de enfriamiento', is_critical: true },
  { code: 'INJECTORS_CLEANING', label: 'Limpieza de inyectores', is_critical: false },
  { code: 'THROTTLE_BODY_CLEANING', label: 'Limpieza de cuerpo de aceleración', is_critical: false },
  { code: 'BRAKE_FLUID_CHANGE', label: 'Cambio de líquido de frenos', is_critical: true },
  { code: 'DEEP_SUSPENSION_CHECK', label: 'Revisión profunda de suspensión', is_critical: true },
  { code: 'TRANSMISSION_CHECK', label: 'Revisión de transmisión', is_critical: true },
  { code: 'LIGHT_TUNEUP', label: 'Afinación ligera', is_critical: true },
  { code: 'SPARK_PLUGS_CHANGE', label: 'Cambio de bujías', is_critical: true },
  { code: 'COOLANT_CHANGE', label: 'Cambio de anticongelante', is_critical: true },
  { code: 'TRANSMISSION_CVT_SERVICE', label: 'Servicio de transmisión/CVT', is_critical: true },
  { code: 'DEEP_SUSPENSION_CHECK_ADV', label: 'Revisión profunda de suspensión', is_critical: true },
  { code: 'FUEL_SYSTEM_CHECK', label: 'Revisión de sistema de combustible', is_critical: true },
  { code: 'BASIC_WASH', label: 'Lavado básico de vehículo', is_critical: false },
  { code: 'STRICT_PREVENTIVE_INSPECT', label: 'Inspección preventiva más estricta', is_critical: false },
  { code: 'FLEET_ECONOMY_FOCUS', label: 'Énfasis en mantenimiento económico de flotilla', is_critical: false },
  { code: 'VITAL_POINTS_INSPECT', label: 'Inspección de puntos vitales del vehículo', is_critical: false },
  { code: 'CHASSIS_CARGO_INSPECT', label: 'Inspección de chasis y componentes de carga', is_critical: true },
  { code: 'CVT_COMPONENTS_CHECK', label: 'Revisión de componentes CVT', is_critical: true },
  { code: 'PREVENTIVE_SECURITY_INSPECT', label: 'Inspección de seguridad preventiva', is_critical: true },
  { code: 'URBAN_DELIVERY_ADJUST', label: 'Ajustes orientados a uso urbano/reparto', is_critical: false },
  { code: 'ELECTRICAL_BODY_CHECK', label: 'Revisión de sistema eléctrico y carrocería', is_critical: false },
  { code: 'AXLES_CARGO_INSPECT', label: 'Inspección de ejes y componentes de carga', is_critical: true },
  { code: 'CVT_DEEP_FOCUS', label: 'Mayor enfoque en revisión CVT', is_critical: true },
  { code: 'DEEP_STEERING_FUEL_CHECK', label: 'Revisión profunda de dirección y combustible', is_critical: true },
  { code: 'ELECTRICAL_SYSTEM_CHECK', label: 'Revisión de sistema eléctrico', is_critical: false },
  { code: 'STEERING_HEAVY_USE_FOCUS', label: 'Mayor enfoque en dirección y uso rudo', is_critical: true },
  { code: 'DEEP_DIFF_HEAVY_CARGO_CHECK', label: 'Revisión profunda de diferencial y carga pesada', is_critical: true },
  { code: 'SHOCK_ABSORBERS_CHECK', label: 'Revisión de amortiguadores', is_critical: true },
  { code: 'SUV_PICKUPS_DIFF_CHECK', label: 'Revisión de diferencial en SUV/pickups', is_critical: true },
  { code: 'ELECTRONIC_HYDRAULIC_STEERING_CHECK', label: 'Revisión de dirección electrónica/hidráulica', is_critical: true },
  { code: 'OFFROAD_DIFF_COMPONENTS_INSPECT', label: 'Inspección de diferenciales y componentes off-road', is_critical: true },
  { code: 'TOWING_CHASSIS_HEAVY_DIFF_CHECK', label: 'Revisión de remolque, chasis y diferenciales pesados', is_critical: true }
];

const planTasks = [
  { service_type: 'BASIC_10K', task_code: 'OIL_CHANGE' },
  { service_type: 'BASIC_10K', task_code: 'OIL_FILTER' },
  { service_type: 'BASIC_10K', task_code: 'LEVELS_CHECK' },
  { service_type: 'BASIC_10K', task_code: 'BRAKES_CHECK' },
  { service_type: 'BASIC_10K', task_code: 'SUSPENSION_CHECK' },
  { service_type: 'BASIC_10K', task_code: 'BATTERY_CHECK' },
  { service_type: 'BASIC_10K', task_code: 'TIRES_CHECK' },
  { service_type: 'BASIC_10K', task_code: 'TIRE_ROTATION' },
  { service_type: 'BASIC_10K', task_code: 'BASIC_SCAN' },
  { service_type: 'INTERMEDIATE_20K', task_code: 'AIR_FILTER_CHANGE' },
  { service_type: 'INTERMEDIATE_20K', task_code: 'CABIN_FILTER_CHANGE' },
  { service_type: 'INTERMEDIATE_20K', task_code: 'BRAKES_CLEANING' },
  { service_type: 'INTERMEDIATE_20K', task_code: 'BELTS_HOSES_CHECK' },
  { service_type: 'INTERMEDIATE_20K', task_code: 'COOLING_SYSTEM_CHECK' },
  { service_type: 'MAJOR_30K', task_code: 'INJECTORS_CLEANING' },
  { service_type: 'MAJOR_30K', task_code: 'THROTTLE_BODY_CLEANING' },
  { service_type: 'MAJOR_30K', task_code: 'BRAKE_FLUID_CHANGE' },
  { service_type: 'MAJOR_30K', task_code: 'DEEP_SUSPENSION_CHECK' },
  { service_type: 'MAJOR_30K', task_code: 'TRANSMISSION_CHECK' },
  { service_type: 'MAJOR_30K', task_code: 'LIGHT_TUNEUP' },
  { service_type: 'MAJOR_30K', task_code: 'SPARK_PLUGS_CHANGE' },
  { service_type: 'ADVANCED_50K', task_code: 'COOLANT_CHANGE' },
  { service_type: 'ADVANCED_50K', task_code: 'TRANSMISSION_CVT_SERVICE' },
  { service_type: 'ADVANCED_50K', task_code: 'DEEP_SUSPENSION_CHECK_ADV' },
  { service_type: 'ADVANCED_50K', task_code: 'FUEL_SYSTEM_CHECK' }
];

const brandRules = [
  { brand_id: 23, service_type: 'BASIC_10K', task_code: 'BASIC_WASH' },
  { brand_id: 23, service_type: 'INTERMEDIATE_20K', task_code: 'CVT_COMPONENTS_CHECK' },
  { brand_id: 23, service_type: 'MAJOR_30K', task_code: 'CVT_DEEP_FOCUS' },
  { brand_id: 23, service_type: 'ADVANCED_50K', task_code: 'SHOCK_ABSORBERS_CHECK' },
  { brand_id: 253, service_type: 'BASIC_10K', task_code: 'STRICT_PREVENTIVE_INSPECT' },
  { brand_id: 253, service_type: 'INTERMEDIATE_20K', task_code: 'PREVENTIVE_SECURITY_INSPECT' },
  { brand_id: 253, service_type: 'MAJOR_30K', task_code: 'DEEP_STEERING_FUEL_CHECK' },
  { brand_id: 253, service_type: 'ADVANCED_50K', task_code: 'SUV_PICKUPS_DIFF_CHECK' },
  { brand_id: 37, service_type: 'BASIC_10K', task_code: 'FLEET_ECONOMY_FOCUS' },
  { brand_id: 37, service_type: 'INTERMEDIATE_20K', task_code: 'URBAN_DELIVERY_ADJUST' },
  { brand_id: 37, service_type: 'MAJOR_30K', task_code: 'ELECTRICAL_SYSTEM_CHECK' },
  { brand_id: 37, service_type: 'ADVANCED_50K', task_code: 'ELECTRONIC_HYDRAULIC_STEERING_CHECK' },
  { brand_id: 35, service_type: 'BASIC_10K', task_code: 'VITAL_POINTS_INSPECT' },
  { brand_id: 35, service_type: 'INTERMEDIATE_20K', task_code: 'ELECTRICAL_BODY_CHECK' },
  { brand_id: 35, service_type: 'MAJOR_30K', task_code: 'STEERING_HEAVY_USE_FOCUS' },
  { brand_id: 35, service_type: 'ADVANCED_50K', task_code: 'OFFROAD_DIFF_COMPONENTS_INSPECT' },
  { brand_id: 33, service_type: 'BASIC_10K', task_code: 'CHASSIS_CARGO_INSPECT' },
  { brand_id: 33, service_type: 'INTERMEDIATE_20K', task_code: 'AXLES_CARGO_INSPECT' },
  { brand_id: 33, service_type: 'MAJOR_30K', task_code: 'DEEP_DIFF_HEAVY_CARGO_CHECK' },
  { brand_id: 33, service_type: 'ADVANCED_50K', task_code: 'TOWING_CHASSIS_HEAVY_DIFF_CHECK' }
];

async function seed() {
  const pool = mysql.createPool({ host: '127.0.0.1', user: 'root', password: '', database: 'archon' });
  try {
    for (const t of tasks) {
      await pool.execute(
        'INSERT INTO maintenance_tasks (code, label, is_critical) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE label = ?, is_critical = ?',
        [t.code, t.label, t.is_critical, t.label, t.is_critical]
      );
    }
    console.log("Tasks inserted.");

    for (const p of planTasks) {
      await pool.execute(
        'INSERT IGNORE INTO maintenance_plan_tasks (service_type, task_code) VALUES (?, ?)',
        [p.service_type, p.task_code]
      );
    }
    console.log("Plan tasks inserted.");

    for (const b of brandRules) {
      await pool.execute(
        'INSERT IGNORE INTO maintenance_brand_rules (brand_id, fuel_type_id, service_type, task_code) VALUES (?, NULL, ?, ?)',
        [b.brand_id, b.service_type, b.task_code]
      );
    }
    console.log("Brand rules inserted.");

  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
seed();
