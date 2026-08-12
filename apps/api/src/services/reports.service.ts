import { RowDataPacket } from 'mysql2';
import PDFDocument from 'pdfkit';
import db from './db';
import * as ReportsRepository from './reports.repository';
import { resolveOwnerScope as resolveScope } from './ownerScopeResolver';

/**
 * FC157 F1 — ReportsService: orchestration only, zero SQL, zero Fastify
 * (invariants I1/I2). Resolves the caller's owner scope via the shared
 * `ownerScopeResolver.ts` SSOT (Cond.R-157-R4 — no local copy) and delegates
 * all persistence to `reports.repository.ts` (I3). Call order preserved
 * verbatim from the pre-migration `routes/reports.ts` so the existing suite
 * keeps passing unmodified.
 */

export interface ReportsUser {
  id: number;
  permissions?: string[];
  tenant_id?: number | null;
}

/** Cond.R-157-R4 — delegates exclusively to the ownerScopeResolver.ts SSOT (preserves FC144). */
export function resolveOwnerScope(user: ReportsUser): Promise<number[] | null> {
  return resolveScope(user);
}

const LABELS: Record<string, string> = {
  unit_id: 'Unidad',
  service_date: 'Fecha de servicio',
  service_type: 'Tipo de servicio',
  service_mode: 'Modalidad',
  movement_status: 'Estatus',
  odometer_at_service: 'Odómetro inicial',
  odometer_at_close: 'Odómetro al cierre',
  cost: 'Costo',
  technician: 'Técnico',
};

function renderPdf(movement: RowDataPacket, details: RowDataPacket[]): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text('ARCHON — Orden de Mantenimiento', { align: 'center' });
  doc.moveDown();
  Object.entries(LABELS).forEach(([key, label]) => {
    const value = movement[key];
    doc.fontSize(10).text(`${label}: ${value ?? '—'}`);
  });
  doc.moveDown();
  doc.fontSize(12).text('Tareas del servicio');
  if (details.length === 0) {
    doc.fontSize(10).text('Sin tareas registradas.');
  }
  details.forEach((task) => {
    doc.fontSize(10).text(`• ${task.label ?? task.taskCode}: ${task.statusLabel ?? task.status}`);
  });
  doc.moveDown();
  doc
    .fontSize(8)
    .text('Documento generado por Archon. Datos sensibles enmascarados conforme a política §8.1.');
  doc.end();
  return done;
}

/** Orchestrates `GET /reports/maintenance/:uuid/pdf` — `null` if the order isn't found/owned. */
export async function getMaintenanceOrderPdf(
  user: ReportsUser,
  uuid: string
): Promise<Buffer | null> {
  const movement = await ReportsRepository.findMaintenanceOrderByUuid(uuid, db);
  if (movement === null) return null;

  const ownerScope = await resolveOwnerScope(user);
  if (ownerScope !== null) {
    if (ownerScope.length === 0) return null;
    const owned = await ReportsRepository.isUnitOwned(movement.unit_id as string, ownerScope, db);
    if (!owned) return null;
  }

  const details = await ReportsRepository.findMaintenanceDetails(movement.id as number, db);
  return renderPdf(movement, details);
}
