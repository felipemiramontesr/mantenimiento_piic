-- Migration 170: FC 082 F3a — Siembra del chasis Arc (permissions + cosmonaut_roles
-- + cosmonaut_role_permissions + cosmonaut_role_assignments). Primer paso de F3
-- (chasis Arc, re-anclaje `auth.ts`), la última fase de FC082 antes del cierre TOTAL.
--
-- ALCANCE (087_AN_Fc082_F3_Chasis_Arc_Design.md §7.5/§8, O✓ Alfa + R✓ Bravo
-- CONDICIONADO 8/8, 2026-07-24/25): CERO cambio de comportamiento. `auth.ts`
-- no se toca — el sistema legacy (`roles`/`user_roles`/`role_permissions`)
-- sigue siendo la única fuente de verdad del JWT hasta F3b. Esta migración
-- solo puebla datos que el chasis (ya construido por un FC anterior no
-- rastreado en K, `FC24 FaseC` — ver 085_AN §1) puede empezar a consumir en
-- fases futuras.
--
-- Cond.1 Bravo (F3a original) — inventario REAL de permission slugs antes de
-- sembrar, no un catálogo inventado: 144 slugs = los 141 ya diseñados y en
-- uso activo por requirePermission()/requireOwnership() en 27 archivos de
-- rutas (migración 150, FC-18 FaseD-1) + 3 slugs adicionales confirmados en
-- uso real vía permissions.includes() directo (bypasean requirePermission):
-- fleet:scoped (marcador de scope, 14+ archivos), user:admin y
-- system:manage_roles (keys de LEGACY_ALIASES en requirePermission.ts que
-- TAMBIÉN se chequean directo en areas.ts/ownerProfile.ts/
-- realtimeTelemetry.ts/social.ts/admin.ts).
--
-- Taxonomía de roles (087_AN §7.1, resuelta por Ω tras descartar la versión
-- de 7 roles): exactamente 3 roles R_global —
--   GrayMan — Ω, Omnipotente/Omnipresente, mapea a role_id=0 legacy.
--   MU      — Master of Universe (§24.12.2).
--   Arc     — el ITINERANTE de §24.15 (tenant_id=NULL, consume vía Arcsial).
-- Los 4 roles "operacionales" de la migración 155 (Mecánico/Supervisor/
-- Operador/Auditor) NO se reusan ni se reinventan aquí — quedan retirados
-- de R_global por decisión de Ω (resuelve Cond.5 de la auditoría original
-- de Bravo sobre FC082 por eliminación, no por renombre).
--
-- Cond.4 Bravo (documentar explícitamente, no dejarlo implícito): el rol
-- `Arc` (identidad R_global, capa A) NO es lo mismo que ser miembro formal
-- de un Universo (`Arcs(U)` de §24.12, capa B — `tenant_user_memberships`/
-- `cosmonaut_type`, invariantes I1/I2/I4 intactos, sin cambios en esta
-- migración). Un Arc que colabora en un Universo específico (ej. "Jefe de
-- Flotilla" en un universo FMS) no se vuelve un rol distinto — sostiene una
-- o más filas `cosmonaut_role_assignments` con `tenant_id = U.id` apuntando
-- a un rol R_universe de ese universo (mecanismo ya existente vía
-- `POST /v1/cosmonauts/roles`, sin cambios aquí). Esa asignación es
-- capacidad (capa C), no membresía. El scope real de acceso a DATOS (capa D,
-- BOLA — owner membership / fleet:scoped) es un mecanismo aparte que esta
-- migración NO toca y que F3b debe anclar explícitamente (advertencia A1-S
-- de Bravo, Cond.5-8 heredadas, no aplican a esta migración de solo-DB).
--
-- Modelo de permisos (087_AN §7.2/§8, Cond.1/Cond.3 Bravo):
--   permissions(Arc) = subset least-privilege (perfil de negocio, sin admin:*)
--   permissions(MU)  = permissions(Arc) ∪ {admin:* explícitos de su propio
--                       Universo} — DELIBERADAMENTE excluye admin:tenant:*
--                       (create/edit/delete de OTROS Tenants es "nivel
--                       Plataforma" según su propia descripción en mig.150;
--                       crear un Universo sigue siendo exclusivo de Ω, I2).
--   permissions(GrayMan) = sin filas en cosmonaut_role_permissions — su
--                       bypass ('*') ya es universal en todo middleware
--                       existente (requirePermission.ts, requireOwnership.ts,
--                       cosmonautMiddleware.ts, etc.), independiente de esta
--                       tabla. F3b DEBE preservar ese bypass (Cond.1 R final).
--
-- Idempotente: INSERT IGNORE (permissions, cosmonaut_role_permissions,
-- cosmonaut_role_assignments) + WHERE NOT EXISTS (cosmonaut_roles, mismo
-- patrón que mig.155 — UNIQUE no protege NULLs en tenant_id bajo MySQL 5.7).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ═══ (1) Sembrar permissions — 144 slugs reales ═══════════════════════════
-- Los 141 de la migración 150 (FC-18 FaseD-1), verbatim, + 3 adicionales
-- confirmados en uso real (Cond.1 Bravo).

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

-- ── MODULE: document — Archivos y Documentos ──────────────────────────────────
('document:file:upload',   'Subir archivos y documentos adjuntos'),
('document:file:download', 'Descargar archivos y documentos adjuntos'),

-- ── ADICIONALES (F3a Cond.1 — confirmados en uso real, ausentes de mig.150) ──
('fleet:scoped',        'Marcador de scope: acceso limitado a las unidades del propio Owner/Supercluster (no es capacidad, es bandera de alcance consumida por requireOwnership/checks manuales)'),
('user:admin',           'Alias legacy de admin:role:edit — chequeado directo (sin resolución de alias) en areas.ts/ownerProfile.ts/realtimeTelemetry.ts/social.ts/admin.ts'),
('system:manage_roles',  'Alias legacy de admin:role:edit — chequeado directo en admin.ts');

-- ═══ (2) Sembrar cosmonaut_roles — 3 roles R_global ═══════════════════════
-- is_system=1: flag inmutable, solo Ω puede modificar R_global (I9 §24.13).
-- WHERE NOT EXISTS: UNIQUE no protege NULLs en tenant_id bajo MySQL 5.7,
-- mismo patrón que mig.155.

INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system)
SELECT NULL, 'GrayMan', 'Omnipotente/Omnipresente (Ω) — bypass total, sin filas en cosmonaut_role_permissions (ver nota de diseño en el header de esta migración)', 1
WHERE NOT EXISTS (SELECT 1 FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = 'GrayMan');

INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system)
SELECT NULL, 'MU', 'Master of Universe (§24.12.2) — gobierna un Universo; permissions = Arc ∪ admin:* explícitos de su propio Universo (excluye admin:tenant:*, nivel Plataforma exclusivo de Ω)', 1
WHERE NOT EXISTS (SELECT 1 FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = 'MU');

INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system)
SELECT NULL, 'Arc', 'Arc Itinerante (§24.15) — consumidor sin Universo fijo vía Arcsial. Responsabilidades dentro de un Universo específico se modelan como asignaciones R_universe adicionales (cosmonaut_role_assignments, tenant_id=U.id), NO como un rol distinto ni como membresía formal — ver Cond.4 en el header de esta migración', 1
WHERE NOT EXISTS (SELECT 1 FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = 'Arc');

-- ═══ (3) Sembrar cosmonaut_role_permissions — grants MU ⊇ Arc ═════════════
-- GrayMan: intencionalmente SIN filas aquí — su bypass ('*') es universal en
-- runtime, independiente de esta tabla (Cond.1 R final Bravo).

INSERT IGNORE INTO cosmonaut_role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM cosmonaut_roles cr
JOIN permissions p ON (
  -- Arc — least-privilege: autoservicio + participación social vía Arcsial.
  -- Sin fleet/maint/route/finance/admin operativos (esos son responsabilidad
  -- de un Universo específico, otorgada vía R_universe, no por defecto).
  (cr.name = 'Arc' AND p.slug IN (
    'social:post:view',
    'social:post:create',
    'social:post:edit:own',
    'social:review:view',
    'users:collaborator:edit:own',
    'users:profile-image:manage',
    'notifications:view:own',
    'notifications:manage:own',
    'notifications:config:edit',
    'document:file:upload',
    'document:file:download'
  )) OR
  -- MU — todo lo de Arc (§7.2/§8: permissions(MU) ⊇ permissions(Arc), un MU
  -- también consume Arcsial como cualquier Arc) + administración explícita
  -- de SU PROPIO Universo (admin:owner:*, admin:role:*, admin:membership,
  -- admin:service-link, admin:audit — NUNCA admin:tenant:*, eso es crear/
  -- editar/eliminar OTROS Tenants, nivel Plataforma exclusivo de Ω, I2).
  (cr.name = 'MU' AND p.slug IN (
    'social:post:view',
    'social:post:create',
    'social:post:edit:own',
    'social:review:view',
    'users:collaborator:edit:own',
    'users:profile-image:manage',
    'notifications:view:own',
    'notifications:manage:own',
    'notifications:config:edit',
    'document:file:upload',
    'document:file:download',
    'admin:owner:view',
    'admin:owner:create',
    'admin:owner:edit',
    'admin:owner:delete',
    'admin:role:view',
    'admin:role:create',
    'admin:role:edit',
    'admin:role:delete',
    'admin:membership:manage',
    'admin:service-link:manage',
    'admin:audit:view'
  ))
)
WHERE cr.tenant_id IS NULL AND cr.name IN ('Arc', 'MU');

-- ═══ (4) Mapear GrayMan (role_id=0 legacy) al rol GrayMan del chasis ═════
-- tenant_id=NULL: asignación global de Ω, coherente con que Ω vive fuera de
-- todo K(U) (§24.12.5). No se identifica por un id numérico fijo — se
-- localiza por role_id=0, el mismo predicado canónico que usa el resto del
-- sistema (EsGrayMan).
-- WHERE NOT EXISTS, NO INSERT IGNORE: uq_assignment_scope(user_id, role_id,
-- tenant_id) NO protege contra duplicados aquí porque tenant_id es NULL —
-- MySQL/MariaDB tratan cada NULL como distinto dentro de un índice UNIQUE
-- (NULL ≠ NULL), el mismo hallazgo que mig.155 ya documentó para
-- cosmonaut_roles. Confirmado empíricamente: una primera versión de este
-- paso con INSERT IGNORE creó una fila duplicada en la segunda corrida de
-- prueba local antes de corregirse a WHERE NOT EXISTS.

INSERT INTO cosmonaut_role_assignments (user_id, role_id, tenant_id, assigned_by)
SELECT u.id, cr.id, NULL, u.id
FROM users u
JOIN cosmonaut_roles cr ON cr.tenant_id IS NULL AND cr.name = 'GrayMan'
WHERE u.role_id = 0
  AND NOT EXISTS (
    SELECT 1 FROM cosmonaut_role_assignments cra
    WHERE cra.user_id = u.id AND cra.role_id = cr.id AND cra.tenant_id IS NULL
  );

SET FOREIGN_KEY_CHECKS = 1;

-- ═══ Verificación ══════════════════════════════════════════════════════
SELECT 'permissions_count' k, COUNT(*) v FROM permissions
UNION SELECT 'cosmonaut_roles_r_global_count', COUNT(*) FROM cosmonaut_roles WHERE tenant_id IS NULL
UNION SELECT 'cosmonaut_role_permissions_arc', (SELECT COUNT(*) FROM cosmonaut_role_permissions crp JOIN cosmonaut_roles cr ON cr.id = crp.role_id WHERE cr.name = 'Arc')
UNION SELECT 'cosmonaut_role_permissions_mu', (SELECT COUNT(*) FROM cosmonaut_role_permissions crp JOIN cosmonaut_roles cr ON cr.id = crp.role_id WHERE cr.name = 'MU')
UNION SELECT 'cosmonaut_role_permissions_grayman', (SELECT COUNT(*) FROM cosmonaut_role_permissions crp JOIN cosmonaut_roles cr ON cr.id = crp.role_id WHERE cr.name = 'GrayMan')
UNION SELECT 'grayman_assignment_count', (SELECT COUNT(*) FROM cosmonaut_role_assignments cra JOIN cosmonaut_roles cr ON cr.id = cra.role_id JOIN users u ON u.id = cra.user_id WHERE cr.name = 'GrayMan' AND u.role_id = 0);
-- Esperado: permissions_count=144 · cosmonaut_roles_r_global_count=3 ·
-- cosmonaut_role_permissions_arc=11 · cosmonaut_role_permissions_mu=22
-- (11 de Arc + 11 admin:* explícitos) · cosmonaut_role_permissions_grayman=0
-- · grayman_assignment_count=1 (por cada usuario con role_id=0 existente al
-- momento de aplicar).

SELECT id, tenant_id, name, is_system FROM cosmonaut_roles WHERE tenant_id IS NULL ORDER BY name;
