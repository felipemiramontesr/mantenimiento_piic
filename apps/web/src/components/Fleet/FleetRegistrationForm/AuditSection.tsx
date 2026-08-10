import React from 'react';
import { Zap } from 'lucide-react';

type AuditSectionProps = {
  pronosticoText: string;
  pronosticoDateStr: string;
  isPronosticoReady: boolean;
};

/** PANEL 5b (sin título) — Pronóstico automático de vencimiento de mantenimiento. */
export function AuditSection({
  pronosticoText,
  pronosticoDateStr,
  isPronosticoReady,
}: AuditSectionProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-10 [--card-accent:#0f2a44] min-h-[190px] flex flex-col justify-between">
      <div className="card-sovereign-header">
        <Zap size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">PRONÓSTICO AUTOMÁTICO</h3>
      </div>

      <div
        className={`p-5 rounded-[4px] border ${
          isPronosticoReady
            ? 'bg-pinnacle-navy border-pinnacle-navy/20 shadow-lg'
            : 'bg-pinnacle-navy/5 border-pinnacle-navy/10'
        } transition-all duration-500 flex-1 flex flex-col justify-center`}
      >
        <div className="flex items-center gap-4">
          <Zap
            className={
              isPronosticoReady ? 'text-pinnacle-yellow animate-pulse' : 'text-pinnacle-navy/20'
            }
            size={24}
          />
          <div className="flex-1">
            {isPronosticoReady ? (
              <div className="space-y-0.5">
                <p className="text-2xl font-black text-white tracking-tighter">
                  {pronosticoDateStr}
                </p>
                <p className="text-archon-base text-white/60 font-bold uppercase tracking-widest">
                  {pronosticoText}
                </p>
              </div>
            ) : (
              <p className="text-archon-base text-pinnacle-navy/40 font-bold uppercase tracking-widest">
                {pronosticoText}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditSection;
