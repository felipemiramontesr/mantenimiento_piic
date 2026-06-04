/**
 * 🔱 Archon Node System — Shared Primitives (DRY)
 * Single source of truth for all sovereign node pages.
 * Import from this module; never duplicate in individual nodes.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import AT from '../../../styles/archonTypography';

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatMXN(v?: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  });
}

export function formatDate(s?: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(s?: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatKm(v?: number | null): string {
  if (v == null) return '—';
  return `${Number(v).toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} km`;
}

export function formatNum(v: number | null | undefined, unit: string, decimals = 0): string {
  if (v == null) return '—';
  return `${Number(v).toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })} ${unit}`;
}

export function formatHours(v: number | null | undefined): string {
  if (!v) return '—';
  return `${Number(v).toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} h`;
}

export function formatPct(v: number | null | undefined, decimals = 1): string {
  if (v == null) return '—';
  return `${Number(v).toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}%`;
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0 gap-4">
      <span className={AT.cellMeta}>{label}</span>
      <span className={`${AT.cellValue} text-right`}>{value ?? '—'}</span>
    </div>
  );
}

export function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="card-archon-sovereign">
      <div className="card-sovereign-header mb-4">
        {icon}
        <span className="card-sovereign-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function NodeLoadingState(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center py-32 gap-3">
      <RefreshCw size={18} className="animate-spin text-[#0f2a44]/30" />
      <span className={AT.sectionTitle}>Cargando…</span>
    </div>
  );
}

export function NodeErrorState({
  error,
  backTo,
  backLabel,
}: {
  error: string | null;
  backTo: string;
  backLabel: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <AlertTriangle size={32} className="text-red-400" />
      <p className={AT.cellValue}>{error ?? 'Registro no encontrado'}</p>
      <Link
        to={backTo}
        className="text-archon-base font-black text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors flex items-center gap-1.5"
      >
        <ChevronLeft size={14} /> {backLabel}
      </Link>
    </div>
  );
}

export function NodeBackLink({ to, label }: { to: string; label: string }): React.JSX.Element {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-archon-sm font-black uppercase tracking-widest text-[#0f2a44]/40 hover:text-[#0f2a44] transition-colors w-fit"
    >
      <ChevronLeft size={13} /> {label}
    </Link>
  );
}

// ─── Status / Severity maps ───────────────────────────────────────────────────

export const MOVEMENT_STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  ACTIVE: 'bg-blue-100 text-blue-700 border border-blue-200',
  OPEN: 'bg-amber-100 text-amber-700 border border-amber-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border border-slate-200',
};

export const MOVEMENT_STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Completado',
  ACTIVE: 'Activo',
  OPEN: 'Abierto',
  CANCELLED: 'Cancelado',
};

export const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border border-amber-200',
  LOW: 'bg-blue-100 text-[#0f2a44]/60 border border-blue-200',
};

export const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Medio',
  LOW: 'Bajo',
};

export const INCIDENT_CATEGORY_LABEL: Record<string, string> = {
  MECANICA: 'Mecánica',
  SINIESTRO: 'Siniestro',
  LEGAL: 'Legal',
  OPERATIVA: 'Operativa',
  OTRA: 'Otra',
};
