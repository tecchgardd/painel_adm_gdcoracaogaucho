import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearAuthStorage, getStoredUser, saveAuthToken, saveStoredUser } from '@/core/storage/authStorage';
import { api, unwrapData } from '@/core/api/client';
import type { AuthSession, SessionUser } from '@/shared/types/entities';

export async function login(email: string, password: string) {
  const response = await api.post('/auth/sign-in/email', { email, password });
  const session = unwrapData<AuthSession>(response.data);
  const token = response.headers['set-auth-token'] ?? session.token ?? (response.data as { token?: string })?.token;
  await saveAuthToken(token);
  if (session.user) await saveStoredUser(session.user);
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

export { getStoredUser };

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
