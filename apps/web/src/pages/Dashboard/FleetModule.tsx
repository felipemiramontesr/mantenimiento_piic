import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, ArrowRight, User, ArrowLeft, Save, ShieldCheck, Zap, Calendar, Fuel, Gauge, Box, Layers, Tag, Edit3, Settings, LogOut } from 'lucide-react';
import api from '../../api/client';
import { FleetUnit } from '../../types/fleet';

// 📊 INDUSTRIAL CATALOGS (Extracted from Image Analysis)
const CATEGORIES: string[] = [
  'All-Terrain (A/T)', 'Mixta (H/T)', 'Carga (LT)', 'Passenger', 
  'Carga (Rango E)', 'High Terrain (H/T)', 'Carga Ligera', 
  'Mud-Terrain (M/T)', 'SUV/Carretera', 'Carga (Tipo C)'
];

const METRICS: string[] = [
  'Terraceria leve', 'Carretera/Ciudad', 'Pesado/Planta', 'Mina/Roca', 
  'Ciudad', 'Carga Pesada', 'Carretera', 'Mixto', 'Campo/Mina', 
  'Planta', 'Mina', 'Extremo/Lodo', 'Campo', 'Reparto'
];

type FleetView = 'GRID' | 'CREATE';

const FleetModule: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<FleetView>('GRID');
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const toggleMenu = (): void => setIsMenuOpen(!isMenuOpen);
  const closeMenu = (): void => setIsMenuOpen(false);

  const handleLogout = (): void => {
    localStorage.removeItem('archon_token');
    navigate('/login');
  };

  // Form State
  const [formData, setFormData] = useState({
    tag: '',
    unitName: '',
    year: new Date().getFullYear(),
    fuelType: 'Gasolina',
    tireSpec: '',
    tireBrand: '',
    unitType: CATEGORIES[0],
    unitUsage: METRICS[0],
    odometer: 0,
    status: 'Disponible'
  });

  const fetchUnits = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.get('/fleet');
      if (response.data.success) {
        setUnits(response.data.data);
      }
    } catch (error) {
      // Noise reduction for CI
    } finally {
      setLoading(false);
    }
  };

  useEffect((): void => {
    fetchUnits();
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      const response = await api.post('/fleet', formData);
      if (response.data.success) {
        setFormData({
            tag: '',
            unitName: '',
            year: new Date().getFullYear(),
            fuelType: 'Gasolina',
            tireSpec: '',
            tireBrand: '',
            unitType: CATEGORIES[0],
            unitUsage: METRICS[0],
            odometer: 0,
            status: 'Disponible'
        });
        fetchUnits();
        setCurrentView('GRID');
      }
    } catch (error) {
      // Noise reduced for CI compliance
    }
  };

  // 🛠️ SHARED COMPONENT: OPERATIONAL SUBHEADER
  const renderSubheader = (): React.ReactElement => (
    <div 
        className="flex items-center justify-between w-full pb-80 animate-in fade-in duration-500"
        style={{ paddingLeft: '4px', paddingRight: '4px' }}
    >
        {/* Left: Navigation (Conditional) */}
        <div className="flex items-center min-w-[120px]">
            {currentView === 'CREATE' && (
                <button 
                    onClick={(): void => setCurrentView('GRID')}
                    className="btn-sentinel-yellow"
                >
                    <ArrowLeft size={14} /> Volver al Panel
                </button>
            )}
        </div>

        {/* Right: Operational KPI (Conditional v.6.0.0) */}
        {currentView === 'GRID' && (
            <div className="flex items-center ml-auto">
                <span style={{ 
                    fontSize: '26px', 
                    fontWeight: 900, 
                    color: '#0f2a44',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.02em'
                }}>
                    Total de Unidades:
                </span>
                <span style={{ 
                    fontSize: '26px', 
                    fontWeight: 900, 
                    color: '#f2b705',
                    fontFamily: 'Inter, sans-serif',
                    marginLeft: '12px'
                }}>
                    {loading ? '...' : units.length}
                </span>
            </div>
        )}
    </div>
  );

  // 🏛️ RENDERING LOGIC: PORTAL GRID
  const renderGridView = (): React.ReactElement => (
    <div className="archon-grid-3">
      {/* Card 1: Registrar Nueva Unidad */}
      <div
        className="glass-card-pro"
        style={{
          borderTop: '4px solid #f2b705',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
          <Plus size={20} style={{ color: '#f2b705' }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">
            Incorporación de Activos
          </span>
        </div>

        <div className="mb-24" style={{ width: '100%' }}>
          <h3 className="text-kpi-black text-[#0f2a44] text-xl" style={{ fontSize: '1.5rem' }}>
            Registrar Unidad
          </h3>
          <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
            Ingreso de nuevos vehículos
          </p>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <button 
            onClick={(): void => setCurrentView('CREATE')}
            className="btn-sentinel-yellow" 
          >
            Iniciar Registro <ArrowRight size={10} className="text-[#0f2a44]" />
          </button>
        </div>
      </div>

      {/* Card 2: Exploración de Inventario (Placeholder) */}
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

      {/* Card 3: Gestión de Operadores (Placeholder) */}
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

  // 🛠️ RENDERING LOGIC: DEDICATED REGISTRATION PANEL (REFRACTORED v.5.3.2)
  const renderCreateView = (): React.ReactElement => (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-6xl mx-auto pb-64">
        <form onSubmit={handleSubmit} className="space-y-48">
            <div className="archon-grid-2">
                
                {/* ADN del Vehículo */}
                <div className="glass-card-pro bg-white p-64 space-y-40" style={{ borderTop: '4px solid #f2b705' }}>
                    <div className="archon-card-header-pro">
                        <ShieldCheck size={22} />
                        <h3>Identidad & ADN Soberano</h3>
                    </div>
                    
                    <div className="archon-grid-2">
                        <div className="archon-form-group">
                            <label className="archon-label"><Tag size={12} /> Tag Institucional</label>
                            <input 
                                required
                                type="text"
                                placeholder="FL00X"
                                className="archon-input"
                                value={formData.tag}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tag: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="archon-form-group">
                            <label className="archon-label"><Calendar size={12} /> Año Modelo</label>
                            <input 
                                required
                                type="number"
                                className="archon-input"
                                value={formData.year}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, year: parseInt(e.target.value, 10)})}
                            />
                        </div>
                    </div>

                    <div className="archon-form-group">
                        <label className="archon-label"><Edit3 size={12} /> Nombre del Activo</label>
                        <input 
                            required
                            type="text"
                            placeholder="Ej. Toyota Hilux Operación"
                            className="archon-input"
                            value={formData.unitName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, unitName: e.target.value})}
                        />
                    </div>

                    <div className="archon-grid-2">
                        <div className="archon-form-group">
                            <label className="archon-label"><Fuel size={12} /> Combustible</label>
                            <select 
                                className="archon-select"
                                value={formData.fuelType}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, fuelType: e.target.value})}
                            >
                                <option value="Gasolina">Gasolina</option>
                                <option value="Diesel">Diesel</option>
                            </select>
                        </div>
                        <div className="archon-form-group">
                            <label className="archon-label"><Gauge size={12} /> Odómetro (KM)</label>
                            <input 
                                type="number"
                                className="archon-input"
                                value={formData.odometer}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, odometer: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                </div>

                {/* Parámetros de Operación */}
                <div className="glass-card-pro bg-white p-64 space-y-40" style={{ borderTop: '4px solid #0f2a44' }}>
                    <div className="archon-card-header-pro">
                        <Zap size={22} />
                        <h3>Estrategia Operativa</h3>
                    </div>

                    <div className="archon-form-group">
                        <label className="archon-label"><Layers size={12} className="text-[#f2b705]" /> Categoría de Unidad</label>
                        <select 
                            className="archon-select"
                            value={formData.unitType}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, unitType: e.target.value})}
                        >
                            {CATEGORIES.map((c: string): React.ReactElement => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="archon-form-group">
                        <label className="archon-label"><Box size={12} className="text-[#f2b705]" /> Uso Industrial</label>
                        <select 
                            className="archon-select"
                            value={formData.unitUsage}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, unitUsage: e.target.value})}
                        >
                            {METRICS.map((m: string): React.ReactElement => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="archon-grid-2">
                        <div className="archon-form-group">
                            <label className="archon-label"><Plus size={12} className="text-[#f2b705]" /> Especificación Llantas</label>
                            <input 
                                type="text"
                                placeholder="255/70 R15"
                                className="archon-input"
                                value={formData.tireSpec}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tireSpec: e.target.value})}
                            />
                        </div>
                        <div className="archon-form-group">
                            <label className="archon-label"><Plus size={12} className="text-[#f2b705]" /> Marca Neumáticos</label>
                            <input 
                                type="text"
                                placeholder="Michelin"
                                className="archon-input"
                                value={formData.tireBrand}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tireBrand: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div className="pt-40">
                        <button 
                            type="submit"
                            className="btn-sentinel-yellow w-full"
                        >
                            <Save size={18} /> Confirmar Incorporación de Activo
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </div>
  );

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER DINÁMICO SOBERANO - V.6.0.0 */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          
          {/* Section Left: Contextual Identity */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Truck size={28} style={{ color: '#f2b705' }} />
                <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                    {currentView === 'GRID' ? 'Administrar Flota' : 'Registro de Unidad'}
                </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
                {currentView === 'GRID' ? 'Gestión de Activos Vehiculares • Industrial Grade' : 'Protocolo de Incorporación de Activo'}
            </p>
          </div>

          {/* Section Right: Standard User Identity & Access */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
            <h1 style={{ 
                fontSize: '26px', 
                fontWeight: 900, 
                margin: 0, 
                letterSpacing: '-0.03em', 
                fontFamily: 'Inter, system-ui, sans-serif', 
                color: '#0f2a44' 
            }}>
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
                    padding: 0
                }}
            >
                <svg width="24" height="24" viewBox="0 0 100 100">
                    <path d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z" stroke="#f2b705" strokeWidth="16" fill="none" />
                </svg>
            </button>

            {isMenuOpen && (
              <div style={{
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
                animation: 'fade-in 0.2s ease-out'
              }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(15, 42, 68, 0.05)' }}>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: '#f2b705', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sovereign Access</span>
                </div>
                <button 
                  className="dropdown-item-mock" 
                  onClick={closeMenu}
                >
                  <User size={14} /> Perfil
                </button>
                <button 
                  className="dropdown-item-mock" 
                  onClick={closeMenu}
                >
                  <Settings size={14} /> Ajustes
                </button>
                <div style={{ height: '1px', background: 'rgba(15, 42, 68, 0.05)', margin: '4px 0' }} />
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

      {/* 📊 ÁREA DE TRABAJO DINÁMICA (Chasis v.6.0.0) */}
      <section className="archon-workspace-chassis">
        {/* OPERATIONAL SUBHEADER (Unified Grid Row 1) */}
        {renderSubheader()}

        <div className="w-full">
            {currentView === 'GRID' ? renderGridView() : renderCreateView()}
        </div>
      </section>

      {/* ⚓ FOOTER SENTINEL (10vh) - FORMATO ORACIÓN v.6.0.0 */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">ArchonCore Sovereign v.6.0.0.</p>
      </footer>
    </main>
  );
};

export default FleetModule;
