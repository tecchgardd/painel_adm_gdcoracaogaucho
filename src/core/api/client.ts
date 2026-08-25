import { AxiosError, create, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';

import { API_URL } from '@/core/config/env';
import { clearAuthStorage, getAuthToken } from '@/core/storage/authStorage';

const DEFAULT_TIMEOUT = 15000;

export function resolveApiUrl() {
  return API_URL;
}

export const api = create({
  baseURL: resolveApiUrl(),
  timeout: DEFAULT_TIMEOUT,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Axios/the browser must generate multipart Content-Type with its boundary.
  // Otherwise the JSON default prevents the API from receiving the files.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  const token = await getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    const status = error.response?.status;
    const isConnectionError = !error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';

    if (status === 401) {
      await clearAuthStorage();
      router.replace('/login');
    }

    let message = error.response?.data?.message || error.response?.data?.error || error.message || 'Erro ao conectar com a API.';
    if (isConnectionError) {
      message = 'Não foi possível conectar ao servidor. Verifique se a API está rodando ou se o CORS permite esta origem.';
    } else if (status === 401) {
      message = 'Sessão expirada. Faça login novamente.';
    } else if (status === 403) {
      const originRejected = /origin|origem|trusted/i.test(message);
      message = originRejected
        ? 'Esta origem local ainda não foi liberada no backend. Adicione http://localhost:8081 em AUTH_TRUSTED_ORIGINS e refaça o deploy.'
        : 'Você não tem permissão para acessar este recurso.';
    } else if (status === 404) {
      message = message || 'Recurso não encontrado na API.';
    } else if (status && status >= 500) {
      message = 'Falha interna do servidor. Verifique os logs da API.';
    }

    return Promise.reject({
      status,
      message,
      code: error.code
    });
  }
);

export function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
