import { Platform } from 'react-native';

function resolveApiUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && envUrl?.includes('10.0.2.2')) {
    return envUrl.replace('10.0.2.2', 'localhost');
  }
  if (Platform.OS === 'android' && envUrl?.includes('localhost')) {
    return envUrl.replace('localhost', '10.0.2.2');
  }
  return envUrl ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3333/api' : 'http://localhost:3333/api');
}

export const API_URL = resolveApiUrl();

export const AUTH_USER_STORAGE_KEY = '@cg_admin_user';
export const AUTH_TOKEN_STORAGE_KEY = '@cg_admin_token';
