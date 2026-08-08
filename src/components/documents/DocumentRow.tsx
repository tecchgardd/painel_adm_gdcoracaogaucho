import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export function DocumentRow({ label, value, strong }: { label: string; value?: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, strong && styles.valueStrong]}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  value: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  valueStrong: { fontSize: 14, fontWeight: '900' }
});
