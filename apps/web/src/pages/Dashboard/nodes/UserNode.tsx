import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Shield, Map, ExternalLink } from 'lucide-react';
import api from '../../../api/client';
import { useSovereignLayout } from '../../../context/SovereignLayoutContext';
import AT from '../../../styles/archonTypography';
import {
  InfoRow,
  SectionCard,
  NodeLoadingState,
  NodeErrorState,
  NodeBackLink,
  formatDate,
  formatDateTime,
  MOVEMENT_STATUS_BADGE,
  MOVEMENT_STATUS_LABEL,
} from './NodeShared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRecord {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role_id: number;
  role_name: string;
  department_name: string | null;
  employee_number: string | null;
  is_active: number;
  last_login: string | null;
  created_at: string;
  profile_picture_url: string | null;
}

interface Permission {
  slug: string;
  description: string;
}

interface RouteRecord {
  uuid: string;
  unit_id: string;
  destination: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
}

interface NodeData {
  user: UserRecord;
  permissions: Permission[];
  recentRoutes: RouteRecord[];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const UserNode: React.FC = (): React.JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const { setSectionData } = useSovereignLayout();
  const [node, setNode] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = React.useState<string | null>(null);

  useEffect(() => {
    setSectionData(id ?? 'Usuario', 'Perfil · Permisos · Actividad reciente');
  }, [id, setSectionData]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/auth/users/${id}/node`)
      .then((res) => {
        const data = res.data.data as NodeData;
        setNode(data);
        setImgSrc(data.user.profile_picture_url);
      })
      .catch(() => setError('No se pudo cargar el perfil'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <NodeLoadingState />;
  if (!node) return <NodeErrorState error={error} backTo="/dashboard/users" backLabel="Personal" />;

  const { user, permissions, recentRoutes } = node;
  const isActive = Boolean(user.is_active);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-12">
      <NodeBackLink to="/dashboard/users" label="Personal" />

      {/* Cabecera */}
      <div className="card-archon-sovereign !flex-row !items-center gap-6 !p-6">
        <div className="w-20 h-20 shrink-0 rounded-full overflow-hidden bg-slate-50 border border-slate-100">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={user.username}
              className="w-full h-full object-cover"
              onError={(): void => setImgSrc(null)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0f2a44]/5">
              <User size={28} className="text-[#0f2a44]/20" />
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl font-black text-[#0f2a44] tracking-tight">
              {user.full_name}
            </span>
            <span
              className={`text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <span className={`${AT.cellMono} text-[#0f2a44]/60`}>@{user.username}</span>
          <div className="flex items-center gap-4 flex-wrap mt-0.5">
            <span className="text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] bg-[#0f2a44]/5 text-[#0f2a44]">
              {user.role_name}
            </span>
            {user.department_name && <span className={AT.cellSubtle}>{user.department_name}</span>}
          </div>
        </div>
        <div className="hidden md:flex flex-col items-center gap-1 shrink-0">
          <span className={AT.sectionDescription}>Permisos asignados</span>
          <span className="text-3xl font-black text-[#0f2a44]">{permissions.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Perfil */}
        <SectionCard
          title="Perfil de Identidad"
          icon={<User size={16} className="text-[#f2b705]" />}
        >
          <InfoRow label="Nombre completo" value={user.full_name} />
          <InfoRow label="Usuario" value={`@${user.username}`} />
          <InfoRow label="Correo electrónico" value={user.email} />
          <InfoRow label="Número de empleado" value={user.employee_number} />
          <InfoRow label="Rol" value={user.role_name} />
          <InfoRow label="Departamento" value={user.department_name} />
          <InfoRow label="Estado" value={isActive ? 'Activo' : 'Inactivo'} />
          <InfoRow label="Último acceso" value={formatDateTime(user.last_login)} />
          <InfoRow label="Fecha de alta" value={formatDate(user.created_at)} />
        </SectionCard>

        {/* Permisos */}
        <SectionCard
          title={`Permisos (${permissions.length})`}
          icon={<Shield size={16} className="text-[#f2b705]" />}
        >
          {permissions.length === 0 ? (
            <p className={`${AT.sectionDescription} text-center py-4`}>Sin permisos asignados</p>
          ) : (
            <div className="flex flex-col gap-1">
              {permissions.map((p) => (
                <div
                  key={p.slug}
                  className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                >
                  <span className={`${AT.cellMono} text-[#0f2a44]`}>{p.slug}</span>
                  <span className={`${AT.cellMeta} text-right max-w-[55%]`}>{p.description}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Actividad reciente */}
      {recentRoutes.length > 0 && (
        <SectionCard
          title={`Rutas Recientes (${recentRoutes.length})`}
          icon={<Map size={16} className="text-[#f2b705]" />}
        >
          <div className="flex flex-col divide-y divide-slate-100">
            {recentRoutes.map((r) => {
              const badge = MOVEMENT_STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-500';
              return (
                <div key={r.uuid} className="flex items-center gap-4 py-3">
                  <span
                    className={`shrink-0 text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] ${badge}`}
                  >
                    {MOVEMENT_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={AT.cellValue}>{r.destination}</p>
                    <p className={`${AT.cellMeta} mt-0.5`}>
                      {r.unit_id} · {formatDate(r.start_at)}
                    </p>
                  </div>
                  <Link
                    to={`/dashboard/routes/${r.uuid}`}
                    className="shrink-0 inline-flex items-center gap-1 text-archon-xs font-black uppercase tracking-widest text-[#0f2a44]/40 hover:text-[#0f2a44] transition-colors"
                  >
                    Ver nodo <ExternalLink size={10} />
                  </Link>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <div className="flex items-center pt-4 border-t border-slate-100">
        <NodeBackLink to="/dashboard/users" label="Volver a Personal" />
      </div>
    </div>
  );
};

export default UserNode;
