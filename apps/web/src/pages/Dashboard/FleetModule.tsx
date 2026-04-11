import React, { useState, useEffect } from 'react';
import { Plus, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';

interface FleetUnit {
  id: string;
  tag: string;
  type: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  assigned_to: number | null;
}

const SlideOver: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
        role="button"
        tabIndex={0}
      />
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-[#0A1A2A] shadow-2xl z-50 transform transition-transform duration-500 border-l border-white/10 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-32 flex flex-col h-full relative">
          <button 
            onClick={onClose}
            className="absolute top-24 right-24 text-white/50 hover:text-white"
          >
            ✕
          </button>
          
          <h2 className="text-2xl font-black text-pinnacle-primary mb-8 tracking-tight">Add Unit</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-32">Initialize Core Fleet Parameter</p>

          <form className="space-y-24 flex-1">
            <div className="form-group">
              <label className="text-[11px] font-bold uppercase tracking-[0.3em] ml-1 text-pinnacle-text">Identity Tag</label>
              <input type="text" className="diamond-input" placeholder="e.g. PIIC-003" />
            </div>
            <div className="form-group">
              <label className="text-[11px] font-bold uppercase tracking-[0.3em] ml-1 text-pinnacle-text">Vehicle Class</label>
              <select className="diamond-input">
                <option value="Camioneta 4x4">Camioneta 4x4</option>
                <option value="Retroexcavadora">Retroexcavadora</option>
                <option value="Camión de Volteo">Camión de Volteo</option>
              </select>
            </div>
          </form>

          <div className="mt-auto pt-24 border-t border-white/10">
            <button className="diamond-button w-full">Engage Registration</button>
          </div>
        </div>
      </div>
    </>
);

const FleetModule: React.FC = () => {
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSlideOverOpen, setSlideOverOpen] = useState(false);

  useEffect(() => {
    api.get<{ data: FleetUnit[] }>('/fleet')
      .then((response) => {
        setUnits(response.data.data);
      })
      .catch(() => {
        // Ignored in mockup
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const StatusBadge: React.FC<{ status: FleetUnit['status'] }> = ({ status }) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-2 px-8 py-4 rounded bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-wider border border-green-500/30"><CheckCircle2 size={12}/> Optima</span>;
      case 'MAINTENANCE':
        return <span className="inline-flex items-center gap-2 px-8 py-4 rounded bg-pinnacle-accent/20 text-pinnacle-accent text-[10px] font-black uppercase tracking-wider border border-pinnacle-accent/30"><Settings size={12}/> Maintenance</span>;
      default:
        return <span className="inline-flex items-center gap-2 px-8 py-4 rounded bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider border border-red-500/30"><AlertCircle size={12}/> Offline</span>;
    }
  };

  const renderTableContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div className="p-32 text-center text-white/40 text-[10px] font-black uppercase tracking-widest">
          Syncing Archon Matrices...
        </div>
      );
    }
    if (units.length === 0) {
      return (
        <div className="p-32 text-center text-white/40 text-[10px] font-black uppercase tracking-widest">
          No fleet units registered
        </div>
      );
    }
    return units.map((unit) => (
      <div key={unit.id} className="grid grid-cols-5 px-32 py-24 border-b border-white/5 items-center hover:bg-white/[0.02] transition-colors group">
        <div className="col-span-1 font-bold text-pinnacle-primary">{unit.tag}</div>
        <div className="col-span-2 font-medium text-white/80">{unit.type}</div>
        <div className="col-span-1">
          <StatusBadge status={unit.status} />
        </div>
        <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" className="text-[10px] font-black uppercase tracking-widest text-pinnacle-accent hover:text-white">Audit</button>
        </div>
      </div>
    ));
  };

  return (
    <div className="p-32 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-40">
        <div>
          <h2 className="text-pinnacle-primary tracking-tight font-black text-3xl">Fleet Registry</h2>
          <p className="text-pinnacle-text/60 mt-2">Centralized vehicular control mapping</p>
        </div>
        <button 
          type="button"
          onClick={(): void => setSlideOverOpen(true)}
          className="bg-pinnacle-accent/10 hover:bg-pinnacle-accent/20 text-pinnacle-accent border border-pinnacle-accent/30 px-16 py-8 rounded font-black text-[11px] uppercase tracking-widest flex items-center gap-8 transition-colors"
        >
          <Plus size={16} /> Add Unit
        </button>
      </header>

      {/* Grid KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-24 mb-40">
        <div className="glass-morphism p-24 rounded-pinnacle-card border-l-2 border-l-pinnacle-primary">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/50 mb-4">Total Inventory</p>
          <h3 className="text-4xl font-black text-white">{loading ? '-' : units.length}</h3>
        </div>
        <div className="glass-morphism p-24 rounded-pinnacle-card border-l-2 border-l-green-500">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/50 mb-4">Active Deployments</p>
          <h3 className="text-4xl font-black text-green-400">{loading ? '-' : units.filter(u => u.status === 'ACTIVE').length}</h3>
        </div>
        <div className="glass-morphism p-24 rounded-pinnacle-card border-l-2 border-l-pinnacle-accent">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/50 mb-4">In Maintenance</p>
          <h3 className="text-4xl font-black text-pinnacle-accent">{loading ? '-' : units.filter(u => u.status === 'MAINTENANCE').length}</h3>
        </div>
      </div>

      {/* Tilted Database Log */}
      <div className="glass-morphism p-[1px] rounded overflow-hidden">
        <div className="bg-[#0b172a]/80 backdrop-blur-xl w-full">
          <div className="grid grid-cols-5 px-32 py-16 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            <div className="col-span-1">Identity Tag</div>
            <div className="col-span-2">Classification</div>
            <div className="col-span-1">System Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          
          <div className="flex flex-col">
            {renderTableContent()}
          </div>
        </div>
      </div>

      <SlideOver isOpen={isSlideOverOpen} onClose={(): void => setSlideOverOpen(false)} />
    </div>
  );
};

export default FleetModule;
