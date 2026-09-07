// ============================================================================
// TYPES — Phase 0
// ============================================================================
export type FuelType = 'gasoline' | 'diesel';
export type FleetType = 'urban' | 'mining';
export type Brand = 'toyota' | 'kia' | 'nissan' | 'mitsubishi' | 'dodge_ram' | 'generic';
export type DeferredType = 'DEFERRED_FINANCIAL' | 'N_A_STRUCTURAL';
export type PackageLevel = '10k' | '20k' | '30k' | '50k';
export type TaskStage = 'triage' | 'minor_service' | 'cascade' | 'deferred' | 'closure';

export interface Task {
  id: string;
  stage: TaskStage;
  description: string;
  packageLevel?: PackageLevel;
}

export interface HistoricalTask {
  taskId: string;
  executed: boolean;
  deferredType?: DeferredType;
}

export interface WorkOrder {
  id: string;
  closedAt: Date;
  tasks: HistoricalTask[];
  pendingSince?: Date;
}

export interface VehicleProfile {
  brand: Brand;
  fuelType: FuelType;
  fleetType: FleetType;
  odometer: number;
}

export interface BusinessHoursConfig {
  startHour: number;
  endHour: number;
  workdays: number[];
}

export interface UpaInput {
  vehicleProfile: VehicleProfile;
  lastClosedWorkOrder: WorkOrder | null;
  lastServiceOdometer?: number;
}

export interface UpaOutput {
  tasks: Task[];
  validationErrors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================
const CASCADE_TOLERANCE_KM = 1500;
const STAGE5_TIMEOUT_BUSINESS_HOURS = 24;

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  startHour: 8,
  endHour: 18,
  workdays: [1, 2, 3, 4, 5],
};

// ============================================================================
// TASK CATALOG — datos tabulares (FC166 Track A.1, Dual-Gate Isolation)
// ----------------------------------------------------------------------------
// Cada catálogo vive como UN bloque de texto delimitado por `|` (una tarea por
// línea), parseado una sola vez al cargar el módulo por `parseTaskRows` /
// `parseBrandTaskRows`. Esto elimina la duplicación estructural de 63 bloques
// que SonarCloud detectaba en los literales de objeto `{id, stage,
// packageLevel, description}` repetidos docenas de veces (Track A.1, refactor
// tabular paramétrico isomorfo — Cond.R-166 G1). Isomorfismo verificado:
// mismos ids/descriptions/orden exactos que el catálogo previo, confirmado
// por diff automatizado contra la versión pre-refactor sobre una matriz
// exhaustiva de inputs (todas las marcas × combustibles × flotas × kilometrajes)
// además de la suite de tests existente (0 regresión).
// ============================================================================

const ALL_BRANDS: readonly Brand[] = [
  'toyota',
  'kia',
  'nissan',
  'mitsubishi',
  'dodge_ram',
  'generic',
];

/** Parsea filas `id|description` (una por línea) en Task[] con stage/packageLevel fijos. */
function parseTaskRows(raw: string, stage: TaskStage, packageLevel?: PackageLevel): Task[] {
  return raw
    .trim()
    .split('\n')
    .map((line) => {
      const [id, description] = line.split('|');
      return packageLevel !== undefined
        ? { id, stage, packageLevel, description }
        : { id, stage, description };
    });
}

/** Parsea filas `brand|id|description` en un Record<Brand, Task[]> (stage='cascade' fijo). */
function parseBrandTaskRows(raw: string, packageLevel: PackageLevel): Record<Brand, Task[]> {
  const result = {} as Record<Brand, Task[]>;
  ALL_BRANDS.forEach((brand) => {
    result[brand] = [];
  });
  raw
    .trim()
    .split('\n')
    .forEach((line) => {
      const [brand, id, description] = line.split('|');
      result[brand as Brand].push({ id, stage: 'cascade', packageLevel, description });
    });
  return result;
}

// ---- Stage 1: Triage ----
const TRIAGE_UNIVERSAL: Task[] = parseTaskRows(
  `
triage_dashboard_lights|Revisión de luces de tablero (Testigos encendidos)
triage_ac_heat|Revisión de aire acondicionado y calefacción
triage_horn|Revisión de claxon
triage_seatbelts|Revisión de cinturones de seguridad (Bloqueo y anclaje)
triage_cabin_lights|Revisión de luces interiores de cabina
triage_high_beams|Revisión de luces principales altas
triage_low_beams|Revisión de luces principales bajas
triage_turn_signals|Revisión de luces direccionales e intermitentes
triage_brake_lights|Revisión de luces traseras de stop
triage_reverse_light|Revisión de luz de reversa
triage_wipers|Revisión de desgaste en plumas limpiaparabrisas
triage_windshield|Revisión de estrelladuras en parabrisas y cristales
triage_body_damage|Revisión de golpes o abolladuras en carrocería general
triage_oil_leaks|Revisión de fugas de aceite de motor (Cárter/Tapas)
triage_coolant_leaks|Revisión de fugas de anticongelante (Radiador/Mangueras)
triage_ps_leaks|Revisión de fugas de dirección hidráulica (Cremallera/Bomba)
triage_brake_fluid_leaks|Revisión de fugas de líquido de frenos (Líneas/Cálipers)
triage_fuel_leaks|Revisión de fugas de combustible (Líneas/Tanque)
triage_exhaust|Revisión de corrosión o roturas en el sistema de escape
triage_engine_mounts|Revisión visual de soportes de motor
triage_trans_mounts|Revisión visual de soportes de transmisión
triage_coolant_level|Inspección de nivel de anticongelante
triage_brake_fluid_level|Inspección de nivel de líquido de frenos
triage_ps_fluid_level|Inspección de nivel de fluido de dirección
triage_battery_terminals|Revisión de limpieza en terminales de batería
triage_battery_voltage|Medición con multímetro de voltaje de batería
triage_obd2|Conexión de Escáner OBD2 y búsqueda de códigos de falla`,
  'triage'
);

const TRIAGE_MINING: Task[] = parseTaskRows(
  `
triage_rotating_beacon|Revisión de funcionamiento de torreta
triage_safety_pole|Revisión de estado de pértiga
triage_extinguisher|Revisión de caducidad y presión de extintor
triage_wheel_chocks|Revisión de presencia de calzas
triage_strobe|Revisión de funcionamiento de estrobos
triage_reverse_alarm|Revisión de alarma sonora de reversa
triage_reflective_tape|Revisión de estado de cintas reflejantes`,
  'triage'
);

// ---- Stage 2: Minor Service ----
const MINOR_SERVICE_BASE: Task[] = parseTaskRows(
  `
minor_oil_change|Cambio de aceite de motor (drenado + llenado al nivel especificado)
minor_oil_filter|Remoción de filtro de aceite viejo e instalación de nuevo
minor_air_filter|Remoción de filtro de aire viejo e instalación de nuevo
minor_fuel_filter|Remoción de filtro de combustible viejo e instalación de nuevo`,
  'minor_service'
);
const [MINOR_CABIN_FILTER] = parseTaskRows(
  'minor_cabin_filter|Remoción de filtro de cabina viejo e instalación de nuevo',
  'minor_service'
);
const [MINOR_WATER_SEPARATOR] = parseTaskRows(
  'minor_water_separator|Remoción de separador de agua viejo e instalación de nuevo',
  'minor_service'
);

// ---- Stage 3: Cascade Package A (10k) ----
const PKG_A_BASE: Task[] = parseTaskRows(
  `
cascade_tire_depth|Medición en milímetros de profundidad de desgaste de llantas
cascade_tire_pressure_installed|Calibración de presión de aire (Llantas instaladas)
cascade_tire_pressure_spare|Calibración de presión de aire (Llanta de refacción)
cascade_tire_rotation|Rotación de llantas según patrón del fabricante
cascade_cardan_lube|Lubricación/Engrase de crucetas de la barra cardán
cascade_suspension_lube|Lubricación/Engrase de rótulas de suspensión
cascade_exterior_wash|Lavado exterior a presión de carrocería y chasis
cascade_interior_vacuum|Aspirado interior de cabina`,
  'cascade',
  '10k'
);

const PKG_A_BRAND: Record<Brand, Task[]> = parseBrandTaskRows(
  `
toyota|cascade_toyota_10k_pedals|Revisión de holgura en pedales
toyota|cascade_toyota_10k_hinges|Revisión de bisagras y cerraduras
kia|cascade_kia_10k_idle|Medición de rendimiento en ralentí por escáner
mitsubishi|cascade_mitsubishi_10k_cv_boots|Revisión de guardapolvos de flechas
mitsubishi|cascade_mitsubishi_10k_vacuum_hoses|Revisión de mangueras de vacío
dodge_ram|cascade_dodge_10k_frame|Revisión visual de vigas principales de chasis
dodge_ram|cascade_dodge_10k_leaf_springs|Revisión de muelles de carga de batea`,
  '10k'
);

// ---- Stage 3: Cascade Package B (20k) ----
const PKG_B_BASE: Task[] = parseTaskRows(
  `
cascade_front_brake_pads|Medición de grosor de pastillas de freno delanteras
cascade_brake_discs|Medición de ceja/desgaste en discos de freno
cascade_rear_brake_pads|Medición de grosor de balatas traseras (o pastillas traseras)
cascade_rear_drums|Revisión de tambores traseros
cascade_brake_hardware|Aplicación de limpiador y lubricación de herrajes/cálipers de freno
cascade_radiator_hoses|Revisión de estado físico (cuarteaduras) en mangueras de radiador
cascade_serpentine_belt|Revisión de estado físico en bandas de accesorios/serpentín
cascade_radiator_clean|Limpieza a presión de panel exterior del radiador`,
  'cascade',
  '20k'
);

const PKG_B_BRAND: Record<Brand, Task[]> = parseBrandTaskRows(
  `
nissan|cascade_nissan_20k_airbag_sensors|Revisión de sensores de impacto frontal
nissan|cascade_nissan_20k_seat_anchors|Revisión de anclajes de asientos
toyota|cascade_toyota_20k_throttle_cable|Ajuste de chicote de acelerador
toyota|cascade_toyota_20k_parking_brake|Ajuste de freno de mano de estacionamiento
kia|cascade_kia_20k_cvt_hoses|Inspección de mangueras de enfriador CVT
kia|cascade_kia_20k_cvt_leaks|Revisión de fugas en carcasa CVT
mitsubishi|cascade_mitsubishi_20k_chassis_wiring|Revisión de cableado expuesto en chasis
mitsubishi|cascade_mitsubishi_20k_door_locks|Lubricación de cerraduras de carrocería
dodge_ram|cascade_dodge_20k_u_bolts|Revisión de pernos en U de suspensión trasera
dodge_ram|cascade_dodge_20k_spring_bushings|Inspección de bujes de muelles`,
  '20k'
);

// ---- Stage 3: Cascade Package C (30k) ----
const PKG_C_BASE: Task[] = parseTaskRows(
  `
cascade_injector_clean|Desmontaje y lavado de inyectores en laboratorio (o Boya)
cascade_throttle_body_clean|Desmontaje y limpieza de cuerpo de aceleración con solvente
cascade_brake_fluid_drain|Drenado/Extracción de líquido de frenos viejo del depósito
cascade_brake_fluid_fill|Llenado con líquido de frenos nuevo
cascade_brake_bleed|Purga de aire en las 4 ruedas del sistema de frenos`,
  'cascade',
  '30k'
);
const PKG_C_GASOLINE: Task[] = parseTaskRows(
  `
cascade_spark_plugs_remove|Extracción de bujías viejas
cascade_spark_plugs_install|Calibración e instalación de bujías nuevas`,
  'cascade',
  '30k'
);

const PKG_C_BRAND: Record<Brand, Task[]> = parseBrandTaskRows(
  `
nissan|cascade_nissan_30k_alternator|Prueba de caída de voltaje en alternador
nissan|cascade_nissan_30k_relays|Revisión de relevadores principales
toyota|cascade_toyota_30k_steering_column|Revisión de nudos de columna de dirección
toyota|cascade_toyota_30k_injector_rail|Inspección de riel de inyectores y conexiones
kia|cascade_kia_30k_tcm_scan|Escaneo de módulo TCM de transmisión
kia|cascade_kia_30k_cvt_temp|Medición de temperatura de fluido CVT
mitsubishi|cascade_mitsubishi_30k_steering_rods|Inspección de bieletas y terminales de dirección
mitsubishi|cascade_mitsubishi_30k_steering_box|Engrase de caja de dirección
dodge_ram|cascade_dodge_30k_diff_vent|Revisión de respiradero de diferencial trasero
dodge_ram|cascade_dodge_30k_rear_axle|Inspección de flechas de eje trasero`,
  '30k'
);

// ---- Stage 3: Cascade Package D (50k) ----
const PKG_D_BASE: Task[] = parseTaskRows(
  `
cascade_coolant_drain|Drenado total de anticongelante viejo del sistema
cascade_coolant_fill|Llenado de anticongelante nuevo y purga de burbujas del sistema
cascade_trans_oil_drain|Drenado de aceite viejo de transmisión (Manual/Auto/CVT)
cascade_trans_filter|Remoción de cárter e instalación de filtro de transmisión nuevo (Si es Auto/CVT)
cascade_trans_oil_fill|Llenado de aceite nuevo de transmisión al nivel especificado
cascade_shock_absorbers|Prueba de compresión manual en amortiguadores (Rebote)
cascade_shock_leaks|Revisión visual de fugas en los 4 amortiguadores
cascade_suspension_bushings|Inspección con barreta de desgaste en bujes y horquillas de suspensión
cascade_rear_diff_drain|Drenado de aceite viejo de diferencial trasero (Si es Tracción Trasera/Carga)
cascade_rear_diff_fill|Llenado de aceite nuevo de diferencial trasero (Si es Tracción Trasera/Carga)`,
  'cascade',
  '50k'
);

const PKG_D_BRAND: Record<Brand, Task[]> = parseBrandTaskRows(
  `
toyota|cascade_toyota_50k_4wd_actuator|Revisión de actuador 4x4
toyota|cascade_toyota_50k_front_driveshaft|Inspección de flechas cardán delanteras
kia|cascade_kia_50k_steering_sensor|Calibración de sensor de ángulo de giro
kia|cascade_kia_50k_eps_motor|Revisión de motor eléctrico de dirección EPS
mitsubishi|cascade_mitsubishi_50k_front_diff|Revisión de diferencial delantero nivel y fugas
mitsubishi|cascade_mitsubishi_50k_skid_plates|Inspección de placas protectoras de cárter Skid plates
dodge_ram|cascade_dodge_50k_tow_welds|Revisión de soldaduras en tirón de arrastre
dodge_ram|cascade_dodge_50k_trailer_connector|Revisión de conector eléctrico de remolque 7 pines`,
  '50k'
);

// ============================================================================
// PURE ENGINE FUNCTIONS
// ============================================================================

export function validateVehicleProfile(vp: Partial<VehicleProfile>): string[] {
  const errors: string[] = [];
  if (!vp.brand) errors.push('brand is required');
  if (!vp.fuelType) errors.push('fuelType is required');
  if (!vp.fleetType) errors.push('fleetType is required');
  if (vp.odometer === undefined || vp.odometer === null) errors.push('odometer is required');
  if (typeof vp.odometer === 'number' && vp.odometer < 0) errors.push('odometer must be >= 0');
  return errors;
}

// Returns the PackageLevel labels active at a given odometer, in accumulative order.
// Primary (Regla 3): absolute milestone ±1500 km tolerance, repeating every 60k.
// Fallback (Regla 3b): if absolute misses AND lastServiceOdometer is known, evaluates
// relative interval (odometer − lastServiceOdometer) against the same ±1500 km window.
// This handles vehicles whose service history sits at non-10k-multiple odometers.
function resolveCyclePosition(nearest: number): PackageLevel[] {
  const cyclePosition = nearest % 60000 || 60000;
  if (cyclePosition <= 10000) return ['10k'];
  if (cyclePosition <= 20000) return ['10k', '20k'];
  if (cyclePosition <= 40000) return ['10k', '20k', '30k'];
  return ['10k', '20k', '30k', '50k'];
}

export function getActivePackageLevels(
  odometer: number,
  lastServiceOdometer?: number
): PackageLevel[] {
  const nearest10k = Math.round(odometer / 10000) * 10000;
  if (nearest10k !== 0 && Math.abs(odometer - nearest10k) <= CASCADE_TOLERANCE_KM) {
    return resolveCyclePosition(nearest10k);
  }

  if (lastServiceOdometer && lastServiceOdometer > 0) {
    const relativeKm = odometer - lastServiceOdometer;
    if (relativeKm > 0) {
      const nearestInterval = Math.round(relativeKm / 10000) * 10000;
      if (nearestInterval > 0 && Math.abs(relativeKm - nearestInterval) <= CASCADE_TOLERANCE_KM) {
        return resolveCyclePosition(nearestInterval);
      }
    }
  }

  return [];
}

export function getTasksForPackage(level: PackageLevel, brand: Brand, fuelType: FuelType): Task[] {
  const tasks: Task[] = [];
  if (level === '10k') {
    tasks.push(...PKG_A_BASE, ...PKG_A_BRAND[brand]);
  } else if (level === '20k') {
    tasks.push(...PKG_B_BASE, ...PKG_B_BRAND[brand]);
  } else if (level === '30k') {
    tasks.push(...PKG_C_BASE);
    if (fuelType === 'gasoline') tasks.push(...PKG_C_GASOLINE);
    tasks.push(...PKG_C_BRAND[brand]);
  } else {
    tasks.push(...PKG_D_BASE, ...PKG_D_BRAND[brand]);
  }
  return tasks;
}

export function deduplicateCascade(tasks: Task[], lastClosedWorkOrder: WorkOrder | null): Task[] {
  if (!lastClosedWorkOrder) return tasks;
  const executedIds = new Set(
    lastClosedWorkOrder.tasks.filter((t) => t.executed).map((t) => t.taskId)
  );
  return tasks.filter((task) => !executedIds.has(task.id));
}

export function getTriageTasks(fleetType: FleetType): Task[] {
  return fleetType === 'mining' ? [...TRIAGE_UNIVERSAL, ...TRIAGE_MINING] : [...TRIAGE_UNIVERSAL];
}

export function getMinorServiceTasks(fuelType: FuelType): Task[] {
  return fuelType === 'gasoline'
    ? [...MINOR_SERVICE_BASE, MINOR_CABIN_FILTER]
    : [...MINOR_SERVICE_BASE, MINOR_WATER_SEPARATOR];
}

export function getStage4Tasks(lastClosedWorkOrder: WorkOrder | null): Task[] {
  if (!lastClosedWorkOrder) return [];
  return lastClosedWorkOrder.tasks
    .filter((t) => !t.executed && t.deferredType === 'DEFERRED_FINANCIAL')
    .map((t) => ({
      id: `deferred_${t.taskId}`,
      stage: 'deferred' as TaskStage,
      description: `Diferido pendiente: ${t.taskId}`,
    }));
}

// Counts elapsed business hours between pendingSince and now using hourly cursor.
// Workdays default Mon–Fri 08:00–18:00 (local time of execution environment).
export function checkStage5Timeout(
  pendingSince: Date,
  now: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): boolean {
  let businessHours = 0;
  const cursor = new Date(pendingSince);
  while (cursor < now) {
    const dow = cursor.getDay();
    const hour = cursor.getHours();
    if (config.workdays.includes(dow) && hour >= config.startHour && hour < config.endHour) {
      businessHours += 1;
    }
    cursor.setHours(cursor.getHours() + 1);
  }
  return businessHours >= STAGE5_TIMEOUT_BUSINESS_HOURS;
}

// Main orchestrator — assembles the full task list for a new work order.
export function calculateUpaOrder(input: UpaInput): UpaOutput {
  const errors = validateVehicleProfile(input.vehicleProfile);
  if (errors.length > 0) return { tasks: [], validationErrors: errors };

  const { brand, fuelType, fleetType, odometer } = input.vehicleProfile;
  const { lastClosedWorkOrder, lastServiceOdometer } = input;

  const tasks: Task[] = [...getTriageTasks(fleetType), ...getMinorServiceTasks(fuelType)];

  const activeLevels = getActivePackageLevels(odometer, lastServiceOdometer);
  const cascadeTasks: Task[] = activeLevels.flatMap((level) =>
    getTasksForPackage(level, brand, fuelType)
  );
  tasks.push(...deduplicateCascade(cascadeTasks, lastClosedWorkOrder));
  tasks.push(...getStage4Tasks(lastClosedWorkOrder));

  return { tasks, validationErrors: [] };
}
