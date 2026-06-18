/* eslint-disable */
import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { redirectUserToLogin } from './navigation';
import { getToken, clearToken } from './tokenStore';

const isProduction = import.meta.env.PROD;
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

// En Hostinger, usamos el nuevo subdominio apiv1 creado específicamente para Node 24.
const defaultURL = isProduction ? 'https://apiv1.piic.com.mx/v1' : `http://${hostname}:3001/v1`;

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

// 🛡️ Zero-Noise Test Shield
/* istanbul ignore next */
if (typeof process === 'undefined' || (process.env.NODE_ENV !== 'test' && !process.env.VITEST)) {
  console.log('🚀 [Archon API Client V2] Active Gateway:', api.defaults.baseURL);
}

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
