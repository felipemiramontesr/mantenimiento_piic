import React from 'react';
import {
  Settings,
  LayoutDashboard,
  Zap,
  Truck,
  Map,
  Users,
  Shield,
  BarChart3,
  Activity,
  FileText,
  Search,
  Cpu,
  Wrench,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import ArchonManagementCard from '../UI/ArchonManagementCard';

/**
 * 🔱 Archon Component: SovereignHeader
 * Implementation: Sovereign Identity & Section Metadata Orchestration
 * Objective: High-density header with dynamic titles, user profile menu, and industrial icons.
 * v.1.1.0 - Iconography Update
 */

const SovereignHeader: React.FC = () => {
  const { layoutData } = useSovereignLayout();

  // 🛡️ Icon Mapping Engine
  const getHeaderIcons = (title: string): { main: React.ElementType; sub: React.ElementType } => {
    const normalizedTitle = title.trim();
    if (normalizedTitle.includes('Comando')) return { main: LayoutDashboard, sub: Zap };
    if (normalizedTitle.includes('Flota')) return { main: Truck, sub: Settings };
    if (normalizedTitle.includes('Ruta')) return { main: Map, sub: Navigation };
    if (normalizedTitle.includes('Usuario')) return { main: Users, sub: Shield };
    if (normalizedTitle.includes('Financiera')) return { main: BarChart3, sub: Activity };
    if (normalizedTitle.includes('Registro') || normalizedTitle.includes('Log'))
      return { main: FileText, sub: Search };
    if (normalizedTitle.includes('Ajuste') || normalizedTitle.includes('Config'))
      return { main: Settings, sub: Cpu };
    if (normalizedTitle.includes('Mantenimiento')) return { main: Wrench, sub: AlertTriangle };
    return { main: Shield, sub: Zap };
  };

  const { main: MainIcon, sub: SubIcon } = getHeaderIcons(layoutData.title);

  return (
    <header className="flex flex-row items-center w-full border-b border-pinnacle-navy/5 px-10 min-h-[10vh] py-2 bg-white relative z-50 mt-[10px]">
      {/* 🛡️ Section Identification (Col Alfa) */}
      <div className="w-1/2 flex flex-col items-start justify-center">
        <div className="flex items-center gap-3">
          <MainIcon size={20} className="text-pinnacle-yellow" strokeWidth={2.5} />
          <h2 className="text-pinnacle-navy tracking-tighter font-black text-2xl m-0 p-0 leading-[0.9]">
            {layoutData.title}
          </h2>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <SubIcon size={10} className="text-pinnacle-yellow opacity-70" strokeWidth={3} />
          <p className="text-pinnacle-navy text-[10px] font-bold uppercase tracking-[0.25em] opacity-50">
            {layoutData.description}
          </p>
        </div>
      </div>

      {/* ⚡ Dynamic Action Button (Col Beta) */}
      <div className="w-1/2 flex justify-end items-center">
        {layoutData.headerAction && (
          <div className="w-full">
            <ArchonManagementCard
              variant={layoutData.headerAction.variant}
              layout="horizontal"
              headerTitle={layoutData.headerAction.headerTitle}
              HeaderIcon={layoutData.headerAction.HeaderIcon}
              PayloadIcon={layoutData.headerAction.PayloadIcon}
              actionTitle={layoutData.headerAction.actionTitle}
              description={layoutData.headerAction.description}
              buttonText={layoutData.headerAction.buttonText}
              isActive={layoutData.headerAction.isActive}
              onClick={layoutData.headerAction.onClick}
            />
          </div>
        )}
      </div>
    </header>
  );
};

export default SovereignHeader;
