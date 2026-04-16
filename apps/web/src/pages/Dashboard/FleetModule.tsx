import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  ArrowRight,
  User,
  ArrowLeft,
  Save,
  ShieldCheck,
  Zap,
  Gauge,
  Tag,
  Settings,
  LogOut,
  FileText,
  MapPin,
  Wrench,
  Calendar,
  PlusCircle,
  Activity,
  Navigation,
  Camera,
} from 'lucide-react';
import api from '../../api/client';
import {
  FleetUnit,
  AssetType,
  CentroMantenimiento,
  FuelType,
  Traccion,
  Transmision,
  MaintenanceFrequency,
} from '../../types/fleet';
import ArchonDatePicker from '../../components/ArchonDatePicker';
import ArchonField from '../../components/ArchonField';
import ArchonImageUploader from '../../components/ArchonImageUploader';
import {
  MARCAS_VEHICULO,
  MARCAS_MAQUINARIA,
  MARCAS_HERRAMIENTA,
  MAINTENANCE_FREQUENCIES,
  FUEL_TYPES,
  TRACCION_OPTIONS,
  TRANSMISION_OPTIONS,
} from '../../constants/fleetConstants';

type FleetView = 'GRID' | 'CREATE';

// Initial form state factory
const getInitialForm = (): {
  assetType: AssetType;
  tag: string;
  numeroSerie: string;
  images: string[];
  marca: string;
  modelo: string;
  year: number;
  motor: string;
  traccion: Traccion;
  transmision: Transmision;
  fuelType: FuelType;
  tireSpec: string;
  tireBrand: string;
  capacidadCarga: string;
  odometer: number;
  sede: string;
  centroMantenimiento: CentroMantenimiento;
  vigenciaSeguro: string;
  vencimientoVerificacion: string;
  tarjetaCirculacion: string;
  maintenanceFrequency: MaintenanceFrequency;
  protocolStartDate: string;
  status: 'Disponible';
} => ({
  assetType: 'Vehiculo' as AssetType,
  tag: '',
  numeroSerie: '',
  images: [] as string[],
  marca: '',
  modelo: '',
  year: new Date().getFullYear(),
  motor: '',
  traccion: 'N/A' as Traccion,
  transmision: 'N/A' as Transmision,
  fuelType: 'Diesel' as FuelType,
  tireSpec: '',
  tireBrand: '',
  capacidadCarga: '',
  odometer: 0,
  sede: '',
  centroMantenimiento: 'PIIC' as CentroMantenimiento,
  vigenciaSeguro: '',
  vencimientoVerificacion: '',
  tarjetaCirculacion: '',
  maintenanceFrequency: 'Mensual',
  protocolStartDate: new Date().toISOString().split('T')[0],
  status: 'Disponible' as const,
});

// ============================================================================
// 🚀 FLEET MODULE
// ============================================================================
const FleetModule: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<FleetView>('GRID');

  // ⚡ SOVEREIGN HYDRATION & KINETIC LOGIC
  const [_units, setUnits] = useState<FleetUnit[]>(() => {
    try {
      const cached = localStorage.getItem('archon_fleet_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState(getInitialForm());

  const toggleMenu = (): void => setIsMenuOpen(!isMenuOpen);
  const closeMenu = (): void => setIsMenuOpen(false);

  const handleLogout = (): void => {
    localStorage.removeItem('archon_token');
    navigate('/login');
  };

  const fetchUnits = async (): Promise<void> => {
    try {
      const response = await api.get('/fleet');
      if (response.data.success) {
        const freshData = response.data.data;
        setUnits(freshData);
        // ⚡ FORCED CACHE: Synchronize with central dashboard stats
        localStorage.setItem('archon_fleet_cache', JSON.stringify(freshData));
      }
    } catch {
      // Noise reduction for CI
    }
  };

  useEffect((): void => {
    fetchUnits();
  }, []);

  // Derived catalogs based on asset type (Mapping for zero-noise architecture)
  const assetCatalogs: Record<AssetType, Record<string, string[]>> = {
    Vehiculo: MARCAS_VEHICULO,
    Maquinaria: MARCAS_MAQUINARIA,
    Herramienta: MARCAS_HERRAMIENTA,
  };

  const currentCatalog = assetCatalogs[formData.assetType];
  const availableMarcas = Object.keys(currentCatalog);
  const availableModelos = currentCatalog[formData.marca] ?? [];

  const handleAssetTypeChange = (type: AssetType): void => {
    setFormData({ ...formData, assetType: type, marca: '', modelo: '' });
  };

  const handleMarcaChange = (marca: string): void => {
    setFormData({ ...formData, marca, modelo: '' });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        vigenciaSeguro: formData.vigenciaSeguro || null,
        vencimientoVerificacion: formData.vencimientoVerificacion || null,
        numeroSerie: formData.numeroSerie || undefined,
        motor: formData.motor || undefined,
        tireSpec: formData.tireSpec || undefined,
        tireBrand: formData.tireBrand || undefined,
        capacidadCarga: formData.capacidadCarga || undefined,
        sede: formData.sede || undefined,
        tarjetaCirculacion: formData.tarjetaCirculacion || undefined,
      };
      const response = await api.post('/fleet', payload);
      if (response.data.success) {
        setFormData(getInitialForm());
        fetchUnits();
        setCurrentView('GRID');
      }
    } catch {
      // Noise reduced for CI compliance
    }
  };

  // ============================================================================
  // 🛠️ SHARED: OPERATIONAL SUBHEADER
  // ============================================================================
  const renderSubheader = (): React.ReactElement => (
    <div
      className="flex items-center w-full pb-32 animate-in fade-in duration-500"
      style={{ paddingLeft: '4px', paddingRight: '4px' }}
    >
      {currentView === 'CREATE' && (
        <button onClick={(): void => setCurrentView('GRID')} className="btn-sentinel-yellow">
          <ArrowLeft size={14} /> Volver al Panel
        </button>
      )}
    </div>
  );

  // ============================================================================
  // 🏛️ GRID VIEW
  // ============================================================================
  const renderGridView = (): React.ReactElement => (
    <div className="archon-grid-3 h-full">
      {/* Card 1: Incorporación de Activos (VERDE) */}
      <div
        className={`glass-card-pro archon-instrument-tile card-hover-emerald`}
        style={{
          borderTop: '4px solid #10b981',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px',
            width: '100%',
          }}
        >
          <Plus size={20} style={{ color: '#10b981' }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">
            Incorporación de Activos
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-16">
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(16, 185, 129, 0.4)',
            }}
          >
            <PlusCircle size={40} style={{ color: '#10b981' }} />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3
              className="text-[#0f2a44] font-black uppercase tracking-[0.15em]"
              style={{ fontSize: '14px' }}
            >
              Registrar Unidad
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Vehículos, Maquinaria y Herramientas
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button onClick={(): void => setCurrentView('CREATE')} className="btn-sentinel-emerald">
            Iniciar Registro <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>

      {/* Card 2: Mantenimiento Preventivo (AMARILLO) */}
      <div
        className={`glass-card-pro archon-instrument-tile card-hover-yellow`}
        style={{
          borderTop: '4px solid #f2b705',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px',
            width: '100%',
          }}
        >
          <ShieldCheck size={20} style={{ color: '#f2b705' }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">
            Mantenimiento Preventivo
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-16">
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(242, 183, 5, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(242, 183, 5, 0.4)',
            }}
          >
            <Activity size={40} style={{ color: '#f2b705' }} />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3
              className="text-[#0f2a44] font-black uppercase tracking-[0.15em]"
              style={{ fontSize: '14px' }}
            >
              Control de Salud
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Protocolos Activos
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button className="btn-sentinel-yellow">
            Ver Programación <ArrowRight size={10} className="text-[#0f2a44] ml-2" />
          </button>
        </div>
      </div>

      {/* Card 3: Asignar Unidad (AZUL) */}
      <div
        className={`glass-card-pro archon-instrument-tile card-hover-sky`}
        style={{
          borderTop: '4px solid #0ea5e9',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px',
            width: '100%',
          }}
        >
          <Navigation size={20} style={{ color: '#0ea5e9' }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">
            Logística Operativa
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-16">
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(14, 165, 233, 0.4)',
            }}
          >
            <Navigation size={40} style={{ color: '#0ea5e9' }} />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3
              className="text-[#0f2a44] font-black uppercase tracking-[0.15em]"
              style={{ fontSize: '14px' }}
            >
              Asignar Unidad
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Despliegue de Unidad
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button className="btn-sentinel-sky">
            Iniciar Asignación <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // 📝 CREATE VIEW — Intelligence Form
  // ============================================================================
  const renderCreateView = (): React.ReactElement => (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-6xl mx-auto pb-40">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── ROW 1: Clasificación + Identidad ─────────────────────────────── */}
        <div className="archon-grid-2">
          {/* CARD: Clasificación del Activo */}
          <div
            className="glass-card-pro card-hover-yellow bg-white p-10 space-y-8"
            style={{ borderTop: '4px solid #f2b705' }}
          >
            <div className="archon-card-header-pro">
              <ShieldCheck size={22} />
              <h3>Clasificación del Activo</h3>
            </div>

            {/* Tipo de Unidad */}
            <ArchonField label="Tipo de Unidad" icon={Truck}>
              <select
                className="archon-select"
                value={formData.assetType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  handleAssetTypeChange(e.target.value as AssetType)
                }
              >
                <option value="Vehiculo">Vehículo</option>
                <option value="Maquinaria">Maquinaria</option>
                <option value="Herramienta">Herramienta</option>
              </select>
            </ArchonField>

            {/* Marca — filtrada por Tipo */}
            <ArchonField label="Marca" icon={Tag} required>
              <select
                required
                className="archon-select"
                value={formData.marca}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  handleMarcaChange(e.target.value)
                }
              >
                <option value="">— Selecciona marca —</option>
                {availableMarcas.map(
                  (m: string): React.ReactElement => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  )
                )}
              </select>
            </ArchonField>

            {/* Modelo — filtrado por Marca */}
            <ArchonField label="Modelo" icon={Tag} required>
              <select
                required
                className="archon-select"
                value={formData.modelo}
                disabled={!formData.marca}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({ ...formData, modelo: e.target.value })
                }
              >
                <option value="">— Selecciona modelo —</option>
                {availableModelos.map(
                  (m: string): React.ReactElement => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  )
                )}
              </select>
            </ArchonField>

            {/* Año */}
            <ArchonField label="Año Modelo" icon={Calendar} required>
              <input
                required
                type="number"
                className="archon-input"
                value={formData.year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, year: parseInt(e.target.value, 10) })
                }
              />
            </ArchonField>
          </div>

          {/* CARD: Identidad del Activo */}
          <div
            className="glass-card-pro card-hover-navy bg-white p-10 space-y-8"
            style={{ borderTop: '4px solid #0f2a44' }}
          >
            <div className="archon-card-header-pro">
              <FileText size={22} />
              <h3>Identidad del Activo</h3>
            </div>

            {/* Número Económico */}
            <ArchonField label="Número Económico" icon={Tag} required>
              <input
                required
                type="text"
                placeholder="Ej. PIIC-001"
                className="archon-input"
                value={formData.tag}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, tag: e.target.value.toUpperCase() })
                }
              />
            </ArchonField>

            {/* Número de Serie */}
            <ArchonField label="Número de Serie" icon={Tag}>
              <input
                type="text"
                placeholder="Alfanumérico"
                className="archon-input"
                value={formData.numeroSerie}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, numeroSerie: e.target.value.toUpperCase() })
                }
              />
            </ArchonField>

            {/* Imágenes de la Unidad (Drag & Drop) */}
            <ArchonField label="Imágenes de la Unidad" icon={Camera}>
              <ArchonImageUploader
                images={formData.images}
                onChange={(imgs: string[]): void => setFormData({ ...formData, images: imgs })}
              />
            </ArchonField>

            {/* Motor */}
            <ArchonField label="Motor" icon={Wrench}>
              <input
                type="text"
                placeholder="Ej. 2.8L Diesel TDI"
                className="archon-input"
                value={formData.motor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, motor: e.target.value })
                }
              />
            </ArchonField>

            {/* Tarjeta de Circulación */}
            <ArchonField label="Tarjeta de Circulación" icon={FileText}>
              <input
                type="text"
                placeholder="Folio o referencia"
                className="archon-input"
                value={formData.tarjetaCirculacion}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, tarjetaCirculacion: e.target.value })
                }
              />
            </ArchonField>
          </div>
        </div>

        {/* ── ROW 2: Configuración Mecánica + Organización ────────────────────── */}
        <div className="archon-grid-2" style={{ marginTop: '24px' }}>
          {/* CARD: Configuración Mecánica */}
          <div
            className="glass-card-pro card-hover-yellow bg-white p-10 space-y-8"
            style={{ borderTop: '4px solid #f2b705' }}
          >
            <div className="archon-card-header-pro">
              <Zap size={22} />
              <h3>Configuración Mecánica</h3>
            </div>

            {/* Tracción */}
            <ArchonField label="Tracción" icon={Truck}>
              <select
                className="archon-select"
                value={formData.traccion}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({ ...formData, traccion: e.target.value as Traccion })
                }
              >
                {TRACCION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </ArchonField>

            {/* Transmisión */}
            <ArchonField label="Transmisión" icon={Settings}>
              <select
                className="archon-select"
                value={formData.transmision}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({ ...formData, transmision: e.target.value as Transmision })
                }
              >
                {TRANSMISION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </ArchonField>

            {/* Combustible */}
            <ArchonField label="Combustible" icon={Zap}>
              <select
                className="archon-select"
                value={formData.fuelType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({ ...formData, fuelType: e.target.value as FuelType })
                }
              >
                {FUEL_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </ArchonField>

            {/* Odómetro / Horómetro */}
            <ArchonField
              label={formData.assetType === 'Maquinaria' ? 'Horómetro (hrs)' : 'Odómetro (km)'}
              icon={Gauge}
            >
              <input
                type="number"
                className="archon-input"
                value={formData.odometer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, odometer: parseFloat(e.target.value) })
                }
              />
            </ArchonField>

            {/* Capacidad de Carga */}
            <ArchonField label="Capacidad de Carga" icon={Truck}>
              <input
                type="text"
                placeholder="Ej. 3.5 Ton"
                className="archon-input"
                value={formData.capacidadCarga}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, capacidadCarga: e.target.value })
                }
              />
            </ArchonField>
          </div>

          {/* CARD: Organización & Cumplimiento */}
          <div
            className="glass-card-pro card-hover-navy bg-white p-10 space-y-8"
            style={{ borderTop: '4px solid #0f2a44' }}
          >
            <div className="archon-card-header-pro">
              <MapPin size={22} />
              <h3>Organización &amp; Cumplimiento</h3>
            </div>

            {/* Vigencia del Seguro */}
            <ArchonField label="Vigencia del Seguro" icon={Calendar}>
              <ArchonDatePicker
                value={formData.vigenciaSeguro}
                onChange={(v: string): void => setFormData({ ...formData, vigenciaSeguro: v })}
                placeholder="Selecciona fecha"
              />
            </ArchonField>

            {/* Vencimiento de Verificación */}
            <ArchonField label="Vencimiento de Verificación" icon={Calendar}>
              <ArchonDatePicker
                value={formData.vencimientoVerificacion}
                onChange={(v: string): void =>
                  setFormData({ ...formData, vencimientoVerificacion: v })
                }
                placeholder="Selecciona fecha"
              />
            </ArchonField>

            {/* Sede */}
            <ArchonField label="Sede" icon={MapPin}>
              <input
                type="text"
                placeholder="Base de operaciones"
                className="archon-input"
                value={formData.sede}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, sede: e.target.value })
                }
              />
            </ArchonField>

            {/* Mantenimiento Técnico */}
            <ArchonField label="Mantenimiento Técnico" icon={Activity}>
              <select
                className="archon-select"
                value={formData.maintenanceFrequency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({
                    ...formData,
                    maintenanceFrequency: e.target.value as MaintenanceFrequency,
                  })
                }
              >
                {MAINTENANCE_FREQUENCIES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </ArchonField>

            {/* Centro de Mantenimiento */}
            <ArchonField label="Centro de Mantenimiento" icon={Wrench}>
              <select
                className="archon-select"
                value={formData.centroMantenimiento}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({
                    ...formData,
                    centroMantenimiento: e.target.value as CentroMantenimiento,
                  })
                }
              >
                <option value="PIIC">PIIC</option>
              </select>
            </ArchonField>

            {/* Inicio de Protocolo de Mantenimiento */}
            <ArchonField label="Inicio de Protocolo" icon={Calendar}>
              <ArchonDatePicker
                value={formData.protocolStartDate}
                onChange={(v: string): void => setFormData({ ...formData, protocolStartDate: v })}
                placeholder="Selecciona fecha de inicio"
              />
            </ArchonField>

            {/* Submit */}
            <div className="pt-24">
              <button type="submit" className="btn-sentinel-yellow w-full">
                <Save size={18} /> Confirmar Incorporación de Activo
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );

  // ============================================================================
  // 🖥️ RENDER
  // ============================================================================
  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER DINÁMICO SOBERANO - V.7.1.3 */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Section Left */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <Truck size={28} style={{ color: '#f2b705' }} />
              <h2
                className="text-[#0f2a44] tracking-tighter font-black text-2xl"
                style={{ margin: 0, padding: 0, lineHeight: 1 }}
              >
                {currentView === 'GRID' ? 'Administrar Unidades' : 'Registro de Unidad'}
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              {currentView === 'GRID'
                ? 'Gestión de Vehículos, Maquinaria y Herramientas'
                : 'Protocolo de Incorporación de Activo'}
            </p>
          </div>

          {/* Section Right: User Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 900,
                margin: 0,
                letterSpacing: '-0.03em',
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#0f2a44',
              }}
            >
              Archon
            </h1>

            <button
              onClick={toggleMenu}
              aria-label="User Menu"
              className="avatar-trigger-pro"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '4px',
                border: '2px solid #f2b705',
                backgroundColor: '#0f2a44',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: isMenuOpen ? '0 0 0 4px rgba(242, 183, 5, 0.2)' : 'none',
                transform: isMenuOpen ? 'scale(0.95)' : 'scale(1)',
                padding: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 100 100">
                <path
                  d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z"
                  stroke="#f2b705"
                  strokeWidth="16"
                  fill="none"
                />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '60px',
                  right: '0',
                  width: '180px',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  boxShadow: '0 10px 30px rgba(15, 42, 68, 0.15)',
                  border: '1px solid rgba(15, 42, 68, 0.08)',
                  zIndex: 100,
                  padding: '4px 0',
                  animation: 'fade-in 0.2s ease-out',
                }}
              >
                <div
                  style={{ padding: '8px 16px', borderBottom: '1px solid rgba(15, 42, 68, 0.05)' }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 900,
                      color: '#f2b705',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Sovereign Access
                  </span>
                </div>
                <button className="dropdown-item-mock" onClick={closeMenu}>
                  <User size={14} /> Perfil
                </button>
                <button className="dropdown-item-mock" onClick={closeMenu}>
                  <Settings size={14} /> Ajustes
                </button>
                <div
                  style={{ height: '1px', background: 'rgba(15, 42, 68, 0.05)', margin: '4px 0' }}
                />
                <button
                  className="dropdown-item-mock dropdown-item-mock-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={14} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 📊 ÁREA DE TRABAJO DINÁMICA (Chasis) */}
      <section className="archon-workspace-chassis">
        {currentView !== 'GRID' && renderSubheader()}
        <div className="w-full h-full">
          {currentView === 'GRID' ? renderGridView() : renderCreateView()}
        </div>
      </section>

      {/* ⚓ FOOTER SENTINEL (10vh) - V.7.1.3 */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">ArchonCore Sovereign v.15.1.0</p>
      </footer>
    </main>
  );
};

export default FleetModule;
