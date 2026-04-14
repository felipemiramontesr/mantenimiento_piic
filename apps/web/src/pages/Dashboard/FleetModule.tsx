import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, ArrowRight, User, ArrowLeft, Save, ShieldCheck, Zap } from 'lucide-react';
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
  const [currentView, setCurrentView] = useState<FleetView>('GRID');
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  // 🏛️ RENDERING LOGIC: PORTAL GRID
  const renderGridView = (): React.ReactElement => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', width: '100%' }}>
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

  // 🛠️ RENDERING LOGIC: DEDICATED REGISTRATION PANEL
  const renderCreateView = (): React.ReactElement => (
    <div className="animate-in slide-in-from-bottom-4 duration-500 w-full max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-32">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-32">
                
                {/* ADN del Vehículo */}
                <div className="glass-card-pro bg-white/40 ring-1 ring-[#0f2a44]/5 p-32 space-y-24" style={{ borderTop: '4px solid #f2b705' }}>
                    <div className="flex items-center gap-12 border-b border-[#0f2a44]/5 pb-16">
                        <ShieldCheck size={18} className="text-[#f2b705]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]/60">Identidad & ADN</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-8">
                            <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Tag Soberano (PIIC-ID)</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-bold focus:border-[#f2b705] outline-none transition-all shadow-sm"
                                value={formData.tag}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tag: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="space-y-8">
                            <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Año de Fabricación</label>
                            <input 
                                required
                                type="number"
                                className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-bold focus:border-[#f2b705] outline-none transition-all shadow-sm"
                                value={formData.year}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, year: parseInt(e.target.value, 10)})}
                            />
                        </div>
                    </div>

                    <div className="space-y-8">
                        <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Nombre del Activo</label>
                        <input 
                            required
                            type="text"
                            placeholder="Ej. Toyota Hilux Operación Planta"
                            className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-bold focus:border-[#f2b705] outline-none transition-all shadow-sm"
                            value={formData.unitName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, unitName: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-8">
                            <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Combustible</label>
                            <select 
                                className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-black outline-none focus:border-[#f2b705]"
                                value={formData.fuelType}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, fuelType: e.target.value})}
                            >
                                <option value="Gasolina">Gasolina</option>
                                <option value="Diesel">Diesel</option>
                            </select>
                        </div>
                        <div className="space-y-8">
                            <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Odómetro Inicial (KM)</label>
                            <input 
                                type="number"
                                className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-bold outline-none focus:border-[#f2b705]"
                                value={formData.odometer}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, odometer: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                </div>

                {/* Parámetros de Operación */}
                <div className="glass-card-pro bg-white/40 ring-1 ring-[#0f2a44]/5 p-32 space-y-24" style={{ borderTop: '4px solid #0f2a44' }}>
                    <div className="flex items-center gap-12 border-b border-[#0f2a44]/5 pb-16">
                        <Zap size={18} className="text-[#0f2a44]" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]/60">Estrategia Operativa</h3>
                    </div>

                    <div className="space-y-8">
                        <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Tipo de Unidad</label>
                        <select 
                            className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-black outline-none focus:border-[#0f2a44]"
                            value={formData.unitType}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, unitType: e.target.value})}
                        >
                            {CATEGORIES.map((c: string): React.ReactElement => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="space-y-8">
                        <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Uso Industrial Designado</label>
                        <select 
                            className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-black outline-none focus:border-[#0f2a44]"
                            value={formData.unitUsage}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, unitUsage: e.target.value})}
                        >
                            {METRICS.map((m: string): React.ReactElement => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-8">
                            <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Especificación Neumático</label>
                            <input 
                                type="text"
                                placeholder="Ej. 255/70 R15"
                                className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-bold outline-none focus:border-[#0f2a44]"
                                value={formData.tireSpec}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tireSpec: e.target.value})}
                            />
                        </div>
                        <div className="space-y-8">
                            <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest opacity-40">Marca de Neumáticos</label>
                            <input 
                                type="text"
                                placeholder="Ej. Michelin"
                                className="w-full bg-white border border-[#0f2a44]/10 px-16 py-12 rounded-4 text-sm font-bold outline-none focus:border-[#0f2a44]"
                                value={formData.tireBrand}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tireBrand: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div className="pt-16">
                        <button 
                            type="submit"
                            className="w-full bg-[#0f2a44] text-white py-16 rounded-4 font-black flex items-center justify-center gap-12 hover:bg-[#1a3a5a] transition-all shadow-xl shadow-[#0f2a44]/20"
                        >
                            <Save size={18} className="text-[#f2b705]" /> Confirmar Incorporación de Activo
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </div>
  );

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER DINÁMICO SOBERANO - V.5.3.0 */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px' }}>
            {currentView === 'CREATE' && (
                <button 
                    onClick={(): void => setCurrentView('GRID')}
                    className="p-12 hover:bg-[#0f2a44]/5 rounded-4 transition-all flex items-center gap-8 group"
                >
                    <ArrowLeft size={24} className="text-[#0f2a44] group-hover:-translate-x-4 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-40">Volver</span>
                </button>
            )}
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
          </div>

          <div className="flex gap-12">
            <div className="bg-[#0f2a44]/5 px-16 py-8 rounded-4 border border-[#0f2a44]/10 flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#0f2a44] opacity-40">Total Unidades</span>
                <span className="text-xl font-black text-[#0f2a44]">{loading ? '...' : units.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 📊 ÁREA DE TRABAJO DINÁMICA */}
      <section className="workspace-body-pro">
        {currentView === 'GRID' ? renderGridView() : renderCreateView()}
      </section>

      {/* ⚓ FOOTER SENTINEL (10vh) - FORMATO ORACIÓN v.5.3.0 */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">ArchonCore Sovereign v.5.3.0.</p>
      </footer>
    </main>
  );
};

export default FleetModule;
