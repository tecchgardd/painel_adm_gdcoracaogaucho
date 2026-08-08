import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

import { DocumentRow } from './DocumentRow';

export function ReceiptTotals({
  subtotal,
  discount,
  total,
  paymentMethod,
  status,
  transactionId,
  paymentDate,
  gateway,
  receiver
}: {
  subtotal: string;
  discount: string;
  total: string;
  paymentMethod: string;
  status: string;
  transactionId?: string;
  paymentDate: string;
  gateway: string;
  receiver: string;
}) {
  return (
    <View style={styles.panel}>
      <DocumentRow label="Subtotal" value={subtotal} />
      <DocumentRow label="Desconto" value={discount} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{total}</Text>
      </View>
      <View style={styles.divider} />
      <DocumentRow label="Forma de pagamento" value={paymentMethod} />
      <DocumentRow label="Status" value={status} />
      <DocumentRow label="ID da transação" value={transactionId} />
      <DocumentRow label="Data do pagamento" value={paymentDate} />
      <DocumentRow label="Gateway" value={gateway} />
      <DocumentRow label="Responsável" value={receiver} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  totalRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  totalLabel: { color: colors.text, fontSize: 13, fontWeight: '900' },
  totalValue: { color: colors.red, fontSize: 18, fontWeight: '900' },
  divider: { height: 10 }
});
