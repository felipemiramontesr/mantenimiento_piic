-- Migration 119: Centro Especialidades — columna JSON + catálogo
-- FC: Archon_VIM_CentroSpecialties v2 · Firmado: 2026-06-18
-- IDs 9001–9019 reservados permanentemente para category='SPECIALTY' — no reutilizar

-- Paso 1: Sanitización previa
-- Limpia valores no-JSON para que el ALTER no falle
UPDATE owner_profiles
SET especialidades = NULL
WHERE especialidades IS NOT NULL
  AND JSON_VALID(especialidades) IS NOT TRUE;

-- Paso 2: Convertir columna de VARCHAR(500) a JSON
ALTER TABLE owner_profiles
  MODIFY COLUMN especialidades JSON NULL;

-- Paso 3: Seed catálogo de especialidades automotrices
INSERT INTO common_catalogs (id, category, code, label) VALUES
  (9001, 'SPECIALTY', 'MOTOR',              'Motor'),
  (9002, 'SPECIALTY', 'TRANSMISION',        'Transmisión'),
  (9003, 'SPECIALTY', 'EMBRAGUE',           'Embrague'),
  (9004, 'SPECIALTY', 'DIFERENCIAL',        'Diferencial'),
  (9005, 'SPECIALTY', 'FRENOS',             'Frenos'),
  (9006, 'SPECIALTY', 'SUSPENSION',         'Suspensión'),
  (9007, 'SPECIALTY', 'DIRECCION',          'Dirección'),
  (9008, 'SPECIALTY', 'ALINEACION_BALANCEO','Alineación y Balanceo'),
  (9009, 'SPECIALTY', 'ELECTRICO',          'Eléctrico'),
  (9010, 'SPECIALTY', 'ELECTRONICA',        'Electrónica Automotriz'),
  (9011, 'SPECIALTY', 'DIAGNOSTICO_OBD',    'Diagnóstico OBD'),
  (9012, 'SPECIALTY', 'HOJALATERIA',        'Hojalatería'),
  (9013, 'SPECIALTY', 'PINTURA',            'Pintura'),
  (9014, 'SPECIALTY', 'AIRE_ACONDICIONADO', 'Aire Acondicionado'),
  (9015, 'SPECIALTY', 'SERVICIO_PREVENTIVO','Servicio Preventivo'),
  (9016, 'SPECIALTY', 'LLANTAS_RINES',      'Llantas y Rines'),
  (9017, 'SPECIALTY', 'HERRAMIENTA_MENOR',  'Herramienta Menor'),
  (9018, 'SPECIALTY', 'HIBRIDOS_ELECTRICOS','Híbridos y Eléctricos'),
  (9019, 'SPECIALTY', 'MAQUINARIA_PESADA',  'Maquinaria Pesada')
ON DUPLICATE KEY UPDATE label = VALUES(label);
