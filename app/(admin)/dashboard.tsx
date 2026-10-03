import { useCallback } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AttentionPanel } from '@/features/dashboard/components/AttentionPanel';
import { CheckinPanel } from '@/features/dashboard/components/CheckinPanel';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { MetricCard } from '@/features/dashboard/components/MetricCard';
import { NextEventPanel } from '@/features/dashboard/components/NextEventPanel';
import { OverviewPanel } from '@/features/dashboard/components/OverviewPanel';
import { QuickActionsRow } from '@/features/dashboard/components/QuickActionsRow';
import { getDashboardOverview } from '@/features/dashboard/services/dashboard.service';
import { getIntegrationHealth } from '@/features/dashboard/services/health.service';
import type { DashboardSummary } from '@/features/dashboard/types';
import { formatLongToday } from '@/features/dashboard/utils/dates';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { Screen } from '@/shared/components/ui';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { formatCurrencyBRL } from '@/shared/utils/format';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';

export default function Dashboard() {
  const responsive = useResponsive();
  const queryDashboard = useCallback(() => getDashboardOverview(), []);
  const { data, loading, error, refetch } = useApiQuery(queryDashboard, { fallbackData: null });
  const queryHealth = useCallback(() => getIntegrationHealth(), []);
  const { data: health, refetch: refetchHealth } = useApiQuery(queryHealth, { fallbackData: null });
  const user = useAuthStore((state) => state.user);
  const firstName = (user?.nome ?? user?.name ?? '').trim().split(' ')[0];
  const summary = data?.summary ?? null;
  const wide = responsive.isDesktop;

  function refresh() {
    refetch();
    refetchHealth();
  }

  return (
    <Screen variant="admin">
      <View style={styles.page}>
        <View style={[styles.header, responsive.isMobile && styles.headerMobile]}>
          <View style={styles.headerCopy}>
            <Text style={styles.date}>{formatLongToday()}</Text>
            <Text style={styles.title}>{firstName ? `Olá, ${firstName}` : 'Olá'}</Text>
            <Text style={styles.subtitle}>Resumo da operação do Coração Gaúcho</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.statusRow, responsive.isMobile && styles.statusRowMobile]}>
              <StatusPill ok={health?.status === 'ok'} label={health?.status === 'ok' ? 'API operacional' : 'API indisponível'} />
              <StatusPill
                ok={!!health?.stripeConfigured}
                warn
                label={health?.stripeConfigured ? 'Stripe configurada' : 'Stripe não configurada'}
                hint="Configuração não garante habilitação da conta para cobranças."
              />
            </View>
            <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Atualizar dashboard" onPress={refresh} style={styles.refreshButton}>
              <MaterialCommunityIcons name="refresh" color={colors.text} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && !data ? <LoadingState label="Carregando dados do servidor..." /> : null}
        {error ? <ErrorState message={error} onRetry={refetch} title="Não foi possível conectar ao servidor." /> : null}

        {!error && summary ? <>
          <KpiRow summary={summary} layout={responsive.isDesktop ? 'row' : responsive.isMobile ? 'stacked' : 'grid'} />
          <View style={[styles.columns, wide && styles.columnsWide]}>
            <View style={[styles.column, wide && styles.mainColumn]}>
              <NextEventPanel event={summary.proximoEvento} />
              <QuickActionsRow columns={responsive.isMobile ? 1 : wide ? 3 : 2} />
            </View>
            <View style={[styles.column, wide && styles.sideColumn]}>
              <AttentionPanel summary={summary} />
              <CheckinPanel summary={summary} />
            </View>
          </View>
          <OverviewPanel summary={summary} columns={responsive.isDesktop ? 4 : 2} />
        </> : null}

        {/* Formato legado da API (lista de seções): mantém a grade de métricas. */}
        {!error && data && !summary ? <>
          <QuickActionsRow columns={responsive.isMobile ? 1 : 3} />
          {data.sections.map((section) => (
            <DashboardSection key={section.title} title={section.title}>
              <View style={gridContainer}>
                {section.metrics.map((metric) => (
                  <View key={metric.title} style={gridCellStyle(responsive.dashboardColumns)}>
                    <MetricCard {...metric} />
                  </View>
                ))}
              </View>
            </DashboardSection>
          ))}
        </> : null}
      </View>
    </Screen>
  );
}

/** row: 4 colunas · grid: 2x2 · stacked (mobile): receita em largura total + 3 compactos. */
function KpiRow({ summary, layout }: { summary: DashboardSummary; layout: 'row' | 'grid' | 'stacked' }) {
  const pending = summary.pagamentosPendentes + summary.inscricoesPendentes;
  const stacked = layout === 'stacked';
  const cell = gridCellStyle(layout === 'row' ? 4 : stacked ? 3 : 2);
  return <View style={gridContainer}>
    <View style={stacked ? gridCellStyle(1) : cell}>
      <KpiCard highlight label="Receita do dia" value={formatCurrencyBRL(summary.receitaDia)} hint="Pagamentos confirmados hoje" icon="cash-fast" onPress={() => router.push('/pagamentos')} />
    </View>
    <View style={cell}>
      <KpiCard compact={stacked} label={stacked ? 'Vendidos' : 'Ingressos vendidos'} value={String(summary.ingressosVendidosHoje)} hint="Hoje" icon="ticket-outline" tone="blue" onPress={() => router.push('/vendas')} />
    </View>
    <View style={cell}>
      <KpiCard compact={stacked} label="Check-ins" value={String(summary.ingressosValidadosHoje)} hint="Validados hoje" icon="qrcode-scan" tone="green" onPress={() => router.push('/historico-validacoes')} />
    </View>
    <View style={cell}>
      <KpiCard compact={stacked} label="Pendências" value={String(pending)} hint={pending ? 'Pagamentos e inscrições' : 'Nada pendente'} icon="alert-circle-outline" tone={pending ? 'yellow' : 'neutral'} onPress={() => router.push('/pagamentos')} />
    </View>
  </View>;
}

function StatusPill({ ok, warn = false, label, hint }: { ok: boolean; warn?: boolean; label: string; hint?: string }) {
  const color = ok ? '#4CB85C' : warn ? colors.yellow : colors.red;
  return <View style={styles.pill} accessibilityLabel={hint ? `${label}. ${hint}` : label}>
    <View style={[styles.pillDot, { backgroundColor: color }]} />
    <Text style={styles.pillText}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, gap: 16, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 4 },
  headerMobile: { flexDirection: 'column', alignItems: 'stretch' },
  statusRowMobile: { justifyContent: 'flex-start' },
  headerCopy: { flex: 1, minWidth: 0 },
  date: { color: colors.goldAccent, fontSize: 12, fontFamily: theme.font.medium, letterSpacing: 0.3 },
  title: { color: colors.text, fontSize: 28, lineHeight: 36, fontFamily: theme.font.semiBold, marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: 14, fontFamily: theme.font.regular },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, paddingHorizontal: 12 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium },
  refreshButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.borderSoft },
  columns: { gap: 16 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { gap: 16, minWidth: 0 },
  mainColumn: { flex: 3 },
  sideColumn: { flex: 2 }
});
