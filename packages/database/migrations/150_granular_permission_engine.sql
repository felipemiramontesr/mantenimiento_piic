SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- Migration: 150 — Archon Granular Permission Engine (FC-18 FaseD-1)
-- Context : Expande el sistema RBAC de 15 permisos coarse-grained a 141
--           permisos atómicos organizados en 19 módulos (estilo Drupal).
--           Agrega roles 9 (Cliente Externo) y 10 (Operador / Familiar).
--           Asignación aditiva — NO elimina permisos legacy (fase backward compat).
-- Guard   : Archon (role_id=0) nunca se toca. Todas las ops son INSERT IGNORE.
-- =============================================================================

-- ─── STEP 1: Add roles 9 and 10 ─────────────────────────────────────────────
INSERT IGNORE INTO roles (id, name, description) VALUES
  (9,  'Cliente Externo',     'Acceso exclusivo al portal de cliente. Sin acceso a datos cifrados ni rutas de API internas.'),
  (10, 'Operador / Familiar', 'Operación diaria de unidad. Acceso restringido al propio Owner/Supercluster.');

-- ─── STEP 2: Seed 141 permisos atómicos ──────────────────────────────────────
-- Formato: {módulo}:{entidad}:{operación}[:{scope}]
-- INSERT IGNORE garantiza idempotencia sobre slugs ya existentes.

INSERT IGNORE INTO permissions (slug, description) VALUES

-- ── MODULE: fleet — Gestión de Unidades ──────────────────────────────────────
('fleet:unit:view:any',               'Ver cualquier unidad dentro del Universe'),
('fleet:unit:view:own',               'Ver unidades del propio Supercluster (Owner)'),
('fleet:unit:create',                 'Dar de alta nueva unidad'),
('fleet:unit:edit:any',               'Editar cualquier unidad'),
('fleet:unit:edit:own',               'Editar unidades del propio Supercluster'),
('fleet:unit:delete:any',             'Dar de baja cualquier unidad'),
('fleet:unit:delete:own',             'Dar de baja unidades del propio Supercluster'),
('fleet:unit:export',                 'Exportar listado de unidades (CSV/Excel)'),
('fleet:unit:node:view',              'Ver árbol de relaciones de unidad'),
('fleet:unit:field:vin:decrypt',      'Descifrar VIN / número de serie — AES bypass'),
('fleet:unit:field:plates:decrypt',   'Descifrar placas — AES bypass'),
('fleet:unit:field:circcard:decrypt', 'Descifrar tarjeta de circulación — AES bypass'),
('fleet:unit:field:insurance:view',   'Ver datos de seguro (póliza, aseguradora, vencimiento)'),
('fleet:unit:field:compliance:view',  'Ver verificación vehicular / tenencia fiscal'),
('fleet:catalog:view',                'Ver catálogos (marcas, modelos, tipos, combustible)'),
('fleet:catalog:manage',              'Crear/editar/eliminar catálogos'),
('fleet:image:upload',                'Cargar imágenes de unidad'),

-- ── MODULE: maint — Mantenimiento de Flotilla ─────────────────────────────────
('maint:record:view:any',    'Ver cualquier registro de mantenimiento'),
('maint:record:view:own',    'Ver registros del propio Supercluster'),
('maint:record:create',      'Crear orden/registro de mantenimiento'),
('maint:record:edit:any',    'Editar cualquier registro de mantenimiento'),
('maint:record:edit:own',    'Editar registros del propio Supercluster'),
('maint:record:delete:any',  'Eliminar cualquier registro de mantenimiento'),
('maint:template:view',      'Ver plantillas de mantenimiento preventivo'),
('maint:template:manage',    'Crear/editar/eliminar plantillas'),
('maint:forecast:view',      'Ver pronóstico de próximos mantenimientos'),
('maint:report:export',      'Exportar reportes de mantenimiento (PDF/Excel)'),

-- ── MODULE: route — Rutas y Viajes ────────────────────────────────────────────
('route:record:view:any',      'Ver cualquier viaje/ruta'),
('route:record:view:own',      'Ver rutas del propio Supercluster'),
('route:record:create',        'Iniciar/registrar ruta'),
('route:record:edit:any',      'Editar cualquier ruta (rol despacho)'),
('route:record:edit:own',      'Editar rutas del propio Supercluster'),
('route:record:delete:any',    'Eliminar ruta'),
('route:record:forensic:view', 'Ver datos forenses de ruta (velocidades, paradas, eventos)'),
('route:waypoint:manage',      'Gestionar waypoints y paradas programadas'),
('route:checklist:submit',     'Enviar checklist de entrada/salida'),
('route:checklist:view',       'Ver checklists históricos'),

-- ── MODULE: intelligence — Inteligencia de Flotilla ──────────────────────────
('intelligence:tco:view',           'Ver TCO (Costo Total de Propiedad) por unidad/flota'),
('intelligence:tco:export',         'Exportar análisis TCO'),
('intelligence:anomaly:view',       'Ver anomalías detectadas'),
('intelligence:anomaly:manage',     'Gestionar/cerrar anomalías'),
('intelligence:scorecard:view',     'Ver scorecards de operadores'),
('intelligence:co2:view',           'Ver reporte de emisiones CO2'),
('intelligence:economic-life:view', 'Ver vida económica proyectada de unidades'),
('intelligence:recall:view',        'Ver recalls pendientes de fabricantes'),
('intelligence:recall:manage',      'Marcar recalls como atendidos'),
('intelligence:recall:sync',        'Sincronizar recalls desde NHTSA/VIM (operación de sistema)'),
('intelligence:report:export',      'Exportar reportes de inteligencia general'),

-- ── MODULE: crm — CRM Comercial ───────────────────────────────────────────────
('crm:contact:view:any',     'Ver cualquier contacto'),
('crm:contact:view:own',     'Ver contactos del propio Supercluster'),
('crm:contact:create',       'Crear contacto'),
('crm:contact:edit:any',     'Editar cualquier contacto'),
('crm:contact:edit:own',     'Editar contactos del propio Supercluster'),
('crm:contact:delete:any',   'Eliminar cualquier contacto'),
('crm:contract:view:any',    'Ver cualquier contrato'),
('crm:contract:view:own',    'Ver contratos del propio Supercluster'),
('crm:contract:create',      'Crear contrato'),
('crm:contract:edit:any',    'Editar cualquier contrato'),
('crm:contract:edit:own',    'Editar contratos del propio Supercluster'),
('crm:pipeline:view',        'Ver pipeline comercial (Kanban de oportunidades)'),
('crm:pipeline:edit',        'Mover oportunidades / editar etapas del pipeline'),
('crm:interaction:view',     'Ver historial de interacciones (llamadas, emails, meetings)'),
('crm:interaction:create',   'Registrar nueva interacción'),
('crm:interaction:edit:own', 'Editar interacciones propias'),
('crm:campaign:view',        'Ver campañas de marketing'),
('crm:campaign:create',      'Crear campaña'),
('crm:campaign:manage',      'Editar, pausar, archivar campañas'),
('crm:campaign:delete',      'Eliminar campaña'),
('crm:export',               'Exportar datos de CRM (contactos, contratos, pipeline)'),

-- ── MODULE: finance — Finanzas ────────────────────────────────────────────────
('finance:dashboard:view:any',   'Ver dashboard financiero de cualquier Supercluster'),
('finance:dashboard:view:own',   'Ver dashboard financiero del propio Supercluster'),
('finance:transaction:view:any', 'Ver cualquier transacción'),
('finance:transaction:view:own', 'Ver transacciones del propio Supercluster'),
('finance:transaction:create',   'Registrar transacción financiera'),
('finance:report:export',        'Exportar reporte financiero (PDF/Excel)'),
('finance:budget:view',          'Ver presupuesto'),
('finance:budget:edit',          'Editar presupuesto'),

-- ── MODULE: workorder — Órdenes de Trabajo (UPA) ─────────────────────────────
('workorder:view:any',    'Ver cualquier orden de trabajo'),
('workorder:view:own',    'Ver órdenes del propio Supercluster'),
('workorder:create',      'Crear nueva OT'),
('workorder:edit:any',    'Editar cualquier OT'),
('workorder:edit:own',    'Editar OTs del propio Supercluster'),
('workorder:close',       'Cerrar/completar OT (transición de estado final irreversible)'),
('workorder:delete',      'Eliminar OT'),
('workorder:task:manage', 'Gestionar tareas dentro de OT'),

-- ── MODULE: alert — Alertas ───────────────────────────────────────────────────
('alert:view:any',    'Ver todas las alertas del sistema'),
('alert:view:own',    'Ver alertas del propio Supercluster'),
('alert:manage:any',  'Gestionar/dismissar cualquier alerta'),
('alert:manage:own',  'Gestionar alertas del propio Supercluster'),
('alert:config:edit', 'Configurar umbrales y reglas de alerta'),

-- ── MODULE: social — Actividad Social ────────────────────────────────────────
('social:post:view',       'Ver publicaciones'),
('social:post:create',     'Crear publicación'),
('social:post:edit:own',   'Editar propias publicaciones'),
('social:post:delete:any', 'Eliminar cualquier publicación (moderación)'),
('social:review:view',     'Ver reseñas'),
('social:review:manage',   'Gestionar/responder reseñas'),

-- ── MODULE: users — Gestión de Collaborators ─────────────────────────────────
('users:collaborator:view',     'Ver listado de colaboradores (Cluster level)'),
('users:collaborator:create',   'Dar de alta colaboradores'),
('users:collaborator:edit:own', 'Editar perfil propio (autoservicio)'),
('users:collaborator:edit:any', 'Editar cualquier colaborador'),
('users:collaborator:delete',   'Dar de baja colaboradores'),
('users:profile-image:manage',  'Subir/cambiar imagen de perfil'),

-- ── MODULE: admin — Administración de Tenencia ───────────────────────────────
('admin:tenant:view',         'Ver información de Tenants (nivel Plataforma)'),
('admin:tenant:create',       'Crear nuevo Tenant'),
('admin:tenant:edit',         'Editar Tenant'),
('admin:tenant:delete',       'Eliminar Tenant'),
('admin:owner:view',          'Ver Owners (Superclusters) dentro del Tenant'),
('admin:owner:create',        'Crear Owner'),
('admin:owner:edit',          'Editar Owner'),
('admin:owner:delete',        'Eliminar Owner'),
('admin:role:view',           'Ver roles del sistema'),
('admin:role:create',         'Crear rol personalizado'),
('admin:role:edit',           'Editar rol y su matriz de permisos'),
('admin:role:delete',         'Eliminar rol'),
('admin:membership:manage',   'Gestionar membresías usuario↔Owner (tenant_user_memberships)'),
('admin:service-link:manage', 'Vincular/desvincular centros de servicio con Owners'),
('admin:audit:view',          'Ver log de auditoría del sistema'),

-- ── MODULE: security — Seguridad ─────────────────────────────────────────────
('security:audit:view',    'Ver log de seguridad (accesos, cambios sensibles)'),
('security:audit:export',  'Exportar log de seguridad'),
('security:incident:view', 'Ver incidentes de seguridad detectados'),

-- ── MODULE: portal — Portal Cliente Externo ───────────────────────────────────
('portal:dashboard:view',  'Acceso al dashboard del portal cliente'),
('portal:fleet:view:own',  'Ver unidades de flota propias (AES masking siempre activo — sin decrypt)'),
('portal:report:download', 'Descargar reportes de servicio'),
('portal:invoice:view',    'Ver facturas y cotizaciones'),

-- ── MODULE: areas — Gestión de Áreas ─────────────────────────────────────────
('areas:view',   'Ver áreas operativas/geográficas'),
('areas:manage', 'Crear/editar/eliminar áreas'),

-- ── MODULE: servicecenters — Centros de Servicio ─────────────────────────────
('servicecenters:view',   'Ver centros de servicio'),
('servicecenters:manage', 'Crear/editar/eliminar centros de servicio'),
('servicecenters:link',   'Vincular/desvincular centro de servicio con Owner'),

-- ── MODULE: notifications — Notificaciones ───────────────────────────────────
('notifications:view:own',    'Ver propias notificaciones push/email'),
('notifications:manage:own',  'Marcar notificaciones como leídas/archivadas'),
('notifications:config:edit', 'Configurar preferencias de notificación'),
('notifications:broadcast',   'Enviar notificaciones masivas (admin)'),

-- ── MODULE: geolocation — Geolocalización ────────────────────────────────────
('geolocation:view:own',     'Ver posición GPS de unidades del propio Supercluster'),
('geolocation:view:any',     'Ver posición GPS de cualquier unidad'),
('geolocation:realtime:view','Ver telemetría GPS en tiempo real'),

-- ── MODULE: onboarding — Alta de Entidades ───────────────────────────────────
('onboarding:universe:create', 'Crear nuevo Universo (onboarding de nuevo Tenant)'),
('onboarding:client:create',   'Dar de alta cliente (Owner / Supercluster)'),
('onboarding:member:create',   'Incorporar miembro/colaborador a Owner'),

-- ── MODULE: document — Archivos y Documentos (AG Q6 addition) ────────────────
('document:file:upload',   'Subir archivos y documentos adjuntos'),
('document:file:download', 'Descargar archivos y documentos adjuntos');

-- ─── STEP 3: Asignar permisos por rol (aditivo — INSERT IGNORE) ──────────────
-- Los permisos legacy (fleet:view, maint:view, etc.) permanecen intactos
-- hasta FaseD-4 donde se eliminarán con alias de backward compat.

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 1 — Operador General (dashboard read-only multi-módulo)           │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug IN (
  'fleet:unit:view:any',
  'fleet:unit:node:view',
  'fleet:catalog:view',
  'maint:record:view:any',
  'maint:template:view',
  'maint:forecast:view',
  'route:record:view:any',
  'route:checklist:view',
  'finance:dashboard:view:any',
  'finance:transaction:view:any',
  'finance:budget:view',
  'workorder:view:any',
  'alert:view:any',
  'areas:view',
  'servicecenters:view',
  'notifications:view:own',
  'geolocation:view:any',
  'document:file:download'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 2 — Supervisor de Mantenimiento                                    │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE slug IN (
  'fleet:unit:view:any',
  'fleet:unit:node:view',
  'maint:record:view:any',
  'maint:record:create',
  'maint:record:edit:any',
  'maint:record:delete:any',
  'maint:template:view',
  'maint:template:manage',
  'maint:forecast:view',
  'maint:report:export',
  'route:record:view:any',
  'route:record:forensic:view',
  'route:checklist:view',
  'workorder:view:any',
  'workorder:create',
  'workorder:edit:any',
  'workorder:close',
  'workorder:task:manage',
  'intelligence:recall:view',
  'intelligence:economic-life:view',
  'intelligence:scorecard:view',
  'alert:view:any',
  'alert:manage:own',
  'servicecenters:view',
  'servicecenters:manage',
  'servicecenters:link',
  'areas:view',
  'notifications:view:own',
  'document:file:upload',
  'document:file:download'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 3 — Director de Finanzas                                           │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE slug IN (
  'finance:dashboard:view:any',
  'finance:dashboard:view:own',
  'finance:transaction:view:any',
  'finance:transaction:create',
  'finance:report:export',
  'finance:budget:view',
  'finance:budget:edit',
  'fleet:unit:view:any',
  'fleet:unit:export',
  'maint:record:view:any',
  'maint:report:export',
  'route:record:view:any',
  'intelligence:tco:view',
  'intelligence:tco:export',
  'intelligence:economic-life:view',
  'intelligence:report:export',
  'workorder:view:any',
  'areas:view',
  'notifications:view:own',
  'document:file:download',
  'crm:export'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 4 — Gestor de Flotilla (full fleet CRUD + intelligence + alerts)   │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE slug IN (
  'fleet:unit:view:any',
  'fleet:unit:create',
  'fleet:unit:edit:any',
  'fleet:unit:delete:any',
  'fleet:unit:export',
  'fleet:unit:node:view',
  'fleet:image:upload',
  'fleet:unit:field:vin:decrypt',
  'fleet:unit:field:plates:decrypt',
  'fleet:unit:field:insurance:view',
  'fleet:unit:field:compliance:view',
  'fleet:catalog:view',
  'fleet:catalog:manage',
  'maint:record:view:any',
  'maint:template:view',
  'maint:forecast:view',
  'intelligence:tco:view',
  'intelligence:tco:export',
  'intelligence:anomaly:view',
  'intelligence:anomaly:manage',
  'intelligence:scorecard:view',
  'intelligence:co2:view',
  'intelligence:economic-life:view',
  'intelligence:recall:view',
  'intelligence:recall:manage',
  'intelligence:report:export',
  'alert:view:any',
  'alert:manage:any',
  'alert:config:edit',
  'workorder:view:any',
  'workorder:close',
  'geolocation:view:any',
  'geolocation:realtime:view',
  'servicecenters:view',
  'areas:view',
  'notifications:view:own',
  'document:file:upload',
  'document:file:download'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 5 — Planificador de Rutas                                          │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE slug IN (
  'fleet:unit:view:any',
  'route:record:view:any',
  'route:record:create',
  'route:record:edit:any',
  'route:record:delete:any',
  'route:record:forensic:view',
  'route:waypoint:manage',
  'route:checklist:submit',
  'route:checklist:view',
  'geolocation:view:any',
  'geolocation:realtime:view',
  'alert:view:any',
  'workorder:view:any',
  'areas:view',
  'notifications:view:own'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 6 — Supervisor de Tránsito                                         │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE slug IN (
  'fleet:unit:view:any',
  'route:record:view:any',
  'route:record:edit:any',
  'route:record:forensic:view',
  'route:checklist:view',
  'alert:view:any',
  'alert:manage:any',
  'workorder:view:any',
  'geolocation:view:any',
  'geolocation:realtime:view',
  'notifications:view:own'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 7 — Administrador de RRHH                                          │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE slug IN (
  'users:collaborator:view',
  'users:collaborator:create',
  'users:collaborator:edit:any',
  'users:collaborator:delete',
  'users:profile-image:manage',
  'admin:membership:manage',
  'admin:owner:view',
  'admin:audit:view',
  'fleet:unit:view:own',
  'areas:view',
  'servicecenters:view',
  'notifications:view:own',
  'notifications:config:edit'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 8 — Administrador de TI                                            │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions WHERE slug IN (
  'admin:role:view',
  'admin:role:create',
  'admin:role:edit',
  'admin:role:delete',
  'admin:tenant:view',
  'admin:owner:view',
  'admin:audit:view',
  'security:audit:view',
  'security:audit:export',
  'security:incident:view',
  'users:collaborator:view',
  'notifications:broadcast',
  'fleet:unit:view:any',
  'maint:record:view:any',
  'route:record:view:any',
  'finance:dashboard:view:any',
  'intelligence:tco:view',
  'alert:view:any',
  'document:file:download'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 9 — Cliente Externo (portal only · AES mask enforced always)       │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 9, id FROM permissions WHERE slug IN (
  'portal:dashboard:view',
  'portal:fleet:view:own',
  'portal:report:download',
  'portal:invoice:view',
  'notifications:view:own',
  'notifications:manage:own'
);

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ ROLE 10 — Operador / Familiar (solo propio Owner · operación diaria)    │
-- └────────────────────────────────────────────────────────────────────────┘
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 10, id FROM permissions WHERE slug IN (
  'fleet:unit:view:own',
  'route:record:view:own',
  'route:record:create',
  'route:checklist:submit',
  'maint:record:view:own',
  'alert:view:own',
  'workorder:view:own',
  'workorder:create',
  'users:collaborator:edit:own',
  'users:profile-image:manage',
  'notifications:view:own',
  'notifications:manage:own',
  'notifications:config:edit',
  'geolocation:view:own'
);

SET FOREIGN_KEY_CHECKS = 1;
