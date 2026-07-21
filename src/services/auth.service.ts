import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, clearAuthStorage, saveAuthToken, unwrapData } from './api';
import { AUTH_USER_STORAGE_KEY } from '@/config/app.config';
import type { AuthSession, SessionUser } from '@/types/entities';

export async function login(email: string, password: string) {
  const response = await api.post('/auth/sign-in/email', { email, password });
  const session = unwrapData<AuthSession>(response.data);
  const token = response.headers['set-auth-token'] ?? session.token ?? (response.data as { token?: string })?.token;
  await saveAuthToken(token);
  if (session.user) await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
  return session;
}

export async function logout() {
  try {
    await api.post('/auth/sign-out');
  } finally {
    await clearAuthStorage();
  }
}

export async function getSession() {
  const response = await api.get('/auth/get-session');
  return unwrapData<AuthSession>(response.data);
}

export async function getMe() {
  const session = await getSession();
  return session.user as SessionUser | undefined;
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
  return raw ? JSON.parse(raw) as SessionUser : null;
}


export async function clearBusinessStorage() {
  await AsyncStorage.multiRemove([
    '@cg_colaboradores',
    '@cg_alunos',
    '@cg_pagamentos',
    '@cg_cortesias',
    '@cg_configuracoes',
    '@cg_validacoes'
  ]);
}
