import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DashboardSummary } from '@/features/dashboard/types';
import { Panel } from '@/shared/components/ui';
import { colors, theme } from '@/theme/theme';

type AttentionItem = {
  label: string;
  hint: string;
  count: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  tone: 'red' | 'yellow';
  path: string;
};

export function attentionItems(summary: DashboardSummary): AttentionItem[] {
  const items: AttentionItem[] = [
    { label: 'Pagamentos pendentes', hint: 'Aguardando baixa', count: summary.pagamentosPendentes, icon: 'cash-clock', tone: 'red', path: '/pagamentos' },
    { label: 'Inscrições pendentes', hint: 'Cursos aguardando confirmação', count: summary.inscricoesPendentes, icon: 'account-clock-outline', tone: 'yellow', path: '/alunos' },
    { label: 'Eventos nos próximos 7 dias', hint: 'Revise lotes e capacidade', count: summary.eventosProximos, icon: 'calendar-alert', tone: 'yellow', path: '/eventos' }
  ];
  return items.filter((item) => item.count > 0);
}

export function AttentionPanel({ summary }: { summary: DashboardSummary }) {
  const items = attentionItems(summary);
  return <Panel title="Precisa de atenção" icon="bell-ring-outline">
    {items.length ? <View style={styles.list}>
      {items.map((item) => {
        const fg = item.tone === 'red' ? colors.red : colors.yellow;
        const bg = item.tone === 'red' ? colors.redSoft : colors.yellowSoft;
        return <Pressable
          key={item.label}
          onPress={() => router.push(item.path as any)}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: ${item.count}`}
          style={(state) => [styles.row, (state as { hovered?: boolean }).hovered && styles.rowHover]}
        >
          <View style={[styles.icon, { backgroundColor: bg }]}><MaterialCommunityIcons name={item.icon} size={18} color={fg} /></View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
            <Text numberOfLines={1} style={styles.hint}>{item.hint}</Text>
          </View>
          <Text style={[styles.count, { color: fg }]}>{item.count}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.subtle} />
        </Pressable>;
      })}
    </View> : <View style={styles.clear}>
      <View style={styles.clearIcon}><MaterialCommunityIcons name="check-circle-outline" size={22} color="#4CB85C" /></View>
      <Text style={styles.clearTitle}>Tudo em dia</Text>
      <Text style={styles.hint}>Nenhuma pendência de pagamento ou inscrição.</Text>
    </View>}
  </Panel>;
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  list: { gap: 4, marginHorizontal: -8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: theme.radius.md, paddingHorizontal: 8, ...webCursor },
  rowHover: { backgroundColor: colors.cardHover },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  label: { color: colors.text, fontSize: 13, fontFamily: theme.font.medium },
  hint: { color: colors.subtle, fontSize: 12, fontFamily: theme.font.regular, marginTop: 1 },
  count: { fontSize: 18, fontFamily: theme.font.semiBold, minWidth: 24, textAlign: 'right' },
  clear: { alignItems: 'center', paddingVertical: 18, gap: 6 },
  clearIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  clearTitle: { color: colors.text, fontSize: 14, fontFamily: theme.font.semiBold }
});
