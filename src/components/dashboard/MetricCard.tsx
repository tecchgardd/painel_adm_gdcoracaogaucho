import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { DashboardMetric, MetricVariant } from '@/types/entities';

type Props = DashboardMetric;

const variantStyles: Record<MetricVariant, { bg: string; border: string; icon: string; chip: string; accent: string }> = {
  success: { bg: '#171F1A', border: 'rgba(64, 196, 99, 0.34)', icon: colors.green, chip: 'rgba(64, 196, 99, 0.15)', accent: 'rgba(64, 196, 99, 0.65)' },
  danger: { bg: '#211718', border: 'rgba(210, 39, 48, 0.36)', icon: colors.red, chip: 'rgba(210, 39, 48, 0.16)', accent: 'rgba(210, 39, 48, 0.78)' },
  warning: { bg: '#211E16', border: 'rgba(245, 180, 48, 0.34)', icon: colors.yellow, chip: 'rgba(245, 180, 48, 0.15)', accent: 'rgba(245, 180, 48, 0.72)' },
  neutral: { bg: '#1B1C1F', border: 'rgba(156, 163, 175, 0.24)', icon: '#AAB2C0', chip: 'rgba(156, 163, 175, 0.13)', accent: 'rgba(156, 163, 175, 0.42)' }
};

export function MetricCard({ title, value, subtitle, icon, variant, trend }: Props) {
  const tone = variantStyles[variant];

  return (
    <View style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.accent, { backgroundColor: tone.accent }]} />
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: tone.chip }]}>
          <MaterialCommunityIcons name={icon} size={21} color={tone.icon} />
        </View>
        {trend ? <Text style={[styles.trend, { color: tone.icon }]}>{trend}</Text> : null}
      </View>
      <Text numberOfLines={1} style={styles.value}>{value}</Text>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const webNoSelect = { userSelect: 'none' } as any;

const styles = StyleSheet.create({
  card: {
    minHeight: 118,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
    position: 'relative',
    ...webNoSelect
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  trend: {
    fontSize: 11,
    fontWeight: '900',
    ...webNoSelect
  },
  value: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    ...webNoSelect
  },
  title: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    marginTop: 1,
    ...webNoSelect
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    ...webNoSelect
  }
});
