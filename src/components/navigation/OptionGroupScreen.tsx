import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header, Screen } from '@/components/ui';
import { NavItem } from '@/navigation.config';
import { colors } from '@/theme/theme';

export function OptionGroupScreen({ title, items }: { title: string; items: NavItem[] }) {
  return <Screen variant="admin">
    <Header title={title} />
    <View style={styles.grid}>
      {items.map((item) => <TouchableOpacity key={item.label} style={styles.card} onPress={() => item.path && router.push(item.path as any)}>
        <MaterialCommunityIcons name={item.icon as any} color={colors.red} size={28} />
        <Text style={styles.title}>{item.label}</Text>
      </TouchableOpacity>)}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { minHeight: 104, width: '100%', maxWidth: 260, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 16, fontWeight: '900' }
});
