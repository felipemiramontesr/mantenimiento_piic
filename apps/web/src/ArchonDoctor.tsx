/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { SYSTEM_VERSION } from './constants/versionConstants';

/**
 * 🔱 ARCHON DOCTOR V.4 (INDUSTRIAL FORENSIC)
 * Purpose: Real-time telemetry & data integrity monitoring
 */

interface TelemetryLog {
  msg: string;
  type: 'info' | 'warn' | 'err' | 'data';
  ts: string;
}

type DoctorTab = 'NET' | 'DATA' | 'ERR' | 'CACHE';

export const ArchonDoctor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DoctorTab>('NET');
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [context, setContext] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).__ARCHON_FLEET_CONTEXT__) {
        setContext((window as any).__ARCHON_FLEET_CONTEXT__);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (msg: string, type: TelemetryLog['type'] = 'info') => {
    setLogs((prev) => [{ msg, type, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  // Capture global errors for the ERR tab
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addLog(`CRASH: ${event.message}`, 'err');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="relative z-[9999] bg-pinnacle-navy text-pinnacle-yellow px-4 py-2 rounded-full font-display font-black text-archon-base shadow-pinnacle hover:scale-105 transition-all flex items-center gap-2 border border-pinnacle-yellow/20 uppercase tracking-widest"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pinnacle-yellow opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-pinnacle-yellow"></span>
        </span>
        ARCHON DOCTOR {SYSTEM_VERSION}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[450px] h-[600px] bg-pinnacle-navy border border-pinnacle-yellow/30 shadow-2xl rounded-lg flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="p-4 bg-pinnacle-navy border-b border-pinnacle-yellow/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-pinnacle-yellow rounded-full animate-pulse" />
          <h2 className="text-pinnacle-white font-display font-black text-sm uppercase tracking-widest">
            Forensic Console V4
          </h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-pinnacle-white/40 hover:text-pinnacle-white"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-pinnacle-navy/50 border-b border-pinnacle-yellow/5">
        {(['NET', 'DATA', 'ERR', 'CACHE'] as DoctorTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-archon-md custom-scrollbar">
        {activeTab === 'NET' && (
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
              {logs.filter((l) => l.type !== 'data').length === 0 ? (
                <p className="text-pinnacle-white/20 italic">Listening for network events...</p>
              ) : (
                logs
                  .filter((l) => l.type !== 'data')
                  .map((log, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${
                        log.type === 'err' ? 'text-red-400' : 'text-pinnacle-white/60'
                      }`}
                    >
                      <span className="opacity-30">[{log.ts}]</span>
                      <span>{log.msg}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'DATA' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-black/30 rounded border border-green-500/20">
                <p className="text-archon-sm text-green-400 font-bold uppercase">Valid Units</p>
                <p className="text-2xl font-black text-pinnacle-white">
                  {context?.units?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-black/30 rounded border border-red-500/20">
                <p className="text-archon-sm text-red-400 font-bold uppercase">Corrupt/Fail</p>
                <p className="text-2xl font-black text-pinnacle-white">
                  {context?.integrity?.corrupt || 0}
                </p>
              </div>
            </div>

            <div className="p-3 bg-black/30 rounded border border-white/5">
              <p className="text-pinnacle-yellow/60 uppercase text-archon-sm mb-2">
                Structure Integrity
              </p>
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
                console.log('🔱 ARCHON DATA DUMP:', context?.units);
                addLog('DATA: Memory dump sent to browser console', 'data');
              }}
              className="w-full py-2 bg-pinnacle-yellow/10 text-pinnacle-yellow border border-pinnacle-yellow/20 rounded font-black text-archon-base uppercase hover:bg-pinnacle-yellow/20 transition-all"
            >
              Export JSON to Console
            </button>
          </div>
        )}

        {activeTab === 'ERR' && (
          <div className="space-y-2">
            {logs.filter((l) => l.type === 'err').length === 0 ? (
              <p className="text-green-400/40 text-center py-10 tracking-widest">
                ZERO CRITICAL EXCEPTIONS DETECTED
              </p>
            ) : (
              logs
                .filter((l) => l.type === 'err')
                .map((log, i) => (
                  <div
                    key={i}
                    className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400"
                  >
                    <p className="font-bold mb-1">[{log.ts}] SYSTEM_CRASH</p>
                    <p className="opacity-80 leading-relaxed">{log.msg}</p>
                  </div>
                ))
            )}
          </div>
        )}

        {activeTab === 'CACHE' && (
          <div className="space-y-4">
            <div className="p-3 bg-black/30 rounded border border-white/5">
              <p className="text-pinnacle-yellow/60 uppercase text-archon-sm mb-2 tracking-tighter">
                Persistence Layer
              </p>
              <p className="text-pinnacle-white/80">
                Prefix: <span className="text-blue-400">archon_</span>
              </p>
            </div>
            <button
              onClick={() => {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('archon_'))
                  .forEach((k) => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-black text-archon-base uppercase hover:bg-red-500/20 transition-all"
            >
              Emergency Wipe & Reload
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-black/20 text-archon-sm text-pinnacle-white/30 flex justify-between items-center border-t border-pinnacle-yellow/5">
        <span>SOVEREIGN CORE V.78.100.184</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-green-500 rounded-full" />
          STABLE
        </span>
      </div>
    </div>
  );
};
