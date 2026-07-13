import { useEffect } from 'react';
import { router } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '@/components/ui';
import { colors } from '@/theme/colors';

export default function Splash() {
  useEffect(() => { const t = setTimeout(() => router.replace('/login'), 1600); return () => clearTimeout(t); }, []);
  return <LinearGradient colors={[colors.black, '#2b0909', colors.black]} style={styles.container}>
    <Logo size={150} />
    <Text style={styles.title}>Coração Gaúcho</Text>
    <Text style={styles.sub}>ADMIN</Text>
    <View style={styles.bar}><View style={styles.progress} /></View>
    <Text style={styles.loading}>Preparando tudo para você...</Text>
    <Text style={styles.version}>Versão 1.0.0</Text>
  </LinearGradient>;
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 22 }, sub: { color: colors.yellow, letterSpacing: 4, marginTop: 6 }, bar: { width: 190, height: 6, backgroundColor: '#333', borderRadius: 20, marginTop: 90, overflow: 'hidden' }, progress: { width: '72%', height: 6, backgroundColor: colors.red }, loading: { color: '#ddd', marginTop: 14 }, version: { color: '#777', position: 'absolute', bottom: 42 } });
