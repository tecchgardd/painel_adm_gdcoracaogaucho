import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const BIOMETRIC_ENABLED_KEY = '@cg_admin_biometric_enabled';

export async function isBiometricAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function isBiometricEnabled() {
  return (await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY)) === 'true';
}

export async function setBiometricEnabled(enabled: boolean) {
  if (enabled) await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
  else await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
}

export async function authenticateWithBiometrics(promptMessage = 'Entrar com biometria') {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancelar' });
  return result.success;
}
