import { RowDataPacket } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';
import db from './db';

/**
 * FC126 F1 — RouteRoutesRepository: SQL boundary (I3) for the read queries
 * that originate directly in `routes/fleetRoutes.ts` (ownership-scope
 * lookups, route/activity-log listing, node views). See
 * `routeMovements.repository.ts` for why the original monolithic file was
 * split (Gate 1 max-lines:400). `UNIT_ACTIVITY_LOGS_BASE_QUERY` lives at
 * module scope, not inlined in its function, so the function itself stays
 * under Gate 1's max-lines-per-function:50 — the query text is long because
 * the forensic journal genuinely unions 3 heterogeneous sources, not because
 * the function is doing too much.
 */

type Executor = Pool | PoolConnection;

// ─── routes/fleetRoutes.ts — ownership scope checks ─────────────────────────

/** Resolves a route's unit ownerId, for owner-scope checks. */
export async function findRouteOwnerByUuid(
  uuid: string,
  executor: Executor = db
): Promise<number | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fu.ownerId FROM fleet_movements fm JOIN fleet_units fu ON fm.unit_id = fu.id
     WHERE fm.uuid = ? AND fm.movement_type = "ROUTE"`,
    [uuid]
  );
  return rows.length > 0 ? (rows[0].ownerId as number) : null;
}

/** Resolves an incident's unit ownerId, for owner-scope checks. */
export async function findIncidentOwnerByUuid(
  uuid: string,
  executor: Executor = db
): Promise<number | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fu.ownerId
     FROM route_incidents ri
     JOIN fleet_movements fm ON ri.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
     JOIN fleet_units fu ON fm.unit_id = fu.id
     WHERE ri.uuid = ?`,
    [uuid]
  );
  return rows.length > 0 ? (rows[0].ownerId as number) : null;
}

/** Resolves a fleet unit's ownerId, for owner-scope checks. */
export async function findUnitOwner(
  unitId: string,
  executor: Executor = db
): Promise<number | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT ownerId FROM fleet_units WHERE id = ?',
    [unitId]
  );
  return rows.length > 0 ? (rows[0].ownerId as number) : null;
}

// ─── routes/fleetRoutes.ts — GET /routes ─────────────────────────────────────

/** Lists routes with incident counts, filtered to an owner scope when scoped. */
export async function listRoutesForOwnerScope(
  ownerScope: number[] | null,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  let query = `SELECT
      fm.id, fm.uuid, fm.unit_id,
      fre.driver_id AS operator_id,
      fre.origin_id,
      fre.destination_neighborhood_id,
      fre.destination,
      fm.status,
      fm.start_reading AS start_km,
      fm.end_reading AS end_km,
      fm.start_at AS start_time,
      fm.end_at AS end_time,
      fm.fuel_level_start, fm.fuel_level_end,
      fm.fuel_liters_loaded, fm.fuel_amount, fm.fuel_ticket_image,
      fre.additives_check, fre.tire_pressure_json, fre.checklist_json,
      fm.description,
      fm.created_at,
      (
        SELECT COUNT(*) FROM route_incidents i WHERE i.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
      ) + (
        SELECT COUNT(*) FROM administrative_audit_logs a
        WHERE a.entity_id = fm.uuid COLLATE utf8mb4_unicode_ci AND a.entity_type = 'route_log'
      ) AS incident_count
    FROM fleet_movements fm
    JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
    JOIN fleet_units fu ON fm.unit_id = fu.id
    WHERE fm.movement_type = 'ROUTE'`;

  const params: (string | number)[] = [];
  if (ownerScope !== null) {
    if (ownerScope.length === 0) return [];
    query += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
    params.push(...ownerScope);
  }
  query += ` ORDER BY fm.created_at DESC`;

  const [rows] = await executor.execute<RowDataPacket[]>(query, params);
  return rows;
}

// ─── routes/fleetRoutes.ts — GET /unit-logs ──────────────────────────────────

// FC126 F1 — module-scope constant (not inlined in the function below) so
// the 150+ physical lines this 3-way UNION genuinely needs don't count
// against Gate 1's max-lines-per-function:50. Verbatim from the pre-migration
// query in routes/fleetRoutes.ts — 0 semantic change.
const UNIT_ACTIVITY_LOGS_BASE_QUERY = `
    SELECT
      l.*,
      u.full_name as operatorName,
      c_brand.label as marca,
      c_model.label as modelo,
      c_loc.label as unit_sede,
      rext.destination as route_destination,
      c_origin.label as route_origin_label
    FROM (
      SELECT
        CONVERT(id USING utf8mb4) COLLATE utf8mb4_general_ci as id,
        unit_id COLLATE utf8mb4_general_ci as unit_id,
        event_type COLLATE utf8mb4_general_ci as event_type,
        reference_id COLLATE utf8mb4_general_ci as reference_id,
        reading_before, reading_after,
        status_before COLLATE utf8mb4_general_ci as status_before,
        status_after COLLATE utf8mb4_general_ci as status_after,
        description COLLATE utf8mb4_general_ci as description,
        created_by,
        created_at,
        NULL as fuel_before,
        NULL as fuel_after,
        NULL as fuel_level_before,
        NULL as fuel_level_after,
        NULL as fuel_amount_before,
        NULL as fuel_amount_after,
        NULL as snapshot_before,
        NULL as snapshot_after
      FROM unit_activity_logs

      UNION ALL

      SELECT
        CONVERT(a.uuid USING utf8mb4) COLLATE utf8mb4_general_ci as id,
        CONVERT(COALESCE(JSON_VALUE(a.snapshot_after, '$.unit_id'), r.unit_id) USING utf8mb4) COLLATE utf8mb4_general_ci as unit_id,
        'ADMIN_EDIT' COLLATE utf8mb4_general_ci as event_type,
        CONVERT(a.entity_id USING utf8mb4) COLLATE utf8mb4_general_ci as reference_id,
        CAST(
          CASE
            WHEN JSON_VALUE(a.snapshot_before, '$.end_reading') <> JSON_VALUE(a.snapshot_after, '$.end_reading')
                 OR (JSON_VALUE(a.snapshot_before, '$.end_reading') IS NULL AND JSON_VALUE(a.snapshot_after, '$.end_reading') IS NOT NULL)
                 OR (JSON_VALUE(a.snapshot_before, '$.end_reading') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.end_reading') IS NULL)
            THEN JSON_VALUE(a.snapshot_before, '$.end_reading')
            WHEN JSON_VALUE(a.snapshot_before, '$.start_reading') <> JSON_VALUE(a.snapshot_after, '$.start_reading')
                 OR (JSON_VALUE(a.snapshot_before, '$.start_reading') IS NULL AND JSON_VALUE(a.snapshot_after, '$.start_reading') IS NOT NULL)
                 OR (JSON_VALUE(a.snapshot_before, '$.start_reading') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.start_reading') IS NULL)
            THEN JSON_VALUE(a.snapshot_before, '$.start_reading')
            ELSE COALESCE(JSON_VALUE(a.snapshot_before, '$.end_reading'), JSON_VALUE(a.snapshot_before, '$.start_reading'))
          END AS DECIMAL(12,2)
        ) as reading_before,
        CAST(
          CASE
            WHEN JSON_VALUE(a.snapshot_before, '$.end_reading') <> JSON_VALUE(a.snapshot_after, '$.end_reading')
                 OR (JSON_VALUE(a.snapshot_before, '$.end_reading') IS NULL AND JSON_VALUE(a.snapshot_after, '$.end_reading') IS NOT NULL)
                 OR (JSON_VALUE(a.snapshot_before, '$.end_reading') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.end_reading') IS NULL)
            THEN JSON_VALUE(a.snapshot_after, '$.end_reading')
            WHEN JSON_VALUE(a.snapshot_before, '$.start_reading') <> JSON_VALUE(a.snapshot_after, '$.start_reading')
                 OR (JSON_VALUE(a.snapshot_before, '$.start_reading') IS NULL AND JSON_VALUE(a.snapshot_after, '$.start_reading') IS NOT NULL)
                 OR (JSON_VALUE(a.snapshot_before, '$.start_reading') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.start_reading') IS NULL)
            THEN JSON_VALUE(a.snapshot_after, '$.start_reading')
            ELSE COALESCE(JSON_VALUE(a.snapshot_after, '$.end_reading'), JSON_VALUE(a.snapshot_after, '$.start_reading'))
          END AS DECIMAL(12,2)
        ) as reading_after,
        CONVERT(JSON_VALUE(a.snapshot_before, '$.status') USING utf8mb4) COLLATE utf8mb4_general_ci as status_before,
        CONVERT(JSON_VALUE(a.snapshot_after, '$.status') USING utf8mb4) COLLATE utf8mb4_general_ci as status_after,
        CONVERT(a.reason USING utf8mb4) COLLATE utf8mb4_general_ci as description,
        a.user_id as created_by,
        a.created_at,
        CAST(JSON_VALUE(a.snapshot_before, '$.fuel_liters_loaded') AS DECIMAL(10,2)) as fuel_before,
        CAST(JSON_VALUE(a.snapshot_after, '$.fuel_liters_loaded') AS DECIMAL(10,2)) as fuel_after,
        CAST(
          CASE
            WHEN JSON_VALUE(a.snapshot_before, '$.fuel_level_end') <> JSON_VALUE(a.snapshot_after, '$.fuel_level_end')
                 OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_end') IS NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_end') IS NOT NULL)
                 OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_end') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_end') IS NULL)
            THEN JSON_VALUE(a.snapshot_before, '$.fuel_level_end')
            WHEN JSON_VALUE(a.snapshot_before, '$.fuel_level_start') <> JSON_VALUE(a.snapshot_after, '$.fuel_level_start')
                 OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_start') IS NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_start') IS NOT NULL)
                 OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_start') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_start') IS NULL)
            THEN JSON_VALUE(a.snapshot_before, '$.fuel_level_start')
            ELSE COALESCE(JSON_VALUE(a.snapshot_before, '$.fuel_level_end'), JSON_VALUE(a.snapshot_before, '$.fuel_level_start'))
          END AS DECIMAL(5,2)
        ) as fuel_level_before,
        CAST(
          CASE
            WHEN JSON_VALUE(a.snapshot_before, '$.fuel_level_end') <> JSON_VALUE(a.snapshot_after, '$.fuel_level_end')
                 OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_end') IS NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_end') IS NOT NULL)
                 OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_end') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_end') IS NULL)
            THEN JSON_VALUE(a.snapshot_after, '$.fuel_level_end')
            WHEN JSON_VALUE(a.snapshot_before, '$.fuel_level_start') <> JSON_VALUE(a.snapshot_after, '$.fuel_level_start')
                 OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_start') IS NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_start') IS NOT NULL)
                 OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_start') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_start') IS NULL)
            THEN JSON_VALUE(a.snapshot_after, '$.fuel_level_start')
            ELSE COALESCE(JSON_VALUE(a.snapshot_after, '$.fuel_level_end'), JSON_VALUE(a.snapshot_after, '$.fuel_level_start'))
          END AS DECIMAL(5,2)
        ) as fuel_level_after,
        CAST(JSON_VALUE(a.snapshot_before, '$.fuel_amount') AS DECIMAL(12,2)) as fuel_amount_before,
        CAST(JSON_VALUE(a.snapshot_after, '$.fuel_amount') AS DECIMAL(12,2)) as fuel_amount_after,
        a.snapshot_before,
        a.snapshot_after
      FROM administrative_audit_logs a
      LEFT JOIN fleet_movements r ON a.entity_id = r.uuid COLLATE utf8mb4_unicode_ci AND r.movement_type = 'ROUTE'
      WHERE a.entity_type = 'route_log'

      UNION ALL

      SELECT
        CONVERT(ri.uuid USING utf8mb4) COLLATE utf8mb4_general_ci as id,
        CONVERT(fm.unit_id USING utf8mb4) COLLATE utf8mb4_general_ci as unit_id,
        'ROUTE_INCIDENT' COLLATE utf8mb4_general_ci as event_type,
        CONVERT(ri.route_uuid USING utf8mb4) COLLATE utf8mb4_general_ci as reference_id,
        CAST(fm.start_reading AS DECIMAL(12,2)) as reading_before,
        NULL as reading_after,
        'En Ruta' COLLATE utf8mb4_general_ci as status_before,
        'En Ruta' COLLATE utf8mb4_general_ci as status_after,
        CONVERT(CONCAT(cc_inc.code, ': ', SUBSTR(ri.description, 1, 100)) USING utf8mb4) COLLATE utf8mb4_general_ci as description,
        NULL as created_by,
        ri.reported_at as created_at,
        NULL as fuel_before,
        NULL as fuel_after,
        NULL as fuel_level_before,
        NULL as fuel_level_after,
        NULL as fuel_amount_before,
        NULL as fuel_amount_after,
        NULL as snapshot_before,
        NULL as snapshot_after
      FROM route_incidents ri
      JOIN fleet_movements fm ON fm.uuid = ri.route_uuid COLLATE utf8mb4_unicode_ci
      LEFT JOIN common_catalogs cc_inc ON cc_inc.id = ri.category_id
      WHERE NOT EXISTS (
        SELECT 1 FROM unit_activity_logs ual
        WHERE ual.reference_id = ri.route_uuid COLLATE utf8mb4_unicode_ci
          AND ual.event_type = 'ROUTE_INCIDENT'
      )
    ) l
    LEFT JOIN users u ON l.created_by = u.id
    LEFT JOIN fleet_units f ON l.unit_id = f.id
    LEFT JOIN common_catalogs c_loc ON f.locationId = c_loc.id AND c_loc.category = 'LOCATION'
    LEFT JOIN common_catalogs c_brand ON f.brandId = c_brand.id AND c_brand.category = 'BRAND'
    LEFT JOIN common_catalogs c_model ON f.modelId = c_model.id AND c_model.category = 'MODEL'
    LEFT JOIN fleet_movements rm ON l.reference_id = rm.uuid AND rm.movement_type = 'ROUTE'
    LEFT JOIN fleet_route_extensions rext ON rext.movement_id = rm.id
    LEFT JOIN common_catalogs c_origin ON rext.origin_id = c_origin.id AND c_origin.category = 'ROUTE_ORIGIN'
  `;

/** Lists the 3-source forensic activity journal, filtered to an owner scope when scoped. */
export async function listUnitActivityLogsForOwnerScope(
  ownerScope: number[] | null,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  const params: (string | number)[] = [];
  let scopeClause = '';
  if (ownerScope !== null) {
    if (ownerScope.length === 0) return [];
    scopeClause = `WHERE f.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
    params.push(...ownerScope);
  }
  const finalQuery = `${UNIT_ACTIVITY_LOGS_BASE_QUERY} ${scopeClause} ORDER BY l.created_at DESC`;
  const [rows] = await executor.execute<RowDataPacket[]>(finalQuery, params);
  return rows;
}

// ─── routes/fleetRoutes.ts — GET /routes/:uuid/node ──────────────────────────

/** Full route detail (unit/driver/catalogs joined) for the Sovereign node view. */
export async function findRouteNodeByUuid(
  uuid: string,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.id, fm.uuid, fm.unit_id, fm.status,
            fm.start_reading, fm.end_reading, fm.start_at, fm.end_at,
            fm.fuel_level_start, fm.fuel_level_end,
            fm.fuel_liters_loaded, fm.fuel_amount, fm.fuel_ticket_image,
            fm.description, fm.created_at,
            fre.driver_id, fre.origin_id, fre.destination,
            fre.destination_neighborhood_id,
            fre.additives_check, fre.tire_pressure_json, fre.checklist_json,
            u.full_name AS driver_name,
            (CASE WHEN u.role_id = 0 THEN 'GrayMan' ELSE NULL END) AS driver_role,
            c_brand.label AS unit_marca, c_model.label AS unit_modelo, fu.year AS unit_year
     FROM fleet_movements fm
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     LEFT JOIN users u ON fre.driver_id = u.id
     LEFT JOIN fleet_units fu ON fm.unit_id = fu.id
     LEFT JOIN common_catalogs c_brand ON fu.brandId = c_brand.id AND c_brand.category = 'BRAND'
     LEFT JOIN common_catalogs c_model ON fu.modelId = c_model.id AND c_model.category = 'MODEL'
     WHERE fm.uuid = ? AND fm.movement_type = 'ROUTE'`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Incidents attached to a route, for the Sovereign node view. */
export async function findRouteNodeIncidents(
  uuid: string,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT id, uuid, category, description, severity, status, reported_at
     FROM route_incidents WHERE route_uuid = ? ORDER BY reported_at DESC`,
    [uuid]
  );
  return rows;
}

// ─── routes/fleetRoutes.ts — GET /incidents/:uuid/node ───────────────────────

/** Full incident detail (route/unit/driver/catalogs joined) for the Sovereign node view. */
export async function findIncidentNodeByUuid(
  uuid: string,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT ri.id, ri.uuid, ri.route_uuid,
            cc_inc.code AS category, ri.description,
            ri.severity, ri.evidence_image, ri.status, ri.reported_at,
            fm.unit_id, fm.start_at AS route_start, fm.end_at AS route_end,
            fre.destination, fre.driver_id,
            u.full_name AS driver_name,
            c_brand.label AS unit_marca, c_model.label AS unit_modelo, fu.year AS unit_year
     FROM route_incidents ri
     JOIN fleet_movements fm ON ri.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     LEFT JOIN users u ON fre.driver_id = u.id
     LEFT JOIN fleet_units fu ON fm.unit_id = fu.id
     LEFT JOIN common_catalogs cc_inc ON cc_inc.id = ri.category_id
     LEFT JOIN common_catalogs c_brand ON fu.brandId = c_brand.id AND c_brand.category = 'BRAND'
     LEFT JOIN common_catalogs c_model ON fu.modelId = c_model.id AND c_model.category = 'MODEL'
     WHERE ri.uuid = ?`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}
