import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ReportSection } from '@/components/dashboard/ReportSection';
import { Screen } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { exportReport, getReports } from '@/services/relatorios.service';
import { colors } from '@/theme/colors';

const periods = ['Hoje', 'Semana', 'Mês', 'Ano', 'Personalizado'] as const;
type Period = typeof periods[number];

const exports = [
  { label: 'PDF', icon: 'file-pdf-box' },
  { label: 'CSV', icon: 'file-delimited-outline' },
  { label: 'XLSX', icon: 'microsoft-excel' }
] as const;

export default function Relatorios() {
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
            {exports.map((item) => (
              <TouchableOpacity key={item.label} activeOpacity={0.85} style={styles.exportButton} onPress={() => exportReport(item.label.toLowerCase() as 'pdf' | 'csv' | 'xlsx')}>
                <MaterialCommunityIcons name={item.icon} color={colors.muted} size={17} />
                <Text style={styles.exportText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
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

        {loading ? <Text style={styles.stateText}>Carregando relatórios...</Text> : null}
        {error ? <TouchableOpacity activeOpacity={0.85} onPress={refetch} style={styles.errorBox}>
          <Text style={styles.errorTitle}>Não foi possível conectar ao servidor.</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity> : null}

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
        {!loading && !error && !categories.length ? <Text style={styles.stateText}>Não há dados ainda</Text> : null}
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
    ...webNoSelect
  },
  periodTextActive: {
    color: '#FFFFFF'
  },
  sections: {
    gap: 12
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  errorBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5A2A2A',
    backgroundColor: '#241414',
    padding: 12
  },
  errorTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  errorText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  retryText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  categoryError: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
  }
});
