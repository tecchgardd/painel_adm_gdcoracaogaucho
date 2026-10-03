import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearAuthStorage, saveAuthToken, saveStoredUser } from '@/core/storage/authStorage';
import { api, unwrapData } from '@/core/api/client';
import type { AuthSession, SessionUser } from '@/shared/types/entities';

/**
 * Login por e-mail ou por usuário (plugin `username` do Better Auth). Com "@" é e-mail; sem, é usuário.
 */
export function buildSignInRequest(identifier: string, password: string) {
  const value = identifier.trim().toLowerCase();
  return value.includes('@')
    ? { path: '/auth/sign-in/email', body: { email: value, password } }
    : { path: '/auth/sign-in/username', body: { username: value, password } };
}

export async function login(identifier: string, password: string) {
  const request = buildSignInRequest(identifier, password);
  let response;
  try {
    response = await api.post(request.path, request.body);
  } catch (error) {
    // Sem o plugin de usuário no backend a rota não existe: orienta a entrar pelo e-mail.
    if ('username' in request.body && (error as { status?: number })?.status === 404) {
      throw new Error('Login por usuário ainda não está disponível. Entre com o seu e-mail.');
    }
    throw error;
  }
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
