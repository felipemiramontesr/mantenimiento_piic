import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

const isProduction = import.meta.env.PROD;
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

// En Hostinger, si la web está en la raíz y la API en /api_service, la ruta relativa funciona mejor.
const defaultURL = isProduction 
  ? `${window.location.origin}/api_service/v1` 
  : `http://${hostname}:3001/v1`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🚀 [Archon API Client] Active Gateway:', api.defaults.baseURL);

// Request Interceptor for JWT
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor for Auth Failures
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    console.error('🌐 [Archon API Client] Networking Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config?.url
    });
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
