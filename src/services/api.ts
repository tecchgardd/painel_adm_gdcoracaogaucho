import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { API_URL, AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from '@/config/app.config';

const DEFAULT_TIMEOUT = 15000;


export function resolveApiUrl() {
  return API_URL;
}

export const api = axios.create({
  baseURL: resolveApiUrl(),
  timeout: DEFAULT_TIMEOUT,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = Platform.OS === 'web'
    ? await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    : await SecureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const status = error.response?.status;
    const isConnectionError = !error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';

    if (status === 401) {
      AsyncStorage.multiRemove([AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY]).finally(() => {
        router.replace('/login');
      });
    }

    let message = error.response?.data?.message || error.response?.data?.error || error.message || 'Erro ao conectar com a API.';
    if (isConnectionError) {
      message = 'Não foi possível conectar ao servidor. Verifique se a API está rodando ou se o CORS permite esta origem.';
    } else if (status === 401) {
      message = 'Sessão expirada. Faça login novamente.';
    } else if (status === 403) {
      message = 'Você não tem permissão para acessar este recurso.';
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

export async function saveAuthToken(token?: string | null) {
  if (!token) {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    else await SecureStore.deleteItemAsync(AUTH_TOKEN_STORAGE_KEY);
    return;
  }
  if (Platform.OS === 'web') await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  else await SecureStore.setItemAsync(AUTH_TOKEN_STORAGE_KEY, token);
}

export function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
