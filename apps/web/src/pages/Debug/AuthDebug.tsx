/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';

/**
 * 🔱 Archon Terminal: Diagnostic Dashboard
 * v.1.0.2 - Forensic Trap Integration
 */

const AuthDebugPage: React.FC = () => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const rawData = localStorage.getItem('user_data');
    const rawDebug = localStorage.getItem('debug_user_data');
    setToken(localStorage.getItem('auth_token'));

    if (rawData) {
      try {
        setSessionData(JSON.parse(rawData));
      } catch (e) {
        setSessionData({ error: 'Failed to parse user_data', raw: rawData });
      }
    }

    if (rawDebug) {
      try {
        setDebugData(JSON.parse(rawDebug));
      } catch (e) {
        setDebugData({ error: 'Failed to parse debug_user_data', raw: rawDebug });
      }
    }
  }, []);

  const renderStatus = (val: any): string => (val ? '✅ DETECTADO' : '❌ AUSENTE');

  const goToLogin = (): void => {
    window.location.href = '/login';
  };

  const clearDebug = (): void => {
    localStorage.removeItem('debug_user_data');
    window.location.reload();
  };

  const activeData = sessionData || debugData;

  return (
    <div
      style={{
        padding: '40px',
        backgroundColor: '#0F2A44',
        color: '#fff',
        minHeight: '100vh',
        fontFamily: 'monospace',
      }}
    >
      <h1 style={{ color: '#F2B705', borderBottom: '2px solid #F2B705', paddingBottom: '10px' }}>
        🔱 TERMINAL DE DIAGNÓSTICO SOBERANO
      </h1>

      {debugData && (
        <div
          style={{
            backgroundColor: 'rgba(242, 183, 5, 0.1)',
            padding: '10px',
            borderLeft: '4px solid #F2B705',
            marginBottom: '20px',
          }}
        >
          <strong>📡 EVIDENCIA CAPTURADA:</strong> Se ha recuperado una sesión purgada por el
          Centinela.
        </div>
      )}

      <div
        style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
      >
        <section
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '20px',
            borderRadius: '8px',
          }}
        >
          <h2 style={{ color: '#F2B705' }}>🔍 AUDITORÍA DE INTEGRIDAD</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>TOKEN: {renderStatus(token)}</li>
            <li style={{ marginBottom: '10px' }}>USERNAME: {renderStatus(activeData?.username)}</li>
            <li style={{ marginBottom: '10px' }}>
              ROLE_NAME: {renderStatus(activeData?.roleName)}
            </li>
            <li style={{ marginBottom: '10px' }}>
              ROLE_ID: {renderStatus(activeData?.roleId !== undefined)}
            </li>
            <li style={{ marginBottom: '10px' }}>
              PERMISSIONS: {renderStatus(activeData?.permissions?.length > 0)}
            </li>
          </ul>
        </section>

        <section
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '20px',
            borderRadius: '8px',
          }}
        >
          <h2 style={{ color: '#F2B705' }}>📦 PAYLOAD RAW</h2>
          <pre
            style={{
              backgroundColor: '#000',
              padding: '15px',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(activeData, null, 2)}
          </pre>
        </section>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', border: '1px solid #F2B705' }}>
        <h3 style={{ color: '#F2B705' }}>⚠️ ANÁLISIS DEL CENTINELA</h3>
        {!activeData?.roleName || !activeData?.username ? (
          <p style={{ color: '#ff4d4d' }}>
            ERROR CRÍTICO: La sesión es &quot;Shallow&quot; (superficial). El sistema te expulsará
            automáticamente porque le faltan campos de identidad obligatorios (username o roleName).
          </p>
        ) : (
          <p style={{ color: '#4dff4d' }}>
            SESIÓN VÁLIDA: Si sigues siendo expulsado, el problema podría estar en las rutas
            protegidas o en la expiración del token.
          </p>
        )}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={goToLogin}
          style={{
            padding: '10px 20px',
            backgroundColor: '#F2B705',
            color: '#000',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          VOLVER AL LOGIN
        </button>
        <button
          type="button"
          onClick={clearDebug}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: '#F2B705',
            border: '1px solid #F2B705',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          LIMPIAR EVIDENCIA
        </button>
      </div>
    </div>
  );
};

export default AuthDebugPage;
