import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { DashboardNextEvent } from '@/features/dashboard/types';
import { formatEventDate, relativeDayLabel } from '@/features/dashboard/utils/dates';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { Panel } from '@/shared/components/ui';
import { colors, theme } from '@/theme/theme';

export function NextEventPanel({ event }: { event: DashboardNextEvent | null }) {
  const action = { label: 'Ver agenda', onPress: () => router.push('/eventos') };
  if (!event) {
    return <Panel title="Próximo evento" icon="calendar-star" action={action}>
      <EmptyState title="Nenhum evento agendado" subtitle="Cadastre um baile ou curso para acompanhar aqui." icon="calendar-blank-outline" />
    </Panel>;
  }

  const relative = relativeDayLabel(event.data);
  const when = formatEventDate(event.data);
  const place = [event.local, event.cidade].filter(Boolean).join(' · ');
  const hasOccupancy = !!event.capacidade && event.vendidos != null;
  const occupancy = hasOccupancy ? Math.min(100, Math.round(((event.vendidos ?? 0) / (event.capacidade ?? 1)) * 100)) : 0;
  const barColor = occupancy >= 90 ? colors.red : occupancy >= 60 ? colors.yellow : '#4CB85C';

  return <Panel title="Próximo evento" icon="calendar-star" action={action}>
    <View style={styles.body}>
      {relative ? <View style={styles.badge}><Text style={styles.badgeText}>{relative}</Text></View> : null}
      <Text numberOfLines={2} style={styles.name}>{event.nome ?? 'Evento sem nome'}</Text>
      <View style={styles.meta}>
        {when ? <View style={styles.metaItem}><MaterialCommunityIcons name="clock-outline" size={15} color={colors.muted} /><Text style={styles.metaText}>{when}</Text></View> : null}
        {place ? <View style={styles.metaItem}><MaterialCommunityIcons name="map-marker-outline" size={15} color={colors.muted} /><Text numberOfLines={1} style={styles.metaText}>{place}</Text></View> : null}
      </View>
      {hasOccupancy ? <View style={styles.occupancy}>
        <View style={styles.occupancyRow}>
          <Text style={styles.occupancyLabel}>Ocupação</Text>
          <Text style={styles.occupancyValue}>{event.vendidos} / {event.capacidade} · {occupancy}%</Text>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: occupancy }}>
          <View style={[styles.fill, { width: `${occupancy}%`, backgroundColor: barColor }]} />
        </View>
      </View> : null}
    </View>
  </Panel>;
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.redSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: colors.red, fontSize: 12, fontFamily: theme.font.semiBold },
  name: { color: colors.text, fontSize: 20, lineHeight: 28, fontFamily: theme.font.semiBold },
  meta: { gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { flex: 1, color: colors.muted, fontSize: 13, fontFamily: theme.font.regular },
  occupancy: { gap: 8, marginTop: 4 },
  occupancyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  occupancyLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium },
  occupancyValue: { color: colors.text, fontSize: 12, fontFamily: theme.font.medium },
  track: { height: 8, borderRadius: 999, backgroundColor: colors.card, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 }
});
