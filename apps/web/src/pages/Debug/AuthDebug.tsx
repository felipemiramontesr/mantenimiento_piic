/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';

/**
 * 🔱 Archon Terminal: Diagnostic Dashboard
 * v.1.0.1 - Hardened Forensics
 */

const AuthDebugPage: React.FC = () => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const rawData = localStorage.getItem('user_data');
    setToken(localStorage.getItem('auth_token'));
    if (rawData) {
      try {
        setSessionData(JSON.parse(rawData));
      } catch (e) {
        setSessionData({ error: 'Failed to parse JSON', raw: rawData });
      }
    }
  }, []);

  const renderStatus = (val: any): string => (val ? '✅ DETECTADO' : '❌ AUSENTE');

  const goToLogin = (): void => {
    window.location.href = '/login';
  };

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
            <li style={{ marginBottom: '10px' }}>
              USERNAME: {renderStatus(sessionData?.username)}
            </li>
            <li style={{ marginBottom: '10px' }}>
              ROLE_NAME: {renderStatus(sessionData?.roleName)}
            </li>
            <li style={{ marginBottom: '10px' }}>
              ROLE_ID: {renderStatus(sessionData?.roleId !== undefined)}
            </li>
            <li style={{ marginBottom: '10px' }}>
              PERMISSIONS: {renderStatus(sessionData?.permissions?.length > 0)}
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
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </section>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', border: '1px solid #F2B705' }}>
        <h3 style={{ color: '#F2B705' }}>⚠️ ANÁLISIS DEL CENTINELA</h3>
        {!sessionData?.roleName || !sessionData?.username ? (
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

      <div style={{ marginTop: '20px' }}>
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
      </div>
    </div>
  );
};

export default AuthDebugPage;
