import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

const isProduction = import.meta.env.PROD;
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

// En Hostinger, usamos el nuevo subdominio apiv1 creado específicamente para Node 24.
const defaultURL = isProduction ? 'https://apiv1.piic.com.mx/v1' : `http://${hostname}:3001/v1`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// eslint-disable-next-line no-console
console.log('🚀 [Archon API Client V2] Active Gateway:', api.defaults.baseURL);

// Request Interceptor for JWT
api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor for Auth Failures
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError): Promise<never> => {
    // eslint-disable-next-line no-console
    console.error('🌐 [Archon API Client] Networking Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config?.url,
    });
    if (error.response?.status === 401) {
      // 🕵️ Forensic Log: Catch the culprit before redirect
      // eslint-disable-next-line no-console
      console.error('🔱 [Archon Centinel] Security Breach (401). Redirecting to Login.', {
        url: error.config?.url,
        method: error.config?.method,
        token_present: !!localStorage.getItem('auth_token'),
      });
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
