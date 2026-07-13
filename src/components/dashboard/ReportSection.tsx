import { StyleSheet, Text, View } from 'react-native';
import type React from 'react';
import { colors } from '@/theme/colors';
import type { ReportCategory } from '@/types/entities';

type Props = {
  title: string;
  chart?: ReportCategory['chart'];
  children: React.ReactNode;
};

const chartColor = {
  success: colors.green,
  danger: colors.red,
  warning: colors.yellow,
  neutral: '#AAB2C0'
};

export function ReportSection({ title, chart, children }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {chart ? (
          <View style={styles.chart}>
            {chart.map((item) => (
              <View key={item.label} style={styles.chartItem}>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBar, { width: `${Math.min(item.value, 100)}%`, backgroundColor: chartColor[item.variant] }]} />
                </View>
                <Text numberOfLines={1} style={styles.chartLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const webNoSelect = { userSelect: 'none' } as any;

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    borderRadius: 18,
    padding: 12,
    gap: 10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
    ...webNoSelect
  },
  chart: {
    width: 180,
    gap: 5
  },
  chartItem: {
    gap: 2
  },
  chartTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.black,
    overflow: 'hidden'
  },
  chartBar: {
    height: '100%',
    borderRadius: 999
  },
  chartLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    ...webNoSelect
  }
});
