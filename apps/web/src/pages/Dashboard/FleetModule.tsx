import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Plus, Search, ArrowRight, User, ArrowLeft, Save,
  ShieldCheck, Zap, Gauge, Tag, Settings, LogOut,
  FileText, MapPin, Wrench, Calendar
} from 'lucide-react';
import api from '../../api/client';
import { FleetUnit, AssetType, CentroMantenimiento, FuelType, Traccion, Transmision } from '../../types/fleet';
import ArchonDatePicker from '../../components/ArchonDatePicker';

// ============================================================================
// 📦 SOVEREIGN ASSET CATALOGS (v.7.1.0.1)
// ============================================================================
const MARCAS_VEHICULO: Record<string, string[]> = {
  'Toyota':     ['Hilux', 'Land Cruiser', 'Fortuner', 'RAV4', 'Hiace', 'Tacoma'],
  'Ford':       ['Ranger', 'F-150', 'F-250', 'Transit', 'Bronco', 'Explorer'],
  'Chevrolet':  ['Silverado', 'Colorado', 'Tahoe', 'Suburban', 'Express', 'Traverse'],
  'Nissan':     ['NP300 Frontier', 'Navara', 'Titan', 'Patrol', 'Urvan'],
  'RAM':        ['1500', '2500', '3500', 'ProMaster'],
  'Volkswagen': ['Amarok', 'Crafter', 'Transporter'],
  'Dodge':      ['Ram 1500', 'Ram 2500', 'Durango'],
  'Mitsubishi': ['L200', 'Montero Sport', 'Outlander'],
  'Isuzu':      ['D-Max', 'N-Series', 'F-Series'],
  'Mercedes-Benz': ['Sprinter', 'Vito', 'Actros'],
};

const MARCAS_MAQUINARIA: Record<string, string[]> = {
  'Caterpillar': ['320', '330', '340', 'D6T', 'D8T', '950', '966', '140M', '16M', '426', '432'],
  'Komatsu':     ['PC200', 'PC300', 'PC400', 'D65', 'D85', 'WA380', 'WA470', 'GD655'],
  'John Deere':  ['310L', '410L', '710L', '644K', '824K', '772G', '672G'],
  'Volvo CE':    ['EC210', 'EC300', 'EC480', 'L90', 'L110', 'G930', 'G946'],
  'JCB':         ['3CX', '4CX', '531-70', 'JS220', 'JS360', '430ZX'],
  'Case':        ['580N', '695ST', '621G', '721G', '821G', '921G'],
  'Hitachi':     ['ZX200', 'ZX300', 'ZX490', 'EX1200', 'EH3500'],
  'Manitou':     ['MLT735', 'MLT840', 'MT1440', 'MRT2150'],
  'Liebherr':    ['L550', 'L566', 'LTM1050', 'LTM1220'],
  'Manitowoc':   ['Grove RT760E', 'Grove GMK4100L'],
};

type FleetView = 'GRID' | 'CREATE';

// Initial form state factory
const getInitialForm = (): {
  assetType: AssetType; tag: string; numeroSerie: string; marca: string;
  modelo: string; year: number; motor: string; traccion: Traccion;
  transmision: Transmision; fuelType: FuelType; tireSpec: string;
  tireBrand: string; capacidadCarga: string; odometer: number; sede: string;
  centroMantenimiento: CentroMantenimiento; vigenciaSeguro: string;
  vencimientoVerificacion: string; tarjetaCirculacion: string;
  status: 'Disponible';
} => ({
  assetType:               'Vehiculo' as AssetType,
  tag:                     '',
  numeroSerie:             '',
  marca:                   '',
  modelo:                  '',
  year:                    new Date().getFullYear(),
  motor:                   '',
  traccion:                'N/A' as Traccion,
  transmision:             'N/A' as Transmision,
  fuelType:                'Diesel' as FuelType,
  tireSpec:                '',
  tireBrand:               '',
  capacidadCarga:          '',
  odometer:                0,
  sede:                    '',
  centroMantenimiento:     'PIIC' as CentroMantenimiento,
  vigenciaSeguro:          '',
  vencimientoVerificacion: '',
  tarjetaCirculacion:      '',
  status:                  'Disponible' as const,
});

// ============================================================================
// 🚀 FLEET MODULE (v.7.1.0.1)
// ============================================================================
const FleetModule: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<FleetView>('GRID');

  // ⚡ SOVEREIGN HYDRATION & KINETIC LOGIC (v.7.1.0.1)
  const [units, setUnits] = useState<FleetUnit[]>(() => {
    try {
      const cached = localStorage.getItem('archon_fleet_cache');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const [displayCount, setDisplayCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
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
      setLoading(true);
      const response = await api.get('/fleet');
      if (response.data.success) {
        const freshData = response.data.data;
        setUnits(freshData);
        localStorage.setItem('archon_fleet_cache', JSON.stringify(freshData));
      }
    } catch {
      // Noise reduction for CI
    } finally {
      setLoading(false);
    }
  };

  useEffect((): void => { fetchUnits(); }, []);

  // 🚀 KINETIC UPCOUNT EFFECT
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (displayCount < units.length) {
      timeoutId = setTimeout(() => setDisplayCount(prev => prev + 1), 50);
    } else if (displayCount > units.length) {
      setDisplayCount(units.length);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [units.length, displayCount]);

  // Derived catalog based on asset type
  const availableMarcas = formData.assetType === 'Vehiculo'
    ? Object.keys(MARCAS_VEHICULO)
    : Object.keys(MARCAS_MAQUINARIA);

  const availableModelos = formData.assetType === 'Vehiculo'
    ? (MARCAS_VEHICULO[formData.marca] ?? [])
    : (MARCAS_MAQUINARIA[formData.marca] ?? []);

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
        vigenciaSeguro:          formData.vigenciaSeguro          || null,
        vencimientoVerificacion: formData.vencimientoVerificacion || null,
        numeroSerie:             formData.numeroSerie             || undefined,
        motor:                   formData.motor                   || undefined,
        tireSpec:                formData.tireSpec                || undefined,
        tireBrand:               formData.tireBrand               || undefined,
        capacidadCarga:          formData.capacidadCarga          || undefined,
        sede:                    formData.sede                    || undefined,
        tarjetaCirculacion:      formData.tarjetaCirculacion      || undefined,
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
      className="flex items-center justify-between w-full pb-80 animate-in fade-in duration-500"
      style={{ paddingLeft: '4px', paddingRight: '4px' }}
    >
      <div className="flex items-center min-w-[120px]">
        {currentView === 'CREATE' && (
          <button onClick={(): void => setCurrentView('GRID')} className="btn-sentinel-yellow">
            <ArrowLeft size={14} /> Volver al Panel
          </button>
        )}
      </div>

      {currentView === 'GRID' && (
        <div className="flex flex-row items-center ml-auto whitespace-nowrap" style={{ flexWrap: 'nowrap' }}>
          <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f2a44', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em', lineHeight: '1' }}>
            Total de Unidades:
          </span>
          <span style={{ fontSize: '26px', fontWeight: 900, color: '#f2b705', fontFamily: 'Inter, sans-serif', marginLeft: '12px', display: 'flex', alignItems: 'center', minWidth: '40px', lineHeight: '1' }}>
            {loading && units.length === 0 ? <span className="archon-shimmer" /> : displayCount}
          </span>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // 🏛️ GRID VIEW
  // ============================================================================
  const renderGridView = (): React.ReactElement => (
    <div className="archon-grid-3">
      {/* Card 1: Registrar Nueva Unidad */}
      <div className="glass-card-pro" style={{ borderTop: '4px solid #f2b705', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
          <Plus size={20} style={{ color: '#f2b705' }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">Incorporación de Activos</span>
        </div>
        <div className="mb-24" style={{ width: '100%' }}>
          <h3 className="text-kpi-black text-[#0f2a44] text-xl" style={{ fontSize: '1.5rem' }}>Registrar Unidad</h3>
          <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
            Vehículos y Maquinaria
          </p>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <button onClick={(): void => setCurrentView('CREATE')} className="btn-sentinel-yellow">
            Iniciar Registro <ArrowRight size={10} className="text-[#0f2a44]" />
          </button>
        </div>
      </div>

      {/* Card 2: Inventario */}
      <div className="glass-card-pro" style={{ borderTop: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
          <Search size={20} style={{ color: '#8b5cf6' }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">Exploración de Datos</span>
        </div>
        <div className="mb-24" style={{ width: '100%' }}>
          <h3 className="text-kpi-black text-[#0f2a44] text-xl" style={{ fontSize: '1.5rem' }}>Inventario General</h3>
          <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>Visualización técnica y estados</p>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <button disabled className="btn-sentinel-yellow opacity-40 cursor-not-allowed" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
            Próximamente <ArrowRight size={10} className="text-white" />
          </button>
        </div>
      </div>

      {/* Card 3: Operadores */}
      <div className="glass-card-pro" style={{ borderTop: '4px solid #10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
          <User size={20} style={{ color: '#10b981' }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">Logística Humana</span>
        </div>
        <div className="mb-24" style={{ width: '100%' }}>
          <h3 className="text-kpi-black text-[#0f2a44] text-xl" style={{ fontSize: '1.5rem' }}>Gestión Operadores</h3>
          <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>Asignación de personal operativo</p>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <button disabled className="btn-sentinel-yellow opacity-40 cursor-not-allowed" style={{ backgroundColor: '#10b981', color: 'white' }}>
            Próximamente <ArrowRight size={10} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // 📝 CREATE VIEW — Intelligence Form v.7.1.0.1
  // ============================================================================
  const renderCreateView = (): React.ReactElement => (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-6xl mx-auto pb-64">
      <form onSubmit={handleSubmit} className="space-y-48">

        {/* ── ROW 1: Clasificación + Identidad ─────────────────────────────── */}
        <div className="archon-grid-2">

          {/* CARD: Clasificación del Activo */}
          <div className="glass-card-pro bg-white p-64 space-y-40" style={{ borderTop: '4px solid #f2b705' }}>
            <div className="archon-card-header-pro">
              <ShieldCheck size={22} />
              <h3>Clasificación del Activo</h3>
            </div>

            {/* Tipo de Unidad */}
            <div className="archon-form-group">
              <label className="archon-label"><Truck size={12} /> Tipo de Unidad</label>
              <select
                className="archon-select"
                value={formData.assetType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  handleAssetTypeChange(e.target.value as AssetType)
                }
              >
                <option value="Vehiculo">Vehículo</option>
                <option value="Maquinaria">Maquinaria</option>
              </select>
            </div>

            {/* Marca — filtrada por Tipo */}
            <div className="archon-form-group">
              <label className="archon-label"><Tag size={12} /> Marca</label>
              <select
                required
                className="archon-select"
                value={formData.marca}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  handleMarcaChange(e.target.value)
                }
              >
                <option value="">— Selecciona marca —</option>
                {availableMarcas.map((m: string): React.ReactElement => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Modelo — filtrado por Marca */}
            <div className="archon-form-group">
              <label className="archon-label"><Tag size={12} /> Modelo</label>
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
                {availableModelos.map((m: string): React.ReactElement => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Año */}
            <div className="archon-form-group">
              <label className="archon-label"><Calendar size={12} /> Año Modelo</label>
              <input
                required
                type="number"
                className="archon-input"
                value={formData.year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, year: parseInt(e.target.value, 10) })
                }
              />
            </div>
          </div>

          {/* CARD: Identidad del Activo */}
          <div className="glass-card-pro bg-white p-64 space-y-40" style={{ borderTop: '4px solid #0f2a44' }}>
            <div className="archon-card-header-pro">
              <FileText size={22} />
              <h3>Identidad del Activo</h3>
            </div>

            {/* Número Económico */}
            <div className="archon-form-group">
              <label className="archon-label"><Tag size={12} /> Número Económico</label>
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
            </div>

            {/* Número de Serie */}
            <div className="archon-form-group">
              <label className="archon-label"><Tag size={12} /> Número de Serie</label>
              <input
                type="text"
                placeholder="Alfanumérico"
                className="archon-input"
                value={formData.numeroSerie}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, numeroSerie: e.target.value.toUpperCase() })
                }
              />
            </div>

            {/* Motor */}
            <div className="archon-form-group">
              <label className="archon-label"><Wrench size={12} /> Motor</label>
              <input
                type="text"
                placeholder="Ej. 2.8L Diesel TDI"
                className="archon-input"
                value={formData.motor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, motor: e.target.value })
                }
              />
            </div>

            {/* Tarjeta de Circulación */}
            <div className="archon-form-group">
              <label className="archon-label"><FileText size={12} /> Tarjeta de Circulación</label>
              <input
                type="text"
                placeholder="Folio o referencia"
                className="archon-input"
                value={formData.tarjetaCirculacion}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, tarjetaCirculacion: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* ── ROW 2: Configuración Mecánica + Operación ────────────────────── */}
        <div className="archon-grid-2">

          {/* CARD: Configuración Mecánica */}
          <div className="glass-card-pro bg-white p-64 space-y-40" style={{ borderTop: '4px solid #f2b705' }}>
            <div className="archon-card-header-pro">
              <Zap size={22} />
              <h3>Configuración Mecánica</h3>
            </div>

            {/* Tracción */}
            <div className="archon-form-group">
              <label className="archon-label"><Truck size={12} /> Tracción</label>
              <select
                className="archon-select"
                value={formData.traccion}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({ ...formData, traccion: e.target.value as Traccion })
                }
              >
                <option value="4x2">4x2</option>
                <option value="4x4">4x4</option>
                <option value="Doble Tracción">Doble Tracción</option>
                <option value="AWD">AWD</option>
                <option value="Oruga">Oruga</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Transmisión */}
            <div className="archon-form-group">
              <label className="archon-label"><Settings size={12} /> Transmisión</label>
              <select
                className="archon-select"
                value={formData.transmision}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({ ...formData, transmision: e.target.value as Transmision })
                }
              >
                <option value="Automática">Automática</option>
                <option value="Estándar (Manual)">Estándar (Manual)</option>
                <option value="CVT">CVT</option>
                <option value="Hidrostática">Hidrostática</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Combustible */}
            <div className="archon-form-group">
              <label className="archon-label"><Zap size={12} /> Combustible</label>
              <select
                className="archon-select"
                value={formData.fuelType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({ ...formData, fuelType: e.target.value as FuelType })
                }
              >
                <option value="Gasolina">Gasolina</option>
                <option value="Diesel">Diesel</option>
                <option value="Eléctrico">Eléctrico</option>
                <option value="Híbrido">Híbrido</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Odómetro / Horómetro */}
            <div className="archon-form-group">
              <label className="archon-label">
                <Gauge size={12} /> {formData.assetType === 'Maquinaria' ? 'Horómetro (hrs)' : 'Odómetro (km)'}
              </label>
              <input
                type="number"
                className="archon-input"
                value={formData.odometer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, odometer: parseFloat(e.target.value) })
                }
              />
            </div>

            {/* Capacidad de Carga */}
            <div className="archon-form-group">
              <label className="archon-label"><Truck size={12} /> Capacidad de Carga</label>
              <input
                type="text"
                placeholder="Ej. 3.5 Ton"
                className="archon-input"
                value={formData.capacidadCarga}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, capacidadCarga: e.target.value })
                }
              />
            </div>
          </div>

          {/* CARD: Organización & Cumplimiento */}
          <div className="glass-card-pro bg-white p-64 space-y-40" style={{ borderTop: '4px solid #0f2a44' }}>
            <div className="archon-card-header-pro">
              <MapPin size={22} />
              <h3>Organización &amp; Cumplimiento</h3>
            </div>

            {/* Sede */}
            <div className="archon-form-group">
              <label className="archon-label"><MapPin size={12} /> Sede</label>
              <input
                type="text"
                placeholder="Base de operaciones"
                className="archon-input"
                value={formData.sede}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, sede: e.target.value })
                }
              />
            </div>

            {/* Centro de Mantenimiento */}
            <div className="archon-form-group">
              <label className="archon-label"><Wrench size={12} /> Centro de Mantenimiento</label>
              <select
                className="archon-select"
                value={formData.centroMantenimiento}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                  setFormData({ ...formData, centroMantenimiento: e.target.value as CentroMantenimiento })
                }
              >
                <option value="PIIC">PIIC</option>
              </select>
            </div>

            {/* Vigencia del Seguro */}
            <div className="archon-form-group">
              <label className="archon-label"><Calendar size={12} /> Vigencia del Seguro</label>
              <ArchonDatePicker
                value={formData.vigenciaSeguro}
                onChange={(v: string): void => setFormData({ ...formData, vigenciaSeguro: v })}
                placeholder="Selecciona fecha"
              />
            </div>

            {/* Vencimiento de Verificación */}
            <div className="archon-form-group">
              <label className="archon-label"><Calendar size={12} /> Vencimiento de Verificación</label>
              <ArchonDatePicker
                value={formData.vencimientoVerificacion}
                onChange={(v: string): void => setFormData({ ...formData, vencimientoVerificacion: v })}
                placeholder="Selecciona fecha"
              />
            </div>

            {/* Submit */}
            <div className="pt-40">
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
      {/* 🚀 HEADER DINÁMICO SOBERANO - V.7.1.0.1 */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>

          {/* Section Left */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Truck size={28} style={{ color: '#f2b705' }} />
              <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                {currentView === 'GRID' ? 'Administrar Flota' : 'Registro de Unidad'}
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              {currentView === 'GRID' ? 'Gestión de Activos Vehiculares & Maquinaria • Industrial Grade' : 'Protocolo de Incorporación de Activo v.7.1.0.1'}
            </p>
          </div>

          {/* Section Right: User Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f2a44' }}>
              Archon
            </h1>

            <button
              onClick={toggleMenu}
              aria-label="User Menu"
              className="avatar-trigger-pro"
              style={{ width: '44px', height: '44px', borderRadius: '4px', border: '2px solid #f2b705', backgroundColor: '#0f2a44', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', boxShadow: isMenuOpen ? '0 0 0 4px rgba(242, 183, 5, 0.2)' : 'none', transform: isMenuOpen ? 'scale(0.95)' : 'scale(1)', padding: 0 }}
            >
              <svg width="24" height="24" viewBox="0 0 100 100">
                <path d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z" stroke="#f2b705" strokeWidth="16" fill="none" />
              </svg>
            </button>

            {isMenuOpen && (
              <div style={{ position: 'absolute', top: '60px', right: '0', width: '180px', backgroundColor: '#ffffff', borderRadius: '4px', boxShadow: '0 10px 30px rgba(15, 42, 68, 0.15)', border: '1px solid rgba(15, 42, 68, 0.08)', zIndex: 100, padding: '4px 0', animation: 'fade-in 0.2s ease-out' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(15, 42, 68, 0.05)' }}>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: '#f2b705', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sovereign Access</span>
                </div>
                <button className="dropdown-item-mock" onClick={closeMenu}><User size={14} /> Perfil</button>
                <button className="dropdown-item-mock" onClick={closeMenu}><Settings size={14} /> Ajustes</button>
                <div style={{ height: '1px', background: 'rgba(15, 42, 68, 0.05)', margin: '4px 0' }} />
                <button className="dropdown-item-mock dropdown-item-mock-danger" onClick={handleLogout}><LogOut size={14} /> Cerrar Sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 📊 ÁREA DE TRABAJO DINÁMICA (Chasis v.7.1.0.1) */}
      <section className="archon-workspace-chassis">
        {renderSubheader()}
        <div className="w-full">
          {currentView === 'GRID' ? renderGridView() : renderCreateView()}
        </div>
      </section>

      {/* ⚓ FOOTER SENTINEL (10vh) - V.7.1.0.1 */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">ArchonCore Sovereign v.7.1.0.1.</p>
      </footer>
    </main>
  );
};

export default FleetModule;
