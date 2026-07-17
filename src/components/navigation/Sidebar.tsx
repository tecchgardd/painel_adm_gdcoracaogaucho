import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { filterNavigationByRole, navigationItems } from '@/navigation.config';
import { logout } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/theme';
import { SidebarAccordion } from './SidebarAccordion';

export function Sidebar() {
  const role = useAuthStore((state) => state.role);
  const visibleItems = filterNavigationByRole(navigationItems, role);
  async function signOut() {
    await logout();
    router.replace('/login');
  }

  return (
    <View style={styles.sidebar}>
      <View style={styles.brandWrap}>
        <Text style={styles.brand}>Coração Gaúcho</Text>
        <Text style={styles.admin}>ADMIN</Text>
      </View>

      <ScrollView style={styles.navScroll} contentContainerStyle={styles.nav} showsVerticalScrollIndicator={false}>
        {visibleItems.map((item) => <SidebarAccordion key={item.label} item={item} />)}
      </ScrollView>

      <TouchableOpacity style={styles.logout} onPress={signOut}>
        <MaterialCommunityIcons name="logout" color={colors.red} size={22} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    flexShrink: 0,
    backgroundColor: colors.dark,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 18,
    ...(Platform.OS === 'web' ? { height: '100vh' as any, maxHeight: '100vh' as any } : { flex: 1 })
  },
  brandWrap: { flexShrink: 0 },
  brand: { color: colors.text, fontSize: 20, fontWeight: '900' },
  admin: { color: colors.yellow, letterSpacing: 3, marginTop: 4, marginBottom: 18 },
  navScroll: { flex: 1 },
  nav: { gap: 8, paddingBottom: 12 },
  logout: {
    flexShrink: 0,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    marginTop: 10
  },
  logoutText: { color: colors.red, fontWeight: '800' }
});
