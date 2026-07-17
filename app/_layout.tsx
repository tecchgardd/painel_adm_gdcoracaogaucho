import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(MaterialCommunityIcons.font);
  if (!fontsLoaded) return null;
  return <SafeAreaProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false }} /></SafeAreaProvider>;
}
