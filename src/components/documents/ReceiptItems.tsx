import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

import type { ReceiptItem } from './documentUtils';
import { formatMoney } from './documentUtils';

export function ReceiptItems({ items }: { items: ReceiptItem[] }) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`${item.description}-${index}`} style={styles.row}>
          <View style={styles.description}>
            <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.muted}>{item.quantity} × {formatMoney(item.unitPrice)}</Text>
          </View>
          <Text style={styles.total}>{formatMoney(item.total)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
  description: { flex: 1 },
  descriptionText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 11, marginTop: 2 },
  total: { color: colors.text, fontSize: 13, fontWeight: '900' }
});
