/* eslint-disable */
import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { redirectUserToLogin } from './navigation';
import { getToken, clearToken } from './tokenStore';

/** Hostname para la URL de desarrollo. `window` siempre existe en esta SPA
 * (navegador real o jsdom en tests) -- el parámetro admite `undefined` solo
 * para poder testear directamente el fallback, sin depender de un entorno
 * sin `window` real (FC165 F3 Slice3.3 Lote C, purga+test sin red real). */
export function computeHostname(win: Window | undefined): string {
  return win ? win.location.hostname : 'localhost';
}

/** URL base de la API según el ambiente (FC165 F3 Slice3.3 Lote C). */
export function computeDefaultURL(isProd: boolean, hostname: string): string {
  return isProd ? 'https://apiv1.piic.com.mx/v1' : `http://${hostname}:3001/v1`;
}

const isProduction = import.meta.env.PROD;
const hostname = computeHostname(window);

// En Hostinger, usamos el nuevo subdominio apiv1 creado específicamente para Node 24.
const defaultURL = computeDefaultURL(isProduction, hostname);

// 🔱 Telemetry Engine (Forensic Monitoring)
export const currentTelemetry = {
  status: 'ONLINE' as 'ONLINE' | 'OFFLINE',
  lastLatency: 0,
  lastEndpoint: 'NONE',
  lastStatus: 200,
  baseUrl: import.meta.env.VITE_API_URL || defaultURL,
};

const api = axios.create({
  baseURL: currentTelemetry.baseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/** Deriva el estado de entorno Node/Vitest sin bifurcaciones en el call-site
 * (FC165 F3 Slice3.3 Lote C). Se re-evalúa en cada llamada -- un test puede
 * togglear `globalThis.process` alrededor de una llamada directa sin
 * `vi.resetModules()` (que desestabilizaba la atribución v8 del resto de
 * este archivo, confirmado empíricamente, ver client.test.ts). */
export function readProcessSignal(): {
  hasProcess: boolean;
  nodeEnv: string | undefined;
  isVitest: boolean;
} {
  if (typeof process === 'undefined') {
    return { hasProcess: false, nodeEnv: undefined, isVitest: false };
  }
  return { hasProcess: true, nodeEnv: process.env.NODE_ENV, isVitest: !!process.env.VITEST };
}

/** Imprime el diagnóstico de gateway activo si no estamos en un test run
 * (Zero-Noise Test Shield). Extraída y exportada para poder cubrir AMBOS
 * lados de la condición con una llamada directa desde el test (FC165 F3
 * Slice3.3 Lote C). */
export function logGatewayStartupIfNeeded(
  hasProcess: boolean,
  nodeEnv: string | undefined,
  isVitest: boolean,
  baseUrl: string
): void {
  if (!hasProcess || (nodeEnv !== 'test' && !isVitest)) {
    console.log('🚀 [Archon API Client V2] Active Gateway:', baseUrl);
  }
}

// 🛡️ Zero-Noise Test Shield
const gatewaySignal = readProcessSignal();
logGatewayStartupIfNeeded(
  gatewaySignal.hasProcess,
  gatewaySignal.nodeEnv,
  gatewaySignal.isVitest,
  api.defaults.baseURL as string
);

// Request Interceptor for JWT & Telemetry
api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Update Telemetry
  currentTelemetry.lastEndpoint = config.url || 'NONE';
  (config as any)._startTime = Date.now();

  return config;
});

// Response Interceptor for Auth Failures & Telemetry
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Update Telemetry
    currentTelemetry.status = 'ONLINE';
    currentTelemetry.lastStatus = response.status;
    const startTime = (response.config as any)._startTime;
    if (startTime) {
      currentTelemetry.lastLatency = Date.now() - startTime;
    }
    return response;
  },
  (error: AxiosError): Promise<never> => {
    // Update Telemetry on Error
    currentTelemetry.lastStatus = error.response?.status || 0;
    if (error.code === 'ERR_NETWORK') {
      currentTelemetry.status = 'OFFLINE';
    }
    const startTime = (error.config as any)?._startTime;
    if (startTime) {
      currentTelemetry.lastLatency = Date.now() - startTime;
    }

    // 🛡️ Zero-Noise Test Shield
    const isTest =
      typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || !!process.env.VITEST);

    const isExpected401 =
      error.response?.status === 401 && error.config?.url?.includes('/auth/refresh');

    if (!isTest && !isExpected401) {
      /* istanbul ignore next */
      console.error('🌐 [Archon API Client] Networking Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config?.url,
      });
    }
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/refresh')
    ) {
      if (!isTest) {
        // 🕵️ Forensic Log: Catch the culprit before redirect
        /* istanbul ignore next */
        console.error('🔱 [Archon Centinel] Security Breach (401). Redirecting to Login.', {
          url: error.config?.url,
          method: error.config?.method,
          token_present: !!getToken(),
        });
      }
      clearToken();
      redirectUserToLogin();
    }
    return Promise.reject(error);
  }
);

export default api;
