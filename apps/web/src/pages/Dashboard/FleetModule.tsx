import React, { useState, useEffect } from 'react';
import { Truck, Plus, X, Search, ArrowRight, User } from 'lucide-react';
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

const FleetModule: React.FC = (): React.ReactElement => {
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState<boolean>(false);

  // Form State (Standardized to camelCase for Pinnacle Standards)
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
        setIsSlideOverOpen(false);
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
      }
    } catch (error) {
      // Noise reduced for CI compliance
    }
  };

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO - V.5.2.2 */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Truck size={28} style={{ color: '#f2b705' }} />
              <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                Administrar Flota
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Gestión de Activos Vehiculares • Industrial Grade
            </p>
          </div>

          <div className="flex gap-12">
            <div className="bg-[#0f2a44]/5 px-16 py-8 rounded-4 border border-[#0f2a44]/10 flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#0f2a44] opacity-40">Total Unidades</span>
                <span className="text-xl font-black text-[#0f2a44]">{loading ? '...' : units.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 📊 BODY MODULAR (Instrument Cluster Logic) */}
      <section className="workspace-body-pro">
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
                onClick={(): void => setIsSlideOverOpen(true)}
                className="btn-sentinel-yellow" 
              >
                Iniciar Registro <ArrowRight size={10} className="text-[#0f2a44]" />
              </button>
            </div>
          </div>

          {/* Card 2: Exploración de Inventario (Placeholder Logic) */}
          <div
            className="glass-card-pro"
            style={{
              borderTop: '4px solid #8b5cf6',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
              <Search size={20} style={{ color: '#8b5cf6' }} />
              <span className="text-instrument-header text-[#0f2a44] opacity-80">
                Exploración de Datos
              </span>
            </div>
            <div className="mb-24" style={{ width: '100%' }}>
              <h3 className="text-kpi-black text-[#0f2a44] text-xl" style={{ fontSize: '1.5rem' }}>
                Inventario General
              </h3>
              <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
                Visualización técnica y estados de la flota
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                disabled
                className="btn-sentinel-yellow opacity-40 cursor-not-allowed" 
                style={{ backgroundColor: '#8b5cf6', color: 'white' }}
              >
                Próximamente <ArrowRight size={10} className="text-white" />
              </button>
            </div>
          </div>

          {/* Card 3: Gestión de Operadores (Placeholder Logic) */}
          <div
            className="glass-card-pro"
            style={{
              borderTop: '4px solid #10b981',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
              <User size={20} style={{ color: '#10b981' }} />
              <span className="text-instrument-header text-[#0f2a44] opacity-80">
                Logística Humana
              </span>
            </div>
            <div className="mb-24" style={{ width: '100%' }}>
              <h3 className="text-kpi-black text-[#0f2a44] text-xl" style={{ fontSize: '1.5rem' }}>
                Gestión Operadores
              </h3>
              <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
                Asignación de personal a unidades de flota
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                disabled
                className="btn-sentinel-yellow opacity-40 cursor-not-allowed" 
                style={{ backgroundColor: '#10b981', color: 'white' }}
              >
                Próximamente <ArrowRight size={10} className="text-white" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 🚀 SLIDE-OVER REGISTRO (Industrial) */}
      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={(): void => setIsSlideOverOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="h-full flex flex-col">
                <header className="px-24 py-20 bg-[#0f2a44] text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Registro de Unidad</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Fase de Incorporación Flotilla</p>
                  </div>
                  <button onClick={(): void => setIsSlideOverOpen(false)} className="hover:rotate-90 transition-transform">
                    <X size={24} />
                  </button>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-24 py-20 bg-neutral-50 space-y-24">
                  
                  {/* Sección Identidad */}
                  <div className="space-y-16">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#f2b705] border-b border-[#f2b705]/20 pb-4">Identidad del Activo</h3>
                    <div className="grid grid-cols-2 gap-12">
                         <div className="space-y-4">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tag (PIIC-ID)</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold focus:border-[#0f2a44] outline-none"
                                value={formData.tag}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tag: e.target.value.toUpperCase()})}
                            />
                         </div>
                         <div className="space-y-4">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Año</label>
                            <input 
                                required
                                type="number"
                                className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold focus:border-[#0f2a44] outline-none"
                                value={formData.year}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, year: parseInt(e.target.value, 10)})}
                            />
                         </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Nombre del Vehículo</label>
                        <input 
                            required
                            type="text"
                            placeholder="Ej. Toyota Hilux Operación Mina"
                            className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold focus:border-[#0f2a44] outline-none"
                            value={formData.unitName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, unitName: e.target.value})}
                        />
                    </div>
                  </div>

                  {/* Sección Técnica */}
                  <div className="space-y-16">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#f2b705] border-b border-[#f2b705]/20 pb-4">Especificaciones Tácticas</h3>
                    <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Combustible</label>
                            <select 
                                className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold outline-none"
                                value={formData.fuelType}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, fuelType: e.target.value})}
                            >
                                <option value="Gasolina">Gasolina</option>
                                <option value="Diesel">Diesel</option>
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Odómetro (KM)</label>
                            <input 
                                type="number"
                                className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold outline-none"
                                value={formData.odometer}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, odometer: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tipo de Neumático</label>
                            <input 
                                type="text"
                                placeholder="Ej. 255/70 R15"
                                className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold outline-none"
                                value={formData.tireSpec}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tireSpec: e.target.value})}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Marca Llantas</label>
                            <input 
                                type="text"
                                placeholder="Ej. Michelin Energy"
                                className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold outline-none"
                                value={formData.tireBrand}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tireBrand: e.target.value})}
                            />
                        </div>
                    </div>
                  </div>

                  {/* Sección Despliegue */}
                  <div className="space-y-16">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#f2b705] border-b border-[#f2b705]/20 pb-4">Parámetros de Despliegue</h3>
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tipo de Activo</label>
                        <select 
                            className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold outline-none"
                            value={formData.unitType}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, unitType: e.target.value})}
                        >
                            {CATEGORIES.map((c: string): React.ReactElement => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Uso Operativo</label>
                        <select 
                            className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold outline-none"
                            value={formData.unitUsage}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, unitUsage: e.target.value})}
                        >
                            {METRICS.map((m: string): React.ReactElement => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                  </div>

                </form>

                <footer className="p-24 bg-white border-t border-neutral-100 flex gap-12">
                  <button 
                    onClick={(): void => setIsSlideOverOpen(false)}
                    className="flex-1 px-20 py-12 rounded-4 text-sm font-bold text-neutral-500 hover:bg-neutral-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    onClick={handleSubmit}
                    className="flex-1 bg-[#0f2a44] text-white px-20 py-12 rounded-4 text-sm font-black tracking-tight hover:bg-[#1a3a5a] transition-all shadow-lg shadow-[#0f2a44]/20"
                  >
                    Confirmar Registro
                  </button>
                </footer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚓ FOOTER SENTINEL (10vh) - FORMATO ORACIÓN v.5.2.2 */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">ArchonCore Sovereign v.5.2.2.</p>
      </footer>
    </main>
  );
};

export default FleetModule;
