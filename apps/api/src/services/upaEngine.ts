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
// TASK CATALOG — Stage 1: Triage
// ============================================================================
const TRIAGE_UNIVERSAL: Task[] = [
  {
    id: 'triage_dashboard_lights',
    stage: 'triage',
    description: 'Revisión de luces de tablero (Testigos encendidos)',
  },
  {
    id: 'triage_ac_heat',
    stage: 'triage',
    description: 'Revisión de aire acondicionado y calefacción',
  },
  { id: 'triage_horn', stage: 'triage', description: 'Revisión de claxon' },
  {
    id: 'triage_seatbelts',
    stage: 'triage',
    description: 'Revisión de cinturones de seguridad (Bloqueo y anclaje)',
  },
  {
    id: 'triage_cabin_lights',
    stage: 'triage',
    description: 'Revisión de luces interiores de cabina',
  },
  { id: 'triage_high_beams', stage: 'triage', description: 'Revisión de luces principales altas' },
  { id: 'triage_low_beams', stage: 'triage', description: 'Revisión de luces principales bajas' },
  {
    id: 'triage_turn_signals',
    stage: 'triage',
    description: 'Revisión de luces direccionales e intermitentes',
  },
  { id: 'triage_brake_lights', stage: 'triage', description: 'Revisión de luces traseras de stop' },
  { id: 'triage_reverse_light', stage: 'triage', description: 'Revisión de luz de reversa' },
  {
    id: 'triage_wipers',
    stage: 'triage',
    description: 'Revisión de desgaste en plumas limpiaparabrisas',
  },
  {
    id: 'triage_windshield',
    stage: 'triage',
    description: 'Revisión de estrelladuras en parabrisas y cristales',
  },
  {
    id: 'triage_body_damage',
    stage: 'triage',
    description: 'Revisión de golpes o abolladuras en carrocería general',
  },
  {
    id: 'triage_oil_leaks',
    stage: 'triage',
    description: 'Revisión de fugas de aceite de motor (Cárter/Tapas)',
  },
  {
    id: 'triage_coolant_leaks',
    stage: 'triage',
    description: 'Revisión de fugas de anticongelante (Radiador/Mangueras)',
  },
  {
    id: 'triage_ps_leaks',
    stage: 'triage',
    description: 'Revisión de fugas de dirección hidráulica (Cremallera/Bomba)',
  },
  {
    id: 'triage_brake_fluid_leaks',
    stage: 'triage',
    description: 'Revisión de fugas de líquido de frenos (Líneas/Cálipers)',
  },
  {
    id: 'triage_fuel_leaks',
    stage: 'triage',
    description: 'Revisión de fugas de combustible (Líneas/Tanque)',
  },
  {
    id: 'triage_exhaust',
    stage: 'triage',
    description: 'Revisión de corrosión o roturas en el sistema de escape',
  },
  {
    id: 'triage_engine_mounts',
    stage: 'triage',
    description: 'Revisión visual de soportes de motor',
  },
  {
    id: 'triage_trans_mounts',
    stage: 'triage',
    description: 'Revisión visual de soportes de transmisión',
  },
  {
    id: 'triage_coolant_level',
    stage: 'triage',
    description: 'Inspección de nivel de anticongelante',
  },
  {
    id: 'triage_brake_fluid_level',
    stage: 'triage',
    description: 'Inspección de nivel de líquido de frenos',
  },
  {
    id: 'triage_ps_fluid_level',
    stage: 'triage',
    description: 'Inspección de nivel de fluido de dirección',
  },
  {
    id: 'triage_battery_terminals',
    stage: 'triage',
    description: 'Revisión de limpieza en terminales de batería',
  },
  {
    id: 'triage_battery_voltage',
    stage: 'triage',
    description: 'Medición con multímetro de voltaje de batería',
  },
  {
    id: 'triage_obd2',
    stage: 'triage',
    description: 'Conexión de Escáner OBD2 y búsqueda de códigos de falla',
  },
];

const TRIAGE_MINING: Task[] = [
  {
    id: 'triage_rotating_beacon',
    stage: 'triage',
    description: 'Revisión de funcionamiento de torreta',
  },
  { id: 'triage_safety_pole', stage: 'triage', description: 'Revisión de estado de pértiga' },
  {
    id: 'triage_extinguisher',
    stage: 'triage',
    description: 'Revisión de caducidad y presión de extintor',
  },
  { id: 'triage_wheel_chocks', stage: 'triage', description: 'Revisión de presencia de calzas' },
  { id: 'triage_strobe', stage: 'triage', description: 'Revisión de funcionamiento de estrobos' },
  {
    id: 'triage_reverse_alarm',
    stage: 'triage',
    description: 'Revisión de alarma sonora de reversa',
  },
  {
    id: 'triage_reflective_tape',
    stage: 'triage',
    description: 'Revisión de estado de cintas reflejantes',
  },
];

// ============================================================================
// TASK CATALOG — Stage 2: Minor Service
// ============================================================================
const MINOR_SERVICE_BASE: Task[] = [
  {
    id: 'minor_oil_change',
    stage: 'minor_service',
    description: 'Cambio de aceite de motor (drenado + llenado al nivel especificado)',
  },
  {
    id: 'minor_oil_filter',
    stage: 'minor_service',
    description: 'Remoción de filtro de aceite viejo e instalación de nuevo',
  },
  {
    id: 'minor_air_filter',
    stage: 'minor_service',
    description: 'Remoción de filtro de aire viejo e instalación de nuevo',
  },
  {
    id: 'minor_fuel_filter',
    stage: 'minor_service',
    description: 'Remoción de filtro de combustible viejo e instalación de nuevo',
  },
];
const MINOR_CABIN_FILTER: Task = {
  id: 'minor_cabin_filter',
  stage: 'minor_service',
  description: 'Remoción de filtro de cabina viejo e instalación de nuevo',
};
const MINOR_WATER_SEPARATOR: Task = {
  id: 'minor_water_separator',
  stage: 'minor_service',
  description: 'Remoción de separador de agua viejo e instalación de nuevo',
};

// ============================================================================
// TASK CATALOG — Stage 3: Cascade Package A (10k)
// ============================================================================
const PKG_A_BASE: Task[] = [
  {
    id: 'cascade_tire_depth',
    stage: 'cascade',
    packageLevel: '10k',
    description: 'Medición en milímetros de profundidad de desgaste de llantas',
  },
  {
    id: 'cascade_tire_pressure_installed',
    stage: 'cascade',
    packageLevel: '10k',
    description: 'Calibración de presión de aire (Llantas instaladas)',
  },
  {
    id: 'cascade_tire_pressure_spare',
    stage: 'cascade',
    packageLevel: '10k',
    description: 'Calibración de presión de aire (Llanta de refacción)',
  },
  {
    id: 'cascade_tire_rotation',
    stage: 'cascade',
    packageLevel: '10k',
    description: 'Rotación de llantas según patrón del fabricante',
  },
  {
    id: 'cascade_cardan_lube',
    stage: 'cascade',
    packageLevel: '10k',
    description: 'Lubricación/Engrase de crucetas de la barra cardán',
  },
  {
    id: 'cascade_suspension_lube',
    stage: 'cascade',
    packageLevel: '10k',
    description: 'Lubricación/Engrase de rótulas de suspensión',
  },
  {
    id: 'cascade_exterior_wash',
    stage: 'cascade',
    packageLevel: '10k',
    description: 'Lavado exterior a presión de carrocería y chasis',
  },
  {
    id: 'cascade_interior_vacuum',
    stage: 'cascade',
    packageLevel: '10k',
    description: 'Aspirado interior de cabina',
  },
];

const PKG_A_BRAND: Record<Brand, Task[]> = {
  toyota: [
    {
      id: 'cascade_toyota_10k_pedals',
      stage: 'cascade',
      packageLevel: '10k',
      description: 'Revisión de holgura en pedales',
    },
    {
      id: 'cascade_toyota_10k_hinges',
      stage: 'cascade',
      packageLevel: '10k',
      description: 'Revisión de bisagras y cerraduras',
    },
  ],
  kia: [
    {
      id: 'cascade_kia_10k_idle',
      stage: 'cascade',
      packageLevel: '10k',
      description: 'Medición de rendimiento en ralentí por escáner',
    },
  ],
  mitsubishi: [
    {
      id: 'cascade_mitsubishi_10k_cv_boots',
      stage: 'cascade',
      packageLevel: '10k',
      description: 'Revisión de guardapolvos de flechas',
    },
    {
      id: 'cascade_mitsubishi_10k_vacuum_hoses',
      stage: 'cascade',
      packageLevel: '10k',
      description: 'Revisión de mangueras de vacío',
    },
  ],
  dodge_ram: [
    {
      id: 'cascade_dodge_10k_frame',
      stage: 'cascade',
      packageLevel: '10k',
      description: 'Revisión visual de vigas principales de chasis',
    },
    {
      id: 'cascade_dodge_10k_leaf_springs',
      stage: 'cascade',
      packageLevel: '10k',
      description: 'Revisión de muelles de carga de batea',
    },
  ],
  nissan: [],
  generic: [],
};

// ============================================================================
// TASK CATALOG — Stage 3: Cascade Package B (20k)
// ============================================================================
const PKG_B_BASE: Task[] = [
  {
    id: 'cascade_front_brake_pads',
    stage: 'cascade',
    packageLevel: '20k',
    description: 'Medición de grosor de pastillas de freno delanteras',
  },
  {
    id: 'cascade_brake_discs',
    stage: 'cascade',
    packageLevel: '20k',
    description: 'Medición de ceja/desgaste en discos de freno',
  },
  {
    id: 'cascade_rear_brake_pads',
    stage: 'cascade',
    packageLevel: '20k',
    description: 'Medición de grosor de balatas traseras (o pastillas traseras)',
  },
  {
    id: 'cascade_rear_drums',
    stage: 'cascade',
    packageLevel: '20k',
    description: 'Revisión de tambores traseros',
  },
  {
    id: 'cascade_brake_hardware',
    stage: 'cascade',
    packageLevel: '20k',
    description: 'Aplicación de limpiador y lubricación de herrajes/cálipers de freno',
  },
  {
    id: 'cascade_radiator_hoses',
    stage: 'cascade',
    packageLevel: '20k',
    description: 'Revisión de estado físico (cuarteaduras) en mangueras de radiador',
  },
  {
    id: 'cascade_serpentine_belt',
    stage: 'cascade',
    packageLevel: '20k',
    description: 'Revisión de estado físico en bandas de accesorios/serpentín',
  },
  {
    id: 'cascade_radiator_clean',
    stage: 'cascade',
    packageLevel: '20k',
    description: 'Limpieza a presión de panel exterior del radiador',
  },
];

const PKG_B_BRAND: Record<Brand, Task[]> = {
  nissan: [
    {
      id: 'cascade_nissan_20k_airbag_sensors',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Revisión de sensores de impacto frontal',
    },
    {
      id: 'cascade_nissan_20k_seat_anchors',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Revisión de anclajes de asientos',
    },
  ],
  toyota: [
    {
      id: 'cascade_toyota_20k_throttle_cable',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Ajuste de chicote de acelerador',
    },
    {
      id: 'cascade_toyota_20k_parking_brake',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Ajuste de freno de mano de estacionamiento',
    },
  ],
  kia: [
    {
      id: 'cascade_kia_20k_cvt_hoses',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Inspección de mangueras de enfriador CVT',
    },
    {
      id: 'cascade_kia_20k_cvt_leaks',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Revisión de fugas en carcasa CVT',
    },
  ],
  mitsubishi: [
    {
      id: 'cascade_mitsubishi_20k_chassis_wiring',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Revisión de cableado expuesto en chasis',
    },
    {
      id: 'cascade_mitsubishi_20k_door_locks',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Lubricación de cerraduras de carrocería',
    },
  ],
  dodge_ram: [
    {
      id: 'cascade_dodge_20k_u_bolts',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Revisión de pernos en U de suspensión trasera',
    },
    {
      id: 'cascade_dodge_20k_spring_bushings',
      stage: 'cascade',
      packageLevel: '20k',
      description: 'Inspección de bujes de muelles',
    },
  ],
  generic: [],
};

// ============================================================================
// TASK CATALOG — Stage 3: Cascade Package C (30k)
// ============================================================================
const PKG_C_BASE: Task[] = [
  {
    id: 'cascade_injector_clean',
    stage: 'cascade',
    packageLevel: '30k',
    description: 'Desmontaje y lavado de inyectores en laboratorio (o Boya)',
  },
  {
    id: 'cascade_throttle_body_clean',
    stage: 'cascade',
    packageLevel: '30k',
    description: 'Desmontaje y limpieza de cuerpo de aceleración con solvente',
  },
  {
    id: 'cascade_brake_fluid_drain',
    stage: 'cascade',
    packageLevel: '30k',
    description: 'Drenado/Extracción de líquido de frenos viejo del depósito',
  },
  {
    id: 'cascade_brake_fluid_fill',
    stage: 'cascade',
    packageLevel: '30k',
    description: 'Llenado con líquido de frenos nuevo',
  },
  {
    id: 'cascade_brake_bleed',
    stage: 'cascade',
    packageLevel: '30k',
    description: 'Purga de aire en las 4 ruedas del sistema de frenos',
  },
];
const PKG_C_GASOLINE: Task[] = [
  {
    id: 'cascade_spark_plugs_remove',
    stage: 'cascade',
    packageLevel: '30k',
    description: 'Extracción de bujías viejas',
  },
  {
    id: 'cascade_spark_plugs_install',
    stage: 'cascade',
    packageLevel: '30k',
    description: 'Calibración e instalación de bujías nuevas',
  },
];

const PKG_C_BRAND: Record<Brand, Task[]> = {
  nissan: [
    {
      id: 'cascade_nissan_30k_alternator',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Prueba de caída de voltaje en alternador',
    },
    {
      id: 'cascade_nissan_30k_relays',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Revisión de relevadores principales',
    },
  ],
  toyota: [
    {
      id: 'cascade_toyota_30k_steering_column',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Revisión de nudos de columna de dirección',
    },
    {
      id: 'cascade_toyota_30k_injector_rail',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Inspección de riel de inyectores y conexiones',
    },
  ],
  kia: [
    {
      id: 'cascade_kia_30k_tcm_scan',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Escaneo de módulo TCM de transmisión',
    },
    {
      id: 'cascade_kia_30k_cvt_temp',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Medición de temperatura de fluido CVT',
    },
  ],
  mitsubishi: [
    {
      id: 'cascade_mitsubishi_30k_steering_rods',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Inspección de bieletas y terminales de dirección',
    },
    {
      id: 'cascade_mitsubishi_30k_steering_box',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Engrase de caja de dirección',
    },
  ],
  dodge_ram: [
    {
      id: 'cascade_dodge_30k_diff_vent',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Revisión de respiradero de diferencial trasero',
    },
    {
      id: 'cascade_dodge_30k_rear_axle',
      stage: 'cascade',
      packageLevel: '30k',
      description: 'Inspección de flechas de eje trasero',
    },
  ],
  generic: [],
};

// ============================================================================
// TASK CATALOG — Stage 3: Cascade Package D (50k)
// ============================================================================
const PKG_D_BASE: Task[] = [
  {
    id: 'cascade_coolant_drain',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Drenado total de anticongelante viejo del sistema',
  },
  {
    id: 'cascade_coolant_fill',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Llenado de anticongelante nuevo y purga de burbujas del sistema',
  },
  {
    id: 'cascade_trans_oil_drain',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Drenado de aceite viejo de transmisión (Manual/Auto/CVT)',
  },
  {
    id: 'cascade_trans_filter',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Remoción de cárter e instalación de filtro de transmisión nuevo (Si es Auto/CVT)',
  },
  {
    id: 'cascade_trans_oil_fill',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Llenado de aceite nuevo de transmisión al nivel especificado',
  },
  {
    id: 'cascade_shock_absorbers',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Prueba de compresión manual en amortiguadores (Rebote)',
  },
  {
    id: 'cascade_shock_leaks',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Revisión visual de fugas en los 4 amortiguadores',
  },
  {
    id: 'cascade_suspension_bushings',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Inspección con barreta de desgaste en bujes y horquillas de suspensión',
  },
  {
    id: 'cascade_rear_diff_drain',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Drenado de aceite viejo de diferencial trasero (Si es Tracción Trasera/Carga)',
  },
  {
    id: 'cascade_rear_diff_fill',
    stage: 'cascade',
    packageLevel: '50k',
    description: 'Llenado de aceite nuevo de diferencial trasero (Si es Tracción Trasera/Carga)',
  },
];

const PKG_D_BRAND: Record<Brand, Task[]> = {
  toyota: [
    {
      id: 'cascade_toyota_50k_4wd_actuator',
      stage: 'cascade',
      packageLevel: '50k',
      description: 'Revisión de actuador 4x4',
    },
    {
      id: 'cascade_toyota_50k_front_driveshaft',
      stage: 'cascade',
      packageLevel: '50k',
      description: 'Inspección de flechas cardán delanteras',
    },
  ],
  kia: [
    {
      id: 'cascade_kia_50k_steering_sensor',
      stage: 'cascade',
      packageLevel: '50k',
      description: 'Calibración de sensor de ángulo de giro',
    },
    {
      id: 'cascade_kia_50k_eps_motor',
      stage: 'cascade',
      packageLevel: '50k',
      description: 'Revisión de motor eléctrico de dirección EPS',
    },
  ],
  mitsubishi: [
    {
      id: 'cascade_mitsubishi_50k_front_diff',
      stage: 'cascade',
      packageLevel: '50k',
      description: 'Revisión de diferencial delantero nivel y fugas',
    },
    {
      id: 'cascade_mitsubishi_50k_skid_plates',
      stage: 'cascade',
      packageLevel: '50k',
      description: 'Inspección de placas protectoras de cárter Skid plates',
    },
  ],
  dodge_ram: [
    {
      id: 'cascade_dodge_50k_tow_welds',
      stage: 'cascade',
      packageLevel: '50k',
      description: 'Revisión de soldaduras en tirón de arrastre',
    },
    {
      id: 'cascade_dodge_50k_trailer_connector',
      stage: 'cascade',
      packageLevel: '50k',
      description: 'Revisión de conector eléctrico de remolque 7 pines',
    },
  ],
  nissan: [],
  generic: [],
};

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
