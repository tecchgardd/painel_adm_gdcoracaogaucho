import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Header, Screen } from '@/components/ui';
import { filterNavigationByRole, navigationItems, NavItem } from '@/navigation.config';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/theme';

export default function Gestao() {
  const role = useAuthStore((state) => state.role);
  const groups = filterNavigationByRole(navigationItems, role).filter((item) => item.label === 'Cadastros' || item.label === 'Vendas');
  return (
    <Screen variant="admin">
      <Header title="Gestao" />
      <View style={styles.wrapper}>
        {groups.map((group) => (
          <View key={group.label} style={styles.section}>
            <Text style={styles.sectionTitle}>{group.label}</Text>
            <View style={styles.grid}>
              {(group.children ?? []).map((item) => <ManagementCard key={item.label} item={item} />)}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function ManagementCard({ item }: { item: NavItem }) {
  return (
    <TouchableOpacity activeOpacity={0.86} style={styles.card} onPress={() => item.path && router.push(item.path as any)}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={item.icon} color={colors.red} size={25} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.title}>{item.label}</Text>
        <Text style={styles.subtitle}>Abrir gerenciamento</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" color={colors.muted} size={22} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 18 },
  section: { gap: 10 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { minHeight: 82, width: '100%', maxWidth: 360, flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1515' },
  cardCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }
});
