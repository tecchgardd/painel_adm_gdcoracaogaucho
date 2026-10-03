import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { DashboardSummary } from '@/features/dashboard/types';
import { formatTime } from '@/features/dashboard/utils/dates';
import { Avatar, Button, Panel } from '@/shared/components/ui';
import { colors, theme } from '@/theme/theme';

export function CheckinPanel({ summary }: { summary: DashboardSummary }) {
  const last = summary.ultimoCheckin;
  const lastTime = formatTime(last?.horario);
  return <Panel title="Check-in de hoje" icon="qrcode-scan" action={{ label: 'Histórico', onPress: () => router.push('/historico-validacoes') }}>
    <View style={styles.stats}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{summary.ingressosValidadosHoje}</Text>
        <Text style={styles.statLabel}>Ingressos validados</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.statValue}>{summary.cortesiasLiberadas}</Text>
        <Text style={styles.statLabel}>Cortesias liberadas</Text>
      </View>
    </View>
    <View style={styles.last}>
      {last?.cliente ? <>
        <Avatar name={last.cliente} size={34} />
        <View style={styles.lastCopy}>
          <Text numberOfLines={1} style={styles.lastName}>{last.cliente}</Text>
          <Text style={styles.lastHint}>Último check-in{lastTime ? ` às ${lastTime}` : ''}</Text>
        </View>
      </> : <>
        <MaterialCommunityIcons name="account-clock-outline" size={20} color={colors.subtle} />
        <Text style={styles.lastHint}>Nenhum check-in registrado hoje.</Text>
      </>}
    </View>
    <Button title="Abrir scanner" tone="soft" onPress={() => router.push('/scanner')} />
  </Panel>;
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: 2 },
  statValue: { color: colors.text, fontSize: 24, lineHeight: 32, fontFamily: theme.font.semiBold },
  statLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.regular },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.borderSoft, marginHorizontal: 16 },
  last: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: theme.radius.md, backgroundColor: colors.card, padding: 10 },
  lastCopy: { flex: 1, minWidth: 0 },
  lastName: { color: colors.text, fontSize: 13, fontFamily: theme.font.medium },
  lastHint: { color: colors.subtle, fontSize: 12, fontFamily: theme.font.regular }
});
