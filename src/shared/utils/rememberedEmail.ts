import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBERED_EMAIL_KEY = '@cg_admin_remembered_email';

export async function getRememberedEmail() {
  return AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
}

export async function setRememberedEmail(email: string) {
  await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
}

export async function clearRememberedEmail() {
  await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
}
