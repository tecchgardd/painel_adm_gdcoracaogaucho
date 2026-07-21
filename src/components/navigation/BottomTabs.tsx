import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, usePathname } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { filterNavigationByRole, mobileTabs } from '@/navigation.config';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/theme';

const activeGroups: Record<string, string[]> = {
  '/eventos': ['/eventos', '/bailes', '/cursos'],
  '/gestao': ['/gestao', '/cadastros', '/vendas', '/colaboradores', '/clientes', '/alunos', '/empresas', '/pedidos', '/pagamentos', '/cortesias'],
  '/menu': ['/menu', '/relatorios', '/fotos']
};

function isActive(pathname: string, path?: string) {
  if (!path) return false;
  const normalized = pathname.replace('/(admin)', '');
  if (normalized === path) return true;
  return activeGroups[path]?.includes(normalized) ?? false;
}

export function BottomTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const role = useAuthStore((state) => state.role);
  const visibleTabs = filterNavigationByRole(mobileTabs, role);
  const safeBottom = Platform.OS === 'web' ? 0 : insets.bottom;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={[styles.bar, { paddingBottom: safeBottom, minHeight: 70 + safeBottom }]}>
        {visibleTabs.map((item) => {
          const active = isActive(pathname, item.path);
          return (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.82}
              onPress={() => item.path && router.push(item.path as any)}
              style={styles.item}
            >
              <MaterialCommunityIcons name={item.icon} size={22} color={active ? colors.red : colors.muted} />
              <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: '100%',
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 0,
    backgroundColor: colors.black,
    zIndex: 50,
    elevation: 50
  },
  bar: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    minHeight: 70,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 }
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 16
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900'
  },
  labelActive: {
    color: colors.red
  }
});
