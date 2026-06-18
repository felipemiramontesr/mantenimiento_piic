-- Migration 121: Fleet Area Catalog — catálogo de áreas en common_catalogs
-- FC: Archon_Flotilla_AreasCatalog · Fase 1 DB · Firmado: 2026-06-18
-- IDs 9020–9041 reservados permanentemente para category='FLEET_AREA' — no reutilizar
SET NAMES utf8mb4;

INSERT INTO common_catalogs (id, category, code, label) VALUES
  (9020, 'FLEET_AREA', 'ADMINISTRACION',    'Administración'),
  (9021, 'FLEET_AREA', 'DIRECCION_GENERAL', 'Dirección General'),
  (9022, 'FLEET_AREA', 'FINANZAS',          'Finanzas'),
  (9023, 'FLEET_AREA', 'CONTABILIDAD',      'Contabilidad'),
  (9024, 'FLEET_AREA', 'AUDITORIA',         'Auditoría'),
  (9025, 'FLEET_AREA', 'JURIDICO_LEGAL',    'Jurídico / Legal'),
  (9026, 'FLEET_AREA', 'RECURSOS_HUMANOS',  'Recursos Humanos'),
  (9027, 'FLEET_AREA', 'NOMINA',            'Nómina'),
  (9028, 'FLEET_AREA', 'OPERACIONES',       'Operaciones'),
  (9029, 'FLEET_AREA', 'MANTENIMIENTO',     'Mantenimiento'),
  (9030, 'FLEET_AREA', 'FLOTA',             'Flota'),
  (9031, 'FLEET_AREA', 'LOGISTICA',         'Logística'),
  (9032, 'FLEET_AREA', 'DISTRIBUCION',      'Distribución'),
  (9033, 'FLEET_AREA', 'TRANSPORTE',        'Transporte'),
  (9034, 'FLEET_AREA', 'ALMACEN',           'Almacén'),
  (9035, 'FLEET_AREA', 'COMPRAS',           'Compras'),
  (9036, 'FLEET_AREA', 'CALIDAD',           'Calidad'),
  (9037, 'FLEET_AREA', 'PRODUCCION',        'Producción'),
  (9038, 'FLEET_AREA', 'VENTAS',            'Ventas'),
  (9039, 'FLEET_AREA', 'SERVICIO_CLIENTE',  'Servicio al Cliente'),
  (9040, 'FLEET_AREA', 'MARKETING',         'Marketing'),
  (9041, 'FLEET_AREA', 'SISTEMAS_TI',       'Sistemas / TI')
ON DUPLICATE KEY UPDATE label = VALUES(label);
