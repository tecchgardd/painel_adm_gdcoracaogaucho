import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from '@/core/config/env';
import type { SessionUser } from '@/shared/types/entities';

export async function getAuthToken() {
  return Platform.OS === 'web'
    ? AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    : SecureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY);
}

export async function saveAuthToken(token?: string | null) {
  if (!token) {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    else await SecureStore.deleteItemAsync(AUTH_TOKEN_STORAGE_KEY);
    return;
  }
  if (Platform.OS === 'web') await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  else await SecureStore.setItemAsync(AUTH_TOKEN_STORAGE_KEY, token);
}

export async function getStoredUser(): Promise<SessionUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
  return raw ? JSON.parse(raw) as SessionUser : null;
}

export async function saveStoredUser(user: SessionUser | null) {
  if (!user) {
    await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export async function clearAuthStorage() {
  await Promise.all([saveAuthToken(null), saveStoredUser(null)]);
}
