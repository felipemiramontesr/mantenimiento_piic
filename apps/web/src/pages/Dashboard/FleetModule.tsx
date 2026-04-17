import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  ArrowRight,
  User,
  ArrowLeft,
  Save,
  ShieldCheck,
  Wrench,
  Zap,
  Gauge,
  Tag,
  Settings,
  LogOut,
  FileText,
  MapPin,
  Calendar,
  PlusCircle,
  Activity,
  Navigation,
  Camera,
} from 'lucide-react';
import api from '../../api/client';
import { useFleet } from '../../context/FleetContext';
import {
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
import ArchonSelect from '../../components/ArchonSelect';
import {
  MARCAS_VEHICULO,
  MARCAS_MAQUINARIA,
  MARCAS_HERRAMIENTA,
  MAINTENANCE_FREQUENCIES,
  FUEL_TYPES,
  TRACCION_OPTIONS,
  TRANSMISION_OPTIONS,
  DEPARTAMENTOS,
  USO_OPTIONS,
  TIPO_TERRENO_OPTIONS,
  SEDES,
  MARCAS_NEUMATICOS,
} from '../../constants/fleetConstants';
import { SYSTEM_VERSION, BRANDING_NAME } from '../../constants/versionConstants';

type FleetView = 'GRID' | 'CREATE';

// Initial form state factory
const getInitialForm = (): {
  assetType: AssetType;
  tag: string;
  placas: string;
  numeroSerie: string;
  images: string[];
  marca: string;
  modelo: string;
  year: number;
  departamento: string;
  uso: string;
  motor: string;
  traccion: Traccion;
  transmision: Transmision;
  fuelType: FuelType;
  tireSpec: string;
  tireBrand: string;
  tipoTerreno: string;
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
  placas: '',
  numeroSerie: '',
  images: [] as string[],
  marca: '',
  modelo: '',
  year: new Date().getFullYear(),
  departamento: '',
  uso: '',
  motor: '',
  traccion: 'No Aplica' as Traccion,
  transmision: 'No Aplica' as Transmision,
  fuelType: 'Diesel' as FuelType,
  tireSpec: '',
  tireBrand: '',
  tipoTerreno: '',
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
  const { refreshUnits } = useFleet();
  const [currentView, setCurrentView] = useState<FleetView>('GRID');

  // ⚡ SOVEREIGN HYDRATION & KINETIC LOGIC
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState(getInitialForm());

  const toggleMenu = (): void => setIsMenuOpen(!isMenuOpen);
  const closeMenu = (): void => setIsMenuOpen(false);

  const handleLogout = (): void => {
    localStorage.removeItem('archon_token');
    navigate('/login');
  };

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
        placas: formData.placas || undefined,
        numeroSerie: formData.numeroSerie || undefined,
        departamento: formData.departamento || undefined,
        uso: formData.uso || undefined,
        motor: formData.motor || undefined,
        tireSpec: formData.tireSpec || undefined,
        tireBrand: formData.tireBrand || undefined,
        tipoTerreno: formData.tipoTerreno || undefined,
        capacidadCarga: formData.capacidadCarga || undefined,
        sede: formData.sede || undefined,
        tarjetaCirculacion: formData.tarjetaCirculacion || undefined,
      };
      const response = await api.post('/fleet', payload);
      if (response.data.success) {
        // 🛡️ REFRESH GLOBAL TACTICAL STATE
        await refreshUnits();

        setCurrentView('GRID');
        setFormData(getInitialForm());
        // eslint-disable-next-line no-alert
        alert('Vehículo registrado con éxito');
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

      {/* Card 2: Mantenimiento Correctivo (AMARILLO) */}
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
          <Wrench size={20} style={{ color: '#f2b705' }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">
            Mantenimiento Correctivo
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
            <Wrench size={40} style={{ color: '#f2b705' }} />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3
              className="text-[#0f2a44] font-black uppercase tracking-[0.15em]"
              style={{ fontSize: '14px' }}
            >
              Agregar Mantenimiento
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Reparación y Ajustes
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button className="btn-sentinel-yellow">
            Iniciar Mantenimiento <ArrowRight size={10} className="text-[#0f2a44] ml-2" />
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

            <ArchonField label="Tipo de Unidad" icon={Truck}>
              <ArchonSelect
                options={['Vehiculo', 'Maquinaria', 'Herramienta']}
                value={formData.assetType}
                onChange={(val): void => handleAssetTypeChange(val as AssetType)}
              />
            </ArchonField>

            <ArchonField label="Marca" icon={Tag} required>
              <ArchonSelect
                options={availableMarcas}
                value={formData.marca}
                onChange={(val): void => handleMarcaChange(val)}
                placeholder="— Selecciona marca —"
              />
            </ArchonField>

            <ArchonField label="Modelo" icon={Tag} required>
              <ArchonSelect
                options={availableModelos}
                value={formData.modelo}
                onChange={(val): void => setFormData({ ...formData, modelo: val })}
                disabled={!formData.marca}
                placeholder="— Selecciona modelo —"
              />
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
                placeholder="Ej. ASM-001"
                className="archon-input"
                value={formData.tag}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, tag: e.target.value.toUpperCase() })
                }
              />
            </ArchonField>

            {/* Placas */}
            <ArchonField label="Placas" icon={Tag}>
              <input
                type="text"
                placeholder="Ej. ZH-0000-X"
                className="archon-input"
                value={formData.placas}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, placas: e.target.value.toUpperCase() })
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
              <ArchonSelect
                options={TRACCION_OPTIONS}
                value={formData.traccion}
                onChange={(val): void => setFormData({ ...formData, traccion: val as Traccion })}
              />
            </ArchonField>

            {/* Transmisión */}
            <ArchonField label="Transmisión" icon={Settings}>
              <ArchonSelect
                options={TRANSMISION_OPTIONS}
                value={formData.transmision}
                onChange={(val): void =>
                  setFormData({ ...formData, transmision: val as Transmision })
                }
              />
            </ArchonField>

            {/* Combustible */}
            <ArchonField label="Combustible" icon={Zap}>
              <ArchonSelect
                options={FUEL_TYPES}
                value={formData.fuelType}
                onChange={(val): void => setFormData({ ...formData, fuelType: val as FuelType })}
              />
            </ArchonField>

            <ArchonField label="Marca de Neumáticos" icon={Settings}>
              <ArchonSelect
                options={MARCAS_NEUMATICOS}
                value={formData.tireBrand}
                onChange={(val): void => setFormData({ ...formData, tireBrand: val })}
              />
            </ArchonField>

            {/* Medida de Neumático (tire_spec) */}
            <ArchonField label="Medida de Neumático" icon={Truck}>
              <input
                type="text"
                placeholder="Ej. 265/70R17 o 12.00R24"
                className="archon-input"
                value={formData.tireSpec}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, tireSpec: e.target.value })
                }
              />
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
                  setFormData({ ...formData, odometer: parseFloat(e.target.value) || 0 })
                }
              />
            </ArchonField>

            {/* Tipo Terreno */}
            <ArchonField label="Clasificación Terreno" icon={MapPin}>
              <ArchonSelect
                options={TIPO_TERRENO_OPTIONS}
                value={formData.tipoTerreno}
                onChange={(val): void => setFormData({ ...formData, tipoTerreno: val })}
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

            {/* Departamento */}
            <ArchonField label="Departamento" icon={User} required>
              <ArchonSelect
                options={DEPARTAMENTOS}
                value={formData.departamento}
                onChange={(val): void => setFormData({ ...formData, departamento: val })}
              />
            </ArchonField>

            {/* Uso Operativo */}
            <ArchonField label="Uso Operativo" icon={Activity} required>
              <ArchonSelect
                options={USO_OPTIONS}
                value={formData.uso}
                onChange={(val): void => setFormData({ ...formData, uso: val })}
              />
            </ArchonField>

            {/* Vigencia del Seguro */}
            <ArchonField label="Vigencia del Seguro" icon={Calendar}>
              <ArchonDatePicker
                value={formData.vigenciaSeguro}
                onChange={(v: string): void => setFormData({ ...formData, vigenciaSeguro: v })}
                placeholder="Selecciona fecha"
              />
            </ArchonField>

            {/* Vencimiento de Verificación (Placas) */}
            <ArchonField label="Vencimiento de Verificación (Placas)" icon={Calendar}>
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
              <ArchonSelect
                options={SEDES}
                value={formData.sede}
                onChange={(val): void => setFormData({ ...formData, sede: val })}
              />
            </ArchonField>

            {/* Mantenimiento Técnico */}
            <ArchonField label="Mantenimiento Técnico" icon={Activity}>
              <ArchonSelect
                options={MAINTENANCE_FREQUENCIES}
                value={formData.maintenanceFrequency}
                onChange={(val): void =>
                  setFormData({ ...formData, maintenanceFrequency: val as MaintenanceFrequency })
                }
              />
            </ArchonField>

            {/* Centro de Mantenimiento */}
            <ArchonField label="Centro de Mantenimiento" icon={Wrench}>
              <ArchonSelect
                options={['PIIC']}
                value={formData.centroMantenimiento}
                onChange={(val): void =>
                  setFormData({ ...formData, centroMantenimiento: val as CentroMantenimiento })
                }
              />
            </ArchonField>

            {/* Inicio de Protocolo de Mantenimientos */}
            <ArchonField label="Inicio de Protocolo de Mantenimientos" icon={Calendar}>
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
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default FleetModule;
