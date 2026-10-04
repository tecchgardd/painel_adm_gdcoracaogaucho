import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { MetricCard } from '@/features/dashboard/components/MetricCard';
import { ReportSection } from '@/features/dashboard/components/ReportSection';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { Screen } from '@/shared/components/ui';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { exportReport, getReports } from '@/features/relatorios/services/relatorios.service';
import { colors, theme } from '@/theme/theme';
import { usePode } from '@/stores/auth.store';

const periods = ['Hoje', 'Semana', 'Mês', 'Ano', 'Personalizado'] as const;
type Period = typeof periods[number];

const exports = [
  { label: 'PDF', icon: 'file-pdf-box' },
  { label: 'CSV', icon: 'file-delimited-outline' },
  { label: 'XLSX', icon: 'microsoft-excel' }
] as const;

export default function Relatorios() {
  const podeExportar = usePode('relatorios.exportar');
  const [period, setPeriod] = useState<Period>('Mês');
  const responsive = useResponsive();
  const columns = responsive.isDesktop ? 3 : responsive.isTablet ? 2 : 2;
  const queryReports = useCallback(() => getReports(), []);
  const { data, loading, error, refetch } = useApiQuery(queryReports, { fallbackData: [] });
  const categories = data ?? [];

  const cardStyle = useMemo(() => {
    const width = `${(100 - (columns - 1) * 2) / columns}%` as const;
    return { width, marginBottom: 10 };
  }, [columns]);

  return (
    <Screen variant="admin">
      <View style={styles.page}>
        <View style={[styles.header, responsive.isMobile && styles.headerMobile]}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Relatórios</Text>
            <Text style={styles.subtitle}>Métricas completas e analíticas do Coração Gaúcho</Text>
          </View>

          <View style={[styles.exportRow, responsive.isMobile && styles.exportRowMobile]}>
            {podeExportar ? exports.map((item) => (
              <TouchableOpacity key={item.label} activeOpacity={0.85} style={styles.exportButton} onPress={() => exportReport(item.label.toLowerCase() as 'pdf' | 'csv' | 'xlsx')}>
                <MaterialCommunityIcons name={item.icon} color={colors.muted} size={17} />
                <Text style={styles.exportText}>{item.label}</Text>
              </TouchableOpacity>
            )) : null}
          </View>
        </View>

        <View style={styles.periods}>
          {periods.map((item) => {
            const active = period === item;
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.82}
                onPress={() => setPeriod(item)}
                style={[styles.periodButton, active && styles.periodButtonActive]}
              >
                <Text style={[styles.periodText, active && styles.periodTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? <LoadingState label="Carregando relatórios..." /> : null}
        {error ? <ErrorState message={error} onRetry={refetch} title="Não foi possível conectar ao servidor." /> : null}

        {!error && <View style={styles.sections}>
          {categories.map((category) => {
            const categoryError = (category as { error?: string }).error;
            return (
              <ReportSection key={category.title} title={category.title} chart={responsive.isMobile ? undefined : category.chart}>
                {categoryError ? <Text style={styles.categoryError}>{categoryError}</Text> : null}
                {!categoryError ? <View style={styles.metricGrid}>
                  {category.metrics.map((metric) => (
                    <View key={metric.title} style={cardStyle}>
                      <MetricCard {...metric} />
                    </View>
                  ))}
                </View> : null}
              </ReportSection>
            );
          })}
        </View>}
        {!loading && !error && !categories.length ? <EmptyState /> : null}
      </View>
    </Screen>
  );
}

const webNoSelect = { userSelect: 'none' } as any;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: 12
  },
  header: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14
  },
  headerMobile: {
    alignItems: 'stretch',
    flexDirection: 'column'
  },
  headerCopy: {
    flex: 1,
    minWidth: 210
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: theme.font.bold,
    letterSpacing: 0,
    ...webNoSelect
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
    ...webNoSelect
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap'
  },
  exportRowMobile: {
    justifyContent: 'flex-start'
  },
  exportButton: {
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  exportText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: theme.font.bold,
    ...webNoSelect
  },
  periods: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
    padding: 3,
    gap: 3
  },
  periodButton: {
    height: 34,
    minWidth: 76,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  periodButtonActive: {
    backgroundColor: colors.red
  },
  periodText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: theme.font.bold,
    ...webNoSelect
  },
  periodTextActive: {
    color: '#FFFFFF'
  },
  sections: {
    gap: 12
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  categoryError: {
    color: colors.red,
    fontSize: 12,
    fontFamily: theme.font.semiBold,
    lineHeight: 18
  }
});
