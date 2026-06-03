import React from 'react';
import { Bell } from 'lucide-react';

const AlertsPanel: React.FC = (): React.JSX.Element => (
  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-in fade-in duration-700">
    <div className="w-16 h-16 rounded-[4px] flex items-center justify-center bg-[#0f2a44]/5">
      <Bell size={28} className="text-[#0f2a44]/20" />
    </div>
    <div>
      <p className="text-[11px] font-black uppercase tracking-widest text-[#0f2a44] opacity-40">
        Sin alertas activas
      </p>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44] opacity-20 mt-1">
        Las notificaciones del sistema aparecerán aquí
      </p>
    </div>
  </div>
);

export default AlertsPanel;
