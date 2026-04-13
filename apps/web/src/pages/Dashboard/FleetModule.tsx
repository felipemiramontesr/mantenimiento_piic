import React, { useState, useEffect } from 'react';
import { Truck, Plus, X, Search, Filter, MoreVertical, Wrench, Navigation, CheckCircle2, Ban, Gauge } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    tag: '',
    unit_name: '',
    year: new Date().getFullYear(),
    fuel_type: 'Gasolina',
    tire_spec: '',
    tire_brand: '',
    unit_type: CATEGORIES[0],
    unit_usage: METRICS[0],
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
      console.error('Failed to fetch units:', error);
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
            unit_name: '',
            year: new Date().getFullYear(),
            fuel_type: 'Gasolina',
            tire_spec: '',
            tire_brand: '',
            unit_type: CATEGORIES[0],
            unit_usage: METRICS[0],
            odometer: 0,
            status: 'Disponible'
        });
        fetchUnits();
      }
    } catch (error) {
      console.error('Failed to register unit:', error);
      alert('Error al registrar la unidad. Verifique los datos.');
    }
  };

  const statusIcons: Record<string, React.ReactElement> = {
    'Disponible': <CheckCircle2 size={14} className="text-emerald-500" />,
    'En Ruta': <Navigation size={14} className="text-blue-500" />,
    'En Mantenimiento': <Wrench size={14} className="text-amber-500" />,
    'Descontinuada': <Ban size={14} className="text-rose-500" />
  };

  const filteredUnits = units.filter((u: FleetUnit): boolean => 
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO - V.5.2.0 */}
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

          <button 
            onClick={(): void => setIsSlideOverOpen(true)}
            className="flex items-center gap-8 bg-[#0f2a44] text-white px-20 py-10 rounded-4 font-bold text-sm hover:bg-[#1a3a5a] transition-all shadow-lg"
          >
            <Plus size={16} /> Registrar Unidad
          </button>
        </div>
      </header>

      {/* 📊 DASHBOARD & TABLE */}
      <section className="workspace-body-pro" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Filtros Tácticos */}
        <div className="flex justify-between items-center bg-white p-12 rounded-8 border border-neutral-100 shadow-sm">
            <div className="flex items-center gap-12 bg-neutral-50 px-12 py-8 rounded-4 border border-neutral-200 w-full max-w-sm">
                <Search size={16} className="text-neutral-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por ID, Nombre o Tag..."
                    className="bg-transparent border-none outline-none text-sm w-full font-medium"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-12">
                <button className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-[#0f2a44]">
                    <Filter size={14} /> Filtros
                </button>
            </div>
        </div>

        {/* Tabla Industrial */}
        <div className="bg-white rounded-8 border border-neutral-100 shadow-sm overflow-hidden min-h-[50vh]">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                        <th className="p-16 text-[10px] font-black uppercase tracking-widest text-neutral-400">Identity</th>
                        <th className="p-16 text-[10px] font-black uppercase tracking-widest text-neutral-400">Unidad</th>
                        <th className="p-16 text-[10px] font-black uppercase tracking-widest text-neutral-400">Especificación</th>
                        <th className="p-16 text-[10px] font-black uppercase tracking-widest text-neutral-400">Odómetro</th>
                        <th className="p-16 text-[10px] font-black uppercase tracking-widest text-neutral-400">Estado</th>
                        <th className="p-16 text-[10px] font-black uppercase tracking-widest text-neutral-400"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                    {loading ? (
                        <tr><td colSpan={6} className="p-40 text-center text-neutral-400 text-sm italic">Cargando unidades...</td></tr>
                    ) : filteredUnits.length === 0 ? (
                        <tr><td colSpan={6} className="p-40 text-center text-neutral-400 text-sm italic">No hay unidades registradas.</td></tr>
                    ) : filteredUnits.map((unit: FleetUnit): React.ReactElement => (
                        <tr key={unit.uuid} className="hover:bg-neutral-50/50 transition-colors group">
                            <td className="p-16">
                                <div className="flex flex-col">
                                    <span className="text-[#0f2a44] font-black text-sm tracking-tight">{unit.id}</span>
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">{unit.tag}</span>
                                </div>
                            </td>
                            <td className="p-16">
                                <div className="flex flex-col">
                                    <span className="text-neutral-800 font-bold text-sm">{unit.unit_name}</span>
                                    <span className="text-xs text-neutral-500">{unit.year} • {unit.fuel_type}</span>
                                </div>
                            </td>
                            <td className="p-16">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-neutral-600 capitalize">{unit.unit_type}</span>
                                    <span className="text-[10px] text-neutral-400">{unit.unit_usage}</span>
                                </div>
                            </td>
                            <td className="p-16">
                                <div className="flex items-center gap-4 text-xs font-mono font-bold text-neutral-700">
                                    <Gauge size={12} className="opacity-40" />
                                    {Number(unit.odometer).toLocaleString()} <span className="text-[10px] opacity-40 font-sans">KM</span>
                                </div>
                            </td>
                            <td className="p-16">
                                <div className="flex items-center gap-6 bg-white px-8 py-4 rounded-full border border-neutral-100 shadow-sm w-fit">
                                    {statusIcons[unit.status]}
                                    <span className="text-[10px] font-bold text-neutral-600">{unit.status}</span>
                                </div>
                            </td>
                            <td className="p-16 text-right">
                                <button className="p-8 hover:bg-white rounded-4 transition-all opacity-0 group-hover:opacity-100">
                                    <MoreVertical size={16} className="text-neutral-400" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, year: parseInt(e.target.value)})}
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
                            value={formData.unit_name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, unit_name: e.target.value})}
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
                                value={formData.fuel_type}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, fuel_type: e.target.value})}
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
                                value={formData.tire_spec}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tire_spec: e.target.value})}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Marca Llantas</label>
                            <input 
                                type="text"
                                placeholder="Ej. Michelin Energy"
                                className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold outline-none"
                                value={formData.tire_brand}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({...formData, tire_brand: e.target.value})}
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
                            value={formData.unit_type}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, unit_type: e.target.value})}
                        >
                            {CATEGORIES.map((c: string): React.ReactElement => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Uso Operativo</label>
                        <select 
                            className="w-full bg-white border border-neutral-200 px-12 py-8 rounded-4 text-sm font-bold outline-none"
                            value={formData.unit_usage}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setFormData({...formData, unit_usage: e.target.value})}
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

      {/* ⚓ FOOTER SENTINEL (10vh) - FORMATO ORACIÓN v.5.2.0 */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">ArchonCore Sovereign v.5.2.0.</p>
      </footer>
    </main>
  );
};

export default FleetModule;
