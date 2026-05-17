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
  X,
  Cpu,
  Wrench,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import ArchonManagementCard from '../UI/ArchonManagementCard';
import { useFleet } from '../../context/FleetContext';
import { FleetUnit } from '../../types/fleet';
import { calculateMaintForecast } from '../../utils/fleetPredictiveEngine';

/**
 * 🔱 Archon Component: SovereignHeader
 * Implementation: Sovereign Identity & Section Metadata Orchestration
 * Objective: High-density header with dynamic titles and predictive numeric search.
 * v.1.6.2 - Quantitative Universal Engine with Dynamic Forecast Matching
 */

interface SearchConfig {
  key: keyof FleetUnit;
  label: string;
  type: 'string' | 'numeric';
  suffix?: string;
}

// 📐 Specification Matrix for Universal Search (String & Numeric Columns)
const SEARCH_CONFIGS: SearchConfig[] = [
  { key: 'placas', label: 'Placas', type: 'string' },
  { key: 'marca', label: 'Marca', type: 'string' },
  { key: 'modelo', label: 'Modelo', type: 'string' },
  { key: 'sede', label: 'Sede', type: 'string' },
  { key: 'departamento', label: 'Depto', type: 'string' },
  { key: 'owner', label: 'Propietario', type: 'string' },
  { key: 'complianceStatus', label: 'Cumplimiento', type: 'string' },
  { key: 'status', label: 'Estado', type: 'string' },
  { key: 'assetType', label: 'Tipo', type: 'string' },
  { key: 'fuelType', label: 'Combustible', type: 'string' },
  { key: 'traccion', label: 'Tracción', type: 'string' },
  { key: 'transmision', label: 'Transmisión', type: 'string' },
  { key: 'numeroSerie', label: 'VIN/Serie', type: 'string' },
  { key: 'circulationCardNumber', label: 'Tarjeta Circ.', type: 'string' },
  { key: 'accountingAccount', label: 'Cta. Contable', type: 'string' },
  { key: 'insurancePolicyNumber', label: 'Póliza Seguro', type: 'string' },
  { key: 'motor', label: 'Motor', type: 'string' },
  { key: 'tireBrand', label: 'Llantas Marca', type: 'string' },
  { key: 'tireSpec', label: 'Llantas Medida', type: 'string' },
  { key: 'color', label: 'Color', type: 'string' },
  // Quantitative/Numeric Fields
  { key: 'monthlyLeasePayment', label: 'Leasing', type: 'numeric', suffix: ' USD' },
  { key: 'odometer', label: 'Odómetro', type: 'numeric', suffix: ' KM/Hrs' },
  { key: 'lastServiceReading', label: 'Último Servicio', type: 'numeric', suffix: ' KM/Hrs' },
  { key: 'nextServiceReading', label: 'Objetivo Servicio', type: 'numeric', suffix: ' KM/Hrs' },
  { key: 'capacidadCarga', label: 'Carga', type: 'numeric', suffix: ' KG' },
  { key: 'fuelTankCapacity', label: 'Tanque', type: 'numeric', suffix: ' L' },
  { key: 'maintIntervalKm', label: 'Frec. Uso', type: 'numeric', suffix: ' KM/Hrs' },
  { key: 'maintIntervalDays', label: 'Frec. Tiempo', type: 'numeric', suffix: ' Días' },
  { key: 'dailyUsageAvg', label: 'Uso Diario', type: 'numeric', suffix: ' U/D' },
];

// ⚙️ Reusable Matcher Engine with Dynamic Projections
const matchFieldInUnit = (u: FleetUnit, query: string): { label: string; value: string } | null => {
  if (u.id && u.id.toLowerCase().includes(query)) {
    return { label: 'Código', value: u.id };
  }

  // 1. Calculate Predictive Remaining Kilometers dynamically
  const forecast = calculateMaintForecast(
    u.maintIntervalDays,
    u.maintIntervalKm,
    u.dailyUsageAvg || 0,
    u.odometer,
    u.lastServiceReading || 0,
    u.lastServiceDate || null
  );

  if (forecast) {
    const kmPara = forecast.kmParaServicio;
    const usageUnit = u.usageUnitName || 'KM';
    const numStr = String(kmPara);
    const formattedStr = Number(kmPara).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    if (numStr.includes(query) || formattedStr.toLowerCase().includes(query)) {
      return { label: 'Km. Restantes', value: `${formattedStr} ${usageUnit}` };
    }
  }

  // 2. Iterate over other structured static keys
  const foundConfig = SEARCH_CONFIGS.find((cfg) => {
    const val = u[cfg.key];
    if (val === null || val === undefined) return false;

    if (cfg.type === 'string') {
      return String(val).toLowerCase().includes(query);
    }
    const numStr = String(val);
    const formattedStr = Number(val).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return numStr.includes(query) || formattedStr.toLowerCase().includes(query);
  });

  if (foundConfig) {
    const val = u[foundConfig.key];
    const formattedValue = foundConfig.type === 'string'
      ? String(val)
      : `${Number(val).toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}${foundConfig.suffix || ''}`;

    return { label: foundConfig.label, value: formattedValue };
  }

  if (u.year && String(u.year).includes(query)) {
    return { label: 'Año', value: String(u.year) };
  }

  return null;
};

const SovereignHeader: React.FC = () => {
  const { layoutData, searchTerm, setSearchTerm } = useSovereignLayout();
  const { units } = useFleet();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 🛡️ Click Outside Sentinel
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 🛡️ Keyboard Close Sentinel (Escape)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 🔍 Predictive Suggestions Engine (ACOP Compliant & Offline-First)
  const suggestions = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase().trim();

    return units
      .map((u) => {
        const match = matchFieldInUnit(u, query);
        if (!match) return null;

        const labelSuffix = ` (${match.label}: ${match.value})`;
        return {
          id: u.id,
          label: `${u.id}${labelSuffix}`,
        };
      })
      .filter((s): s is { id: string; label: string } => s !== null)
      .slice(0, 8);
  }, [units, searchTerm]);

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
      <div className={`w-1/2 flex flex-col pr-10 ${
        layoutData.title === 'Administrar Unidades' 
          ? 'justify-between h-[105px] py-0.5' 
          : 'justify-center'
      }`}>
        <div>
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

        {/* 🔍 PREMIUM ARCHON AUTOCOMPLETE PREDICTIVE SEARCH BAR */}
        {layoutData.title === 'Administrar Unidades' && (
          <div ref={containerRef} className="group relative w-full mt-3 animate-in fade-in slide-in-from-top-1 duration-500 z-[999]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search 
                size={13} 
                className="text-slate-400 group-focus-within:text-[#0f2a44] transition-colors duration-300" 
              />
            </span>
            <input
              type="text"
              placeholder="Buscar por placas, marca, modelo, sede o departamento..."
              value={searchTerm}
              onChange={(e): void => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={(): void => setIsOpen(true)}
              style={{
                border: '1px solid rgba(15, 42, 68, 0.2)',
                borderRadius: '4px',
              }}
              className="w-full pl-9 pr-9 py-2 text-[11px] font-bold text-[#0f2a44] bg-white focus:outline-none placeholder-slate-400/80 tracking-[0.02em] shadow-sm shadow-slate-100/50"
            />
            {searchTerm && (
              <button
                data-testid="clear-search-btn"
                onClick={(): void => {
                  setSearchTerm('');
                  setIsOpen(false);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-red-500 border-none bg-transparent cursor-pointer transition-colors duration-200 active:scale-95"
              >
                <X size={13} className="transition-transform duration-200 hover:rotate-90" />
              </button>
            )}

            {/* 🔱 Dropdown Suggestions */}
            {isOpen && searchTerm.trim() && suggestions.length > 0 && (
              <ul 
                style={{
                  border: '1px solid rgba(15, 42, 68, 0.2)',
                  borderRadius: '4px',
                }}
                className="absolute left-0 right-0 mt-1.5 bg-white shadow-lg max-h-60 overflow-y-auto z-[9999] py-1 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    onClick={(): void => {
                      setSearchTerm(s.id);
                      setIsOpen(false);
                    }}
                    className="px-4 py-2.5 text-[11px] font-bold text-[#0f2a44] hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors duration-150 uppercase"
                  >
                    <span className="tracking-tight">{s.label}</span>
                    <span className="text-[9px] font-black text-slate-400 tracking-wider">SELECCIONAR</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
