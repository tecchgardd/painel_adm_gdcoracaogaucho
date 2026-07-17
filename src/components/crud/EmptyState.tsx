import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '@/theme/theme';

export function EmptyState({ title = 'Não há dados ainda' }: { title?: string }) {
  return <View style={styles.empty}>
    <MaterialCommunityIcons name="database-search-outline" color={colors.muted} size={38} />
    <Text style={styles.text}>{title}</Text>
  </View>;
}

const styles = StyleSheet.create({
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.card, gap: 10 },
  text: { color: colors.muted, fontWeight: '800' }
});
