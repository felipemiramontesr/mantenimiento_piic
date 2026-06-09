-- Migration: 093 — UPA Task Catalog
-- Reference table for all static tasks defined in upaEngine.ts.
-- Read-only for the engine — workOrderService.ts does NOT query this table.
-- Enables JOIN-based reporting on upa_work_order_tasks.task_id.
-- No FK from upa_work_order_tasks.task_id — intentional loose coupling.
--
-- Apply to local (archon) and prod (u701509674_Mant_piic).
-- Idempotent: CREATE TABLE IF NOT EXISTS + INSERT IGNORE.

CREATE TABLE IF NOT EXISTS upa_task_catalog (
  task_id       VARCHAR(100)  NOT NULL,
  description   VARCHAR(500)  NOT NULL,
  stage         ENUM('triage','minor_service','cascade','deferred','closure') NOT NULL,
  package_level ENUM('10k','20k','30k','50k') NULL,
  fleet_type    ENUM('urban','mining','both') NOT NULL DEFAULT 'both',
  brand         VARCHAR(50)   NULL COMMENT 'NULL = applies to all brands',
  fuel_type     ENUM('gasoline','diesel','both') NOT NULL DEFAULT 'both',
  PRIMARY KEY (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  COMMENT='Reference catalog of UPA static tasks. Source of truth: upaEngine.ts.';

-- ─── STAGE 1 — Triage Universal (27 tasks) ───────────────────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('triage_dashboard_lights',  'Revisión de luces de tablero (Testigos encendidos)',               'triage', NULL, 'both', NULL, 'both'),
  ('triage_ac_heat',           'Revisión de aire acondicionado y calefacción',                     'triage', NULL, 'both', NULL, 'both'),
  ('triage_horn',              'Revisión de claxon',                                               'triage', NULL, 'both', NULL, 'both'),
  ('triage_seatbelts',         'Revisión de cinturones de seguridad (Bloqueo y anclaje)',          'triage', NULL, 'both', NULL, 'both'),
  ('triage_cabin_lights',      'Revisión de luces interiores de cabina',                           'triage', NULL, 'both', NULL, 'both'),
  ('triage_high_beams',        'Revisión de luces principales altas',                             'triage', NULL, 'both', NULL, 'both'),
  ('triage_low_beams',         'Revisión de luces principales bajas',                             'triage', NULL, 'both', NULL, 'both'),
  ('triage_turn_signals',      'Revisión de luces direccionales e intermitentes',                  'triage', NULL, 'both', NULL, 'both'),
  ('triage_brake_lights',      'Revisión de luces traseras de stop',                              'triage', NULL, 'both', NULL, 'both'),
  ('triage_reverse_light',     'Revisión de luz de reversa',                                      'triage', NULL, 'both', NULL, 'both'),
  ('triage_wipers',            'Revisión de desgaste en plumas limpiaparabrisas',                 'triage', NULL, 'both', NULL, 'both'),
  ('triage_windshield',        'Revisión de estrelladuras en parabrisas y cristales',              'triage', NULL, 'both', NULL, 'both'),
  ('triage_body_damage',       'Revisión de golpes o abolladuras en carrocería general',           'triage', NULL, 'both', NULL, 'both'),
  ('triage_oil_leaks',         'Revisión de fugas de aceite de motor (Cárter/Tapas)',             'triage', NULL, 'both', NULL, 'both'),
  ('triage_coolant_leaks',     'Revisión de fugas de anticongelante (Radiador/Mangueras)',         'triage', NULL, 'both', NULL, 'both'),
  ('triage_ps_leaks',          'Revisión de fugas de dirección hidráulica (Cremallera/Bomba)',     'triage', NULL, 'both', NULL, 'both'),
  ('triage_brake_fluid_leaks', 'Revisión de fugas de líquido de frenos (Líneas/Cálipers)',        'triage', NULL, 'both', NULL, 'both'),
  ('triage_fuel_leaks',        'Revisión de fugas de combustible (Líneas/Tanque)',                'triage', NULL, 'both', NULL, 'both'),
  ('triage_exhaust',           'Revisión de corrosión o roturas en el sistema de escape',         'triage', NULL, 'both', NULL, 'both'),
  ('triage_engine_mounts',     'Revisión visual de soportes de motor',                            'triage', NULL, 'both', NULL, 'both'),
  ('triage_trans_mounts',      'Revisión visual de soportes de transmisión',                      'triage', NULL, 'both', NULL, 'both'),
  ('triage_coolant_level',     'Inspección de nivel de anticongelante',                           'triage', NULL, 'both', NULL, 'both'),
  ('triage_brake_fluid_level', 'Inspección de nivel de líquido de frenos',                       'triage', NULL, 'both', NULL, 'both'),
  ('triage_ps_fluid_level',    'Inspección de nivel de fluido de dirección',                     'triage', NULL, 'both', NULL, 'both'),
  ('triage_battery_terminals', 'Revisión de limpieza en terminales de batería',                   'triage', NULL, 'both', NULL, 'both'),
  ('triage_battery_voltage',   'Medición con multímetro de voltaje de batería',                   'triage', NULL, 'both', NULL, 'both'),
  ('triage_obd2',              'Conexión de Escáner OBD2 y búsqueda de códigos de falla',        'triage', NULL, 'both', NULL, 'both');

-- ─── STAGE 1 — Triage Mining-Only (7 tasks) ──────────────────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('triage_rotating_beacon', 'Revisión de funcionamiento de torreta',          'triage', NULL, 'mining', NULL, 'both'),
  ('triage_safety_pole',     'Revisión de estado de pértiga',                  'triage', NULL, 'mining', NULL, 'both'),
  ('triage_extinguisher',    'Revisión de caducidad y presión de extintor',    'triage', NULL, 'mining', NULL, 'both'),
  ('triage_wheel_chocks',    'Revisión de presencia de calzas',                'triage', NULL, 'mining', NULL, 'both'),
  ('triage_strobe',          'Revisión de funcionamiento de estrobos',         'triage', NULL, 'mining', NULL, 'both'),
  ('triage_reverse_alarm',   'Revisión de alarma sonora de reversa',           'triage', NULL, 'mining', NULL, 'both'),
  ('triage_reflective_tape', 'Revisión de estado de cintas reflejantes',       'triage', NULL, 'mining', NULL, 'both');

-- ─── STAGE 2 — Minor Service Base (4 tasks) ──────────────────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('minor_oil_change',  'Cambio de aceite de motor (drenado + llenado al nivel especificado)',  'minor_service', NULL, 'both', NULL, 'both'),
  ('minor_oil_filter',  'Remoción de filtro de aceite viejo e instalación de nuevo',            'minor_service', NULL, 'both', NULL, 'both'),
  ('minor_air_filter',  'Remoción de filtro de aire viejo e instalación de nuevo',              'minor_service', NULL, 'both', NULL, 'both'),
  ('minor_fuel_filter', 'Remoción de filtro de combustible viejo e instalación de nuevo',       'minor_service', NULL, 'both', NULL, 'both');

-- ─── STAGE 2 — Minor Service Fuel-Specific (2 tasks) ─────────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('minor_cabin_filter',    'Remoción de filtro de cabina viejo e instalación de nuevo',         'minor_service', NULL, 'both', NULL, 'gasoline'),
  ('minor_water_separator', 'Remoción de separador de agua viejo e instalación de nuevo',        'minor_service', NULL, 'both', NULL, 'diesel');

-- ─── STAGE 3 — Cascade Package A / 10k — Base (8 tasks) ─────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_tire_depth',              'Medición en milímetros de profundidad de desgaste de llantas',   'cascade', '10k', 'both', NULL, 'both'),
  ('cascade_tire_pressure_installed', 'Calibración de presión de aire (Llantas instaladas)',            'cascade', '10k', 'both', NULL, 'both'),
  ('cascade_tire_pressure_spare',     'Calibración de presión de aire (Llanta de refacción)',           'cascade', '10k', 'both', NULL, 'both'),
  ('cascade_tire_rotation',           'Rotación de llantas según patrón del fabricante',               'cascade', '10k', 'both', NULL, 'both'),
  ('cascade_cardan_lube',             'Lubricación/Engrase de crucetas de la barra cardán',            'cascade', '10k', 'both', NULL, 'both'),
  ('cascade_suspension_lube',         'Lubricación/Engrase de rótulas de suspensión',                  'cascade', '10k', 'both', NULL, 'both'),
  ('cascade_exterior_wash',           'Lavado exterior a presión de carrocería y chasis',              'cascade', '10k', 'both', NULL, 'both'),
  ('cascade_interior_vacuum',         'Aspirado interior de cabina',                                   'cascade', '10k', 'both', NULL, 'both');

-- ─── STAGE 3 — Cascade Package A / 10k — Brand-Specific ─────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_toyota_10k_pedals',          'Revisión de holgura en pedales',                 'cascade', '10k', 'both', 'toyota',      'both'),
  ('cascade_toyota_10k_hinges',          'Revisión de bisagras y cerraduras',              'cascade', '10k', 'both', 'toyota',      'both'),
  ('cascade_kia_10k_idle',               'Medición de rendimiento en ralentí por escáner', 'cascade', '10k', 'both', 'kia',         'both'),
  ('cascade_mitsubishi_10k_cv_boots',    'Revisión de guardapolvos de flechas',            'cascade', '10k', 'both', 'mitsubishi',  'both'),
  ('cascade_mitsubishi_10k_vacuum_hoses','Revisión de mangueras de vacío',                 'cascade', '10k', 'both', 'mitsubishi',  'both'),
  ('cascade_dodge_10k_frame',            'Revisión visual de vigas principales de chasis', 'cascade', '10k', 'both', 'dodge_ram',   'both'),
  ('cascade_dodge_10k_leaf_springs',     'Revisión de muelles de carga de batea',          'cascade', '10k', 'both', 'dodge_ram',   'both');

-- ─── STAGE 3 — Cascade Package B / 20k — Base (8 tasks) ─────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_front_brake_pads', 'Medición de grosor de pastillas de freno delanteras',                       'cascade', '20k', 'both', NULL, 'both'),
  ('cascade_brake_discs',      'Medición de ceja/desgaste en discos de freno',                              'cascade', '20k', 'both', NULL, 'both'),
  ('cascade_rear_brake_pads',  'Medición de grosor de balatas traseras (o pastillas traseras)',             'cascade', '20k', 'both', NULL, 'both'),
  ('cascade_rear_drums',       'Revisión de tambores traseros',                                             'cascade', '20k', 'both', NULL, 'both'),
  ('cascade_brake_hardware',   'Aplicación de limpiador y lubricación de herrajes/cálipers de freno',       'cascade', '20k', 'both', NULL, 'both'),
  ('cascade_radiator_hoses',   'Revisión de estado físico (cuarteaduras) en mangueras de radiador',        'cascade', '20k', 'both', NULL, 'both'),
  ('cascade_serpentine_belt',  'Revisión de estado físico en bandas de accesorios/serpentín',              'cascade', '20k', 'both', NULL, 'both'),
  ('cascade_radiator_clean',   'Limpieza a presión de panel exterior del radiador',                        'cascade', '20k', 'both', NULL, 'both');

-- ─── STAGE 3 — Cascade Package B / 20k — Brand-Specific ─────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_nissan_20k_airbag_sensors',    'Revisión de sensores de impacto frontal',       'cascade', '20k', 'both', 'nissan',     'both'),
  ('cascade_nissan_20k_seat_anchors',      'Revisión de anclajes de asientos',              'cascade', '20k', 'both', 'nissan',     'both'),
  ('cascade_toyota_20k_throttle_cable',    'Ajuste de chicote de acelerador',               'cascade', '20k', 'both', 'toyota',     'both'),
  ('cascade_toyota_20k_parking_brake',     'Ajuste de freno de mano de estacionamiento',   'cascade', '20k', 'both', 'toyota',     'both'),
  ('cascade_kia_20k_cvt_hoses',            'Inspección de mangueras de enfriador CVT',      'cascade', '20k', 'both', 'kia',        'both'),
  ('cascade_kia_20k_cvt_leaks',            'Revisión de fugas en carcasa CVT',              'cascade', '20k', 'both', 'kia',        'both'),
  ('cascade_mitsubishi_20k_chassis_wiring','Revisión de cableado expuesto en chasis',       'cascade', '20k', 'both', 'mitsubishi', 'both'),
  ('cascade_mitsubishi_20k_door_locks',    'Lubricación de cerraduras de carrocería',       'cascade', '20k', 'both', 'mitsubishi', 'both'),
  ('cascade_dodge_20k_u_bolts',            'Revisión de pernos en U de suspensión trasera', 'cascade', '20k', 'both', 'dodge_ram',  'both'),
  ('cascade_dodge_20k_spring_bushings',    'Inspección de bujes de muelles',                'cascade', '20k', 'both', 'dodge_ram',  'both');

-- ─── STAGE 3 — Cascade Package C / 30k — Base (5 tasks) ─────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_injector_clean',     'Desmontaje y lavado de inyectores en laboratorio (o Boya)',        'cascade', '30k', 'both', NULL, 'both'),
  ('cascade_throttle_body_clean','Desmontaje y limpieza de cuerpo de aceleración con solvente',      'cascade', '30k', 'both', NULL, 'both'),
  ('cascade_brake_fluid_drain',  'Drenado/Extracción de líquido de frenos viejo del depósito',      'cascade', '30k', 'both', NULL, 'both'),
  ('cascade_brake_fluid_fill',   'Llenado con líquido de frenos nuevo',                             'cascade', '30k', 'both', NULL, 'both'),
  ('cascade_brake_bleed',        'Purga de aire en las 4 ruedas del sistema de frenos',             'cascade', '30k', 'both', NULL, 'both');

-- ─── STAGE 3 — Cascade Package C / 30k — Gasoline-Only (2 tasks) ─────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_spark_plugs_remove',  'Extracción de bujías viejas',                         'cascade', '30k', 'both', NULL, 'gasoline'),
  ('cascade_spark_plugs_install', 'Calibración e instalación de bujías nuevas',          'cascade', '30k', 'both', NULL, 'gasoline');

-- ─── STAGE 3 — Cascade Package C / 30k — Brand-Specific ─────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_nissan_30k_alternator',        'Prueba de caída de voltaje en alternador',               'cascade', '30k', 'both', 'nissan',     'both'),
  ('cascade_nissan_30k_relays',            'Revisión de relevadores principales',                    'cascade', '30k', 'both', 'nissan',     'both'),
  ('cascade_toyota_30k_steering_column',   'Revisión de nudos de columna de dirección',             'cascade', '30k', 'both', 'toyota',     'both'),
  ('cascade_toyota_30k_injector_rail',     'Inspección de riel de inyectores y conexiones',         'cascade', '30k', 'both', 'toyota',     'both'),
  ('cascade_kia_30k_tcm_scan',             'Escaneo de módulo TCM de transmisión',                  'cascade', '30k', 'both', 'kia',        'both'),
  ('cascade_kia_30k_cvt_temp',             'Medición de temperatura de fluido CVT',                 'cascade', '30k', 'both', 'kia',        'both'),
  ('cascade_mitsubishi_30k_steering_rods', 'Inspección de bieletas y terminales de dirección',      'cascade', '30k', 'both', 'mitsubishi', 'both'),
  ('cascade_mitsubishi_30k_steering_box',  'Engrase de caja de dirección',                          'cascade', '30k', 'both', 'mitsubishi', 'both'),
  ('cascade_dodge_30k_diff_vent',          'Revisión de respiradero de diferencial trasero',        'cascade', '30k', 'both', 'dodge_ram',  'both'),
  ('cascade_dodge_30k_rear_axle',          'Inspección de flechas de eje trasero',                  'cascade', '30k', 'both', 'dodge_ram',  'both');

-- ─── STAGE 3 — Cascade Package D / 50k — Base (10 tasks) ────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_coolant_drain',       'Drenado total de anticongelante viejo del sistema',                                            'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_coolant_fill',        'Llenado de anticongelante nuevo y purga de burbujas del sistema',                              'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_trans_oil_drain',     'Drenado de aceite viejo de transmisión (Manual/Auto/CVT)',                                     'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_trans_filter',        'Remoción de cárter e instalación de filtro de transmisión nuevo (Si es Auto/CVT)',            'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_trans_oil_fill',      'Llenado de aceite nuevo de transmisión al nivel especificado',                                 'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_shock_absorbers',     'Prueba de compresión manual en amortiguadores (Rebote)',                                       'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_shock_leaks',         'Revisión visual de fugas en los 4 amortiguadores',                                            'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_suspension_bushings', 'Inspección con barreta de desgaste en bujes y horquillas de suspensión',                      'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_rear_diff_drain',     'Drenado de aceite viejo de diferencial trasero (Si es Tracción Trasera/Carga)',               'cascade', '50k', 'both', NULL, 'both'),
  ('cascade_rear_diff_fill',      'Llenado de aceite nuevo de diferencial trasero (Si es Tracción Trasera/Carga)',               'cascade', '50k', 'both', NULL, 'both');

-- ─── STAGE 3 — Cascade Package D / 50k — Brand-Specific ─────────────────────

INSERT IGNORE INTO upa_task_catalog (task_id, description, stage, package_level, fleet_type, brand, fuel_type)
VALUES
  ('cascade_toyota_50k_4wd_actuator',    'Revisión de actuador 4x4',                                  'cascade', '50k', 'both', 'toyota',     'both'),
  ('cascade_toyota_50k_front_driveshaft','Inspección de flechas cardán delanteras',                    'cascade', '50k', 'both', 'toyota',     'both'),
  ('cascade_kia_50k_steering_sensor',    'Calibración de sensor de ángulo de giro',                   'cascade', '50k', 'both', 'kia',        'both'),
  ('cascade_kia_50k_eps_motor',          'Revisión de motor eléctrico de dirección EPS',              'cascade', '50k', 'both', 'kia',        'both'),
  ('cascade_mitsubishi_50k_front_diff',  'Revisión de diferencial delantero nivel y fugas',           'cascade', '50k', 'both', 'mitsubishi', 'both'),
  ('cascade_mitsubishi_50k_skid_plates', 'Inspección de placas protectoras de cárter Skid plates',   'cascade', '50k', 'both', 'mitsubishi', 'both'),
  ('cascade_dodge_50k_tow_welds',        'Revisión de soldaduras en tirón de arrastre',               'cascade', '50k', 'both', 'dodge_ram',  'both'),
  ('cascade_dodge_50k_trailer_connector','Revisión de conector eléctrico de remolque 7 pines',        'cascade', '50k', 'both', 'dodge_ram',  'both');
