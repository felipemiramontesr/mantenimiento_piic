import React, { useState } from 'react';
import { SYSTEM_VERSION } from './constants/versionConstants';
import { useArchonDoctorContext } from './context/ArchonDoctorContext';
import type { DoctorFleetContext, TelemetryLog } from './hooks/useArchonDoctorTelemetry';

/**
 * 🔱 ARCHON DOCTOR V.4 (INDUSTRIAL FORENSIC)
 * Purpose: Real-time telemetry & data integrity monitoring
 * FC171 F1 — relocated exclusively into the Sovereign Console
 * (`/dashboard/system-settings`, `isOmegaStrict()`-gated); telemetry itself
 * now lives in `ArchonDoctorContext`/`useArchonDoctorTelemetry`.
 */

type DoctorTab = 'NET' | 'DATA' | 'ERR' | 'CACHE';

// Las 4 pestañas se extraen a componentes de módulo (FC166 Track D — Gate 2
// `max-lines-per-function`) para que `ArchonDoctor` sea solo el shell +
// orquestación; mismo JSX/comportamiento verbatim en cada una, solo el sitio
// cambió.

interface DoctorNetTabProps {
  readonly context: DoctorFleetContext | null;
  readonly logs: TelemetryLog[];
}

/** Pestaña NET — status de gateway + log de errores en vivo. */
function DoctorNetTab({ context, logs }: DoctorNetTabProps): React.JSX.Element {
  const errLogs = logs.filter((l) => l.type !== 'data');
  return (
    <div className="space-y-4">
      <div className="p-3 bg-black/30 rounded border border-white/5">
        <p className="text-pinnacle-yellow/60 uppercase text-archon-sm mb-2 tracking-tighter">
          Gateway Status
        </p>
        <div className="grid grid-cols-2 gap-2 text-pinnacle-white/80">
          <span>API_URL:</span> <span className="text-blue-400">localhost:3001</span>
          <span>SYNC_MODE:</span> <span className="text-green-400">SILK (SWR)</span>
          <span>JWT_AUTH:</span>{' '}
          <span className={context?.isSyncing ? 'text-green-400' : 'text-yellow-400'}>
            DETECTOR ACTIVE
          </span>
        </div>
      </div>
      <div className="space-y-1">
        {errLogs.length === 0 ? (
          <p className="text-pinnacle-white/20 italic">Listening for network events...</p>
        ) : (
          // addLog() en este componente solo produce type 'err' o 'data'
          // (ver handleError/el boton "Export JSON to Console") -- filtrado
          // 'data' arriba, todo lo que llega aqui es siempre 'err' (FC165 F3
          // Slice3.2 Batch2, purga de ternario muerto).
          errLogs.map((log) => (
            <div key={log.id} className="flex gap-2 text-red-400">
              <span className="opacity-30">[{log.ts}]</span>
              <span>{log.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface DoctorDataTabProps {
  readonly context: DoctorFleetContext | null;
  readonly addLog: (msg: string, type?: TelemetryLog['type']) => void;
}

/** Pestaña DATA — conteos de integridad + volcado a consola. */
function DoctorDataTab({ context, addLog }: DoctorDataTabProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-black/30 rounded border border-green-500/20">
          <p className="text-archon-sm text-green-400 font-bold uppercase">Valid Units</p>
          <p className="text-2xl font-black text-pinnacle-white">{context?.units?.length || 0}</p>
        </div>
        <div className="p-3 bg-black/30 rounded border border-red-500/20">
          <p className="text-archon-sm text-red-400 font-bold uppercase">Corrupt/Fail</p>
          <p className="text-2xl font-black text-pinnacle-white">
            {context?.integrity?.corrupt || 0}
          </p>
        </div>
      </div>

      <div className="p-3 bg-black/30 rounded border border-white/5">
        <p className="text-pinnacle-yellow/60 uppercase text-archon-sm mb-2">Structure Integrity</p>
        <div className="space-y-1 text-pinnacle-white/60">
          <div className="flex justify-between border-b border-white/5 pb-1">
            <span>Engine:</span> <span className="text-pinnacle-white">Silk Hydration</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-1">
            <span>Stats Total:</span>{' '}
            <span className="text-pinnacle-white">{context?.stats?.total || 0}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          // eslint-disable-next-line no-console -- volcado de diagnostico intencional, disparado por accion explicita del usuario
          console.log('🔱 ARCHON DATA DUMP:', context?.units);
          addLog('DATA: Memory dump sent to browser console', 'data');
        }}
        className="w-full py-2 bg-pinnacle-yellow/10 text-pinnacle-yellow border border-pinnacle-yellow/20 rounded font-black text-archon-base uppercase hover:bg-pinnacle-yellow/20 transition-all"
      >
        Export JSON to Console
      </button>
    </div>
  );
}

/** Pestaña ERR — lista de excepciones globales capturadas. */
function DoctorErrTab({ logs }: { readonly logs: TelemetryLog[] }): React.JSX.Element {
  const errLogs = logs.filter((l) => l.type === 'err');
  return (
    <div className="space-y-2">
      {errLogs.length === 0 ? (
        <p className="text-green-400/40 text-center py-10 tracking-widest">
          ZERO CRITICAL EXCEPTIONS DETECTED
        </p>
      ) : (
        errLogs.map((log) => (
          <div
            key={log.id}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400"
          >
            <p className="font-bold mb-1">[{log.ts}] SYSTEM_CRASH</p>
            <p className="opacity-80 leading-relaxed">{log.msg}</p>
          </div>
        ))
      )}
    </div>
  );
}

function wipeArchonCacheAndReload(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('archon_'))
    .forEach((k) => localStorage.removeItem(k));
  window.location.reload();
}

interface WipeConfirmProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/** Confirmación explícita del wipe (FC171 Cond. D3 Opción A) — extraída para
 *  que `DoctorCacheTab` se mantenga bajo presupuesto (Gate 2). */
function WipeConfirm({ onCancel, onConfirm }: WipeConfirmProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <p className="text-red-400 text-archon-sm text-center">¿Confirmar borrado total?</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onCancel}
          className="py-2 bg-white/5 text-pinnacle-white/60 border border-white/10 rounded font-black text-archon-base uppercase hover:bg-white/10 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="py-2 bg-red-500 text-white border border-red-500 rounded font-black text-archon-base uppercase hover:brightness-90 transition-all"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

/** Pestaña CACHE — purga de localStorage con prefijo `archon_` + reload, con
 *  confirmación explícita obligatoria (FC171 Cond. D3 Opción A). */
function DoctorCacheTab(): React.JSX.Element {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-black/30 rounded border border-white/5">
        <p className="text-pinnacle-yellow/60 uppercase text-archon-sm mb-2 tracking-tighter">
          Persistence Layer
        </p>
        <p className="text-pinnacle-white/80">
          <span>Prefix: </span>
          <span className="text-blue-400">archon_</span>
        </p>
      </div>
      {confirming ? (
        <WipeConfirm
          onCancel={(): void => setConfirming(false)}
          onConfirm={wipeArchonCacheAndReload}
        />
      ) : (
        <button
          onClick={(): void => setConfirming(true)}
          className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-black text-archon-base uppercase hover:bg-red-500/20 transition-all"
        >
          Emergency Wipe & Reload
        </button>
      )}
    </div>
  );
}

/** Header + Tabs + Footer del panel expandido — extraídos del mismo motivo
 * (Gate 2); mismo JSX verbatim en cada uno. */
function DoctorHeader({ onClose }: { readonly onClose: () => void }): React.JSX.Element {
  return (
    <div className="p-4 bg-pinnacle-navy border-b border-pinnacle-yellow/10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 bg-pinnacle-yellow rounded-full animate-pulse" />
        <h2 className="text-pinnacle-white font-display font-black text-sm uppercase tracking-widest">
          Forensic Console V4
        </h2>
      </div>
      <button onClick={onClose} className="text-pinnacle-white/40 hover:text-pinnacle-white">
        ✕
      </button>
    </div>
  );
}

interface DoctorTabsProps {
  readonly activeTab: DoctorTab;
  readonly onSelectTab: (tab: DoctorTab) => void;
}

function DoctorTabs({ activeTab, onSelectTab }: DoctorTabsProps): React.JSX.Element {
  return (
    <div className="flex bg-pinnacle-navy/50 border-b border-pinnacle-yellow/5">
      {(['NET', 'DATA', 'ERR', 'CACHE'] as DoctorTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onSelectTab(tab)}
          className={`flex-1 py-2 text-archon-base font-black tracking-widest transition-all ${
            activeTab === tab
              ? 'bg-pinnacle-yellow text-pinnacle-navy'
              : 'text-pinnacle-white/40 hover:text-pinnacle-white hover:bg-white/5'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function DoctorFooter(): React.JSX.Element {
  return (
    <div className="p-3 bg-black/20 text-archon-sm text-pinnacle-white/30 flex justify-between items-center border-t border-pinnacle-yellow/5">
      <span>SOVEREIGN CORE V.78.100.184</span>
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 bg-green-500 rounded-full" />
        <span>STABLE</span>
      </span>
    </div>
  );
}

/** Botón colapsado (dock) — extraído del mismo motivo (Gate 2); mismo JSX
 * verbatim. */
function DoctorLaunchButton({ onOpen }: { readonly onOpen: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onOpen}
      className="relative z-[9999] min-h-11 bg-pinnacle-navy text-pinnacle-yellow px-4 py-2 rounded-full font-display font-black text-archon-base shadow-pinnacle hover:scale-105 transition-all flex items-center gap-2 border border-pinnacle-yellow/20 uppercase tracking-widest"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pinnacle-yellow opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-pinnacle-yellow"></span>
      </span>
      ARCHON DOCTOR {SYSTEM_VERSION}
    </button>
  );
}

/** Panel forense flotante (NET/DATA/ERR/CACHE) montado por `SovereignFooter`
 * — telemetría en vivo del bridge `__ARCHON_FLEET_CONTEXT__` + captura global
 * de errores + purga de caché local. */
const ArchonDoctor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DoctorTab>('NET');
  const { logs, context, addLog } = useArchonDoctorContext();

  if (!isOpen) {
    return <DoctorLaunchButton onOpen={() => setIsOpen(true)} />;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[450px] h-[600px] bg-pinnacle-navy border border-pinnacle-yellow/30 shadow-2xl rounded-lg flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      <DoctorHeader onClose={() => setIsOpen(false)} />
      <DoctorTabs activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-archon-md custom-scrollbar">
        {activeTab === 'NET' && <DoctorNetTab context={context} logs={logs} />}
        {activeTab === 'DATA' && <DoctorDataTab context={context} addLog={addLog} />}
        {activeTab === 'ERR' && <DoctorErrTab logs={logs} />}
        {activeTab === 'CACHE' && <DoctorCacheTab />}
      </div>

      <DoctorFooter />
    </div>
  );
};

export default ArchonDoctor;
