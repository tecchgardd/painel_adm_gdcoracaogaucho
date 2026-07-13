import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Screen } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { getDashboard } from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

const periods = ['Hoje', 'Semana', 'Mês', 'Ano'] as const;
type Period = typeof periods[number];

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('Mês');
  const [refreshKey, setRefreshKey] = useState(0);
  const responsive = useResponsive();
  const columns = responsive.isDesktop ? 4 : responsive.isTablet ? 3 : 2;
  const queryDashboard = useCallback(() => getDashboard(), []);
  const { data, loading, error, refetch } = useApiQuery(queryDashboard, { fallbackData: [] });
  const user = useAuthStore((state) => state.user);
  const firstName = (user?.nome ?? user?.name ?? '').trim().split(' ')[0];
  const dashboardSections = data ?? [];

  const cardStyle = useMemo(() => {
    const gap = responsive.isMobile ? 8 : 10;
    const width = `${(100 - (columns - 1) * 2) / columns}%` as const;
    return { width, marginBottom: gap };
  }, [columns, responsive.isMobile]);

  return (
    <Screen variant="admin">
      <View style={styles.page}>
        <View style={[styles.header, responsive.isMobile && styles.headerMobile]}>
          <View style={styles.headerAccent} />
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{firstName ? `Olá, ${firstName}!` : 'Olá!'}</Text>
            <Text style={styles.subtitle}>Resumo operacional do Coração Gaúcho</Text>
          </View>

          <View style={[styles.headerActions, responsive.isMobile && styles.headerActionsMobile]}>
            <View style={[styles.periods, responsive.isMobile && styles.periodsMobile]}>
              {periods.map((item) => {
                const active = period === item;
                return (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.82}
                    onPress={() => setPeriod(item)}
                    style={[styles.periodButton, responsive.isMobile && styles.periodButtonMobile, active && styles.periodButtonActive]}
                  >
                    <Text style={[styles.periodText, active && styles.periodTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityLabel="Atualizar dashboard"
              onPress={() => {
                setRefreshKey((current) => current + 1);
                refetch();
              }}
              style={styles.refreshButton}
            >
              <MaterialCommunityIcons name="refresh" color={colors.text} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? <Text style={styles.stateText}>Carregando dados do servidor...</Text> : null}
        {error ? <TouchableOpacity activeOpacity={0.85} onPress={refetch} style={styles.errorBox}>
          <Text style={styles.errorTitle}>Não foi possível conectar ao servidor.</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity> : null}

        {!error && <View key={refreshKey} style={styles.sections}>
          {dashboardSections.map((section) => (
            <DashboardSection key={section.title} title={section.title}>
              <View style={styles.metricGrid}>
                {section.metrics.map((metric) => (
                  <View key={metric.title} style={cardStyle}>
                    <MetricCard {...metric} />
                  </View>
                ))}
              </View>
            </DashboardSection>
          ))}
          {!loading && !dashboardSections.length ? <Text style={styles.stateText}>Não há dados ainda</Text> : null}
        </View>}
      </View>
    </Screen>
  );
}

const webNoSelect = { userSelect: 'none' } as any;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: 18
  },
  header: {
    minHeight: 86,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#151516',
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    overflow: 'hidden',
    position: 'relative'
  },
  headerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.red
  },
  headerMobile: {
    alignItems: 'stretch',
    flexDirection: 'column'
  },
  headerCopy: {
    flex: 1,
    minWidth: 190
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 0,
    ...webNoSelect
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    ...webNoSelect
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  headerActionsMobile: {
    width: '100%',
    flexWrap: 'nowrap'
  },
  periods: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
    padding: 3
  },
  periodsMobile: {
    flex: 1
  },
  periodButton: {
    height: 38,
    minWidth: 62,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  periodButtonMobile: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6
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
  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  sections: {
    gap: 18
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
    justifyContent: 'space-between',
    rowGap: 12
  }
});
