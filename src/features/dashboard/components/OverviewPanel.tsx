import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import type { DashboardSummary } from '@/features/dashboard/types';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { Panel } from '@/shared/components/ui';
import { colors, theme } from '@/theme/theme';

const numberFormat = new Intl.NumberFormat('pt-BR');

export function OverviewPanel({ summary, columns }: { summary: DashboardSummary; columns: number }) {
  const items: { label: string; value: number; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
    { label: 'Bailes ativos', value: summary.bailesAtivos, icon: 'music-circle-outline' },
    { label: 'Cursos ativos', value: summary.cursosAtivos, icon: 'school-outline' },
    { label: 'Capacidade ativa', value: summary.capacidadeAtiva, icon: 'account-group-outline' },
    { label: 'Clientes cadastrados', value: summary.clientes, icon: 'account-outline' }
  ];
  const cell = gridCellStyle(columns);
  return <Panel title="Visão geral" icon="chart-donut">
    <View style={[gridContainer, styles.grid]}>
      {items.map((item) => <View key={item.label} style={cell}>
        <View style={styles.item}>
          <MaterialCommunityIcons name={item.icon} size={20} color={colors.goldAccent} />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.value}>{numberFormat.format(item.value)}</Text>
            <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
          </View>
        </View>
      </View>)}
    </View>
  </Panel>;
}

const styles = StyleSheet.create({
  grid: { marginBottom: -12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: theme.radius.md, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12 },
  copy: { flex: 1, minWidth: 0 },
  value: { color: colors.text, fontSize: 18, lineHeight: 24, fontFamily: theme.font.semiBold },
  label: { color: colors.subtle, fontSize: 12, fontFamily: theme.font.regular }
});
