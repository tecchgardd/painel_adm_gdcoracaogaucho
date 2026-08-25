import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { clearAuthStorage, getAuthToken, getStoredUser, saveAuthToken, saveStoredUser } from './authStorage';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn()
}));

describe('authStorage on native (SecureStore)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  it('lê o token do SecureStore', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue('token-123');
    await expect(getAuthToken()).resolves.toBe('token-123');
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('salva o token no SecureStore', async () => {
    await saveAuthToken('token-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('@cg_admin_token', 'token-123');
  });

  it('remove o token do SecureStore quando salvo sem valor', async () => {
    await saveAuthToken(null);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('@cg_admin_token');
  });
});

describe('authStorage on web (AsyncStorage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  it('lê o token do AsyncStorage', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('token-456');
    await expect(getAuthToken()).resolves.toBe('token-456');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('salva o token no AsyncStorage', async () => {
    await saveAuthToken('token-456');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cg_admin_token', 'token-456');
  });
});

describe('usuário armazenado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna null quando não há usuário salvo', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await expect(getStoredUser()).resolves.toBeNull();
  });

  it('retorna o usuário salvo desserializado', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify({ id: '1', name: 'Ana' }));
    await expect(getStoredUser()).resolves.toEqual({ id: '1', name: 'Ana' });
  });

  it('salva o usuário serializado', async () => {
    await saveStoredUser({ id: '1', name: 'Ana' } as never);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cg_admin_user', JSON.stringify({ id: '1', name: 'Ana' }));
  });

  it('remove o usuário quando salvo com null', async () => {
    await saveStoredUser(null);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_user');
  });
});

describe('clearAuthStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  it('limpa token e usuário', async () => {
    await clearAuthStorage();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_user');
  });
});
