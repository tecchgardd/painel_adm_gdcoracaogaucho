import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled
} from './biometric.service';

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  authenticateAsync: vi.fn()
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }
}));

describe('isBiometricAvailable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna falso quando não há hardware biométrico', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
    await expect(isBiometricAvailable()).resolves.toBe(false);
    expect(LocalAuthentication.isEnrolledAsync).not.toHaveBeenCalled();
  });

  it('retorna falso quando não há biometria cadastrada no aparelho', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);
    await expect(isBiometricAvailable()).resolves.toBe(false);
  });

  it('retorna verdadeiro com hardware e biometria cadastrada', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    await expect(isBiometricAvailable()).resolves.toBe(true);
  });
});

describe('preferência de biometria habilitada', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lê a preferência salva', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('true');
    await expect(isBiometricEnabled()).resolves.toBe(true);
  });

  it('retorna falso quando não há preferência salva', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await expect(isBiometricEnabled()).resolves.toBe(false);
  });

  it('habilita salvando a flag', async () => {
    await setBiometricEnabled(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cg_admin_biometric_enabled', 'true');
  });

  it('desabilita removendo a flag', async () => {
    await setBiometricEnabled(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_biometric_enabled');
  });
});

describe('authenticateWithBiometrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna verdadeiro quando a autenticação é bem-sucedida', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true } as never);
    await expect(authenticateWithBiometrics()).resolves.toBe(true);
  });

  it('retorna falso quando a autenticação falha', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: false } as never);
    await expect(authenticateWithBiometrics()).resolves.toBe(false);
  });
});
