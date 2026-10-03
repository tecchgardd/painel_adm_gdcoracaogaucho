import type { DashboardMetrics, DashboardSectionData } from '@/shared/types/entities';
import { formatCurrencyBRL } from '@/shared/utils/format';
import { api, unwrapData } from '@/core/api/client';
import type { DashboardOverview, DashboardSummary } from '@/features/dashboard/types';

export const dashboardZeroState: DashboardMetrics = [
  {
    title: 'Eventos ativos',
    metrics: [
      { title: 'Bailes ativos', value: '0', subtitle: 'agenda aberta', icon: 'music-circle-outline', variant: 'neutral' },
      { title: 'Cursos ativos', value: '0', subtitle: 'turmas abertas', icon: 'school-outline', variant: 'neutral' },
      { title: 'Próximo evento', value: '-', subtitle: 'sem eventos', icon: 'calendar-clock-outline', variant: 'neutral' },
      { title: 'Capacidade ativa', value: '0', subtitle: 'lugares totais', icon: 'account-group-outline', variant: 'neutral' }
    ]
  },
  {
    title: 'Vendas rápidas',
    metrics: [
      { title: 'Receita do dia', value: 'R$ 0,00', subtitle: 'confirmada hoje', icon: 'cash-fast', variant: 'neutral' },
      { title: 'Ingressos hoje', value: '0', subtitle: 'vendidos', icon: 'ticket-outline', variant: 'neutral' },
      { title: 'Pagamentos pendentes', value: '0', subtitle: 'aguardando baixa', icon: 'clock-alert-outline', variant: 'neutral' },
      { title: 'Pedidos pendentes', value: '0', subtitle: 'fila atual', icon: 'cart-outline', variant: 'neutral' }
    ]
  },
  {
    title: 'Check-in rápido',
    metrics: [
      { title: 'Validados hoje', value: '0', subtitle: 'check-ins', icon: 'qrcode-scan', variant: 'neutral' },
      { title: 'Cortesias liberadas', value: '0', subtitle: 'ativas', icon: 'ticket-percent-outline', variant: 'neutral' },
      { title: 'Pendentes validar', value: '0', subtitle: 'na portaria', icon: 'clipboard-clock-outline', variant: 'neutral' },
      { title: 'Último check-in', value: '-', subtitle: 'sem registros', icon: 'account-check-outline', variant: 'neutral' }
    ]
  },
  {
    title: 'Alertas rápidos',
    metrics: [
      { title: 'Pagamentos atrasados', value: '0', subtitle: 'precisam ação', icon: 'alert-circle-outline', variant: 'neutral' },
      { title: 'Eventos próximos', value: '0', subtitle: 'próximos 7 dias', icon: 'calendar-alert-outline', variant: 'neutral' },
      { title: 'Inscrições pendentes', value: '0', subtitle: 'cursos', icon: 'account-clock-outline', variant: 'neutral' },
      { title: 'Estoque baixo', value: '0', subtitle: 'itens críticos', icon: 'package-variant', variant: 'neutral' }
    ]
  }
];

export function normalizeDashboard(payload: unknown): DashboardMetrics {
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) return data.length ? data as DashboardSectionData[] : dashboardZeroState;
  if (data && typeof data === 'object' && Array.isArray((data as { sections?: unknown[] }).sections)) {
    const sections = (data as { sections: DashboardSectionData[] }).sections;
    return sections.length ? sections : dashboardZeroState;
  }
  if (data && typeof data === 'object') {
    const summary = data as Record<string, any>;
    const nextEvent = summary.proximoEvento;
    const nextEventDate = nextEvent?.data ? new Date(nextEvent.data) : null;
    const lastCheckin = summary.ultimoCheckin;
    const lastCheckinDate = lastCheckin?.horario ? new Date(lastCheckin.horario) : null;
    const time = (date: Date | null) => date && !Number.isNaN(date.getTime())
      ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '-';
    const shortDate = (date: Date | null) => date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : '-';

    return [
      {
        title: 'Eventos ativos',
        metrics: [
          { title: 'Bailes ativos', value: String(summary.bailesAtivos ?? 0), subtitle: 'agenda aberta', icon: 'music-circle-outline', variant: Number(summary.bailesAtivos ?? 0) > 0 ? 'success' : 'neutral' },
          { title: 'Cursos ativos', value: String(summary.cursosAtivos ?? 0), subtitle: 'turmas abertas', icon: 'school-outline', variant: Number(summary.cursosAtivos ?? 0) > 0 ? 'success' : 'neutral' },
          { title: 'Próximo evento', value: nextEvent ? shortDate(nextEventDate) : '-', subtitle: nextEvent?.nome ?? 'sem eventos', icon: 'calendar-clock-outline', variant: nextEvent ? 'warning' : 'neutral' },
          { title: 'Capacidade ativa', value: String(summary.capacidadeAtiva ?? 0), subtitle: 'lugares totais', icon: 'account-group-outline', variant: 'neutral' }
        ]
      },
      {
        title: 'Vendas rápidas',
        metrics: [
          { title: 'Receita do dia', value: formatCurrencyBRL(summary.receitaDia ?? 0), subtitle: 'confirmada hoje', icon: 'cash-fast', variant: Number(summary.receitaDia ?? 0) > 0 ? 'success' : 'neutral' },
          { title: 'Ingressos hoje', value: String(summary.ingressosVendidosHoje ?? 0), subtitle: 'vendidos', icon: 'ticket-outline', variant: 'neutral' },
          { title: 'Pagamentos pendentes', value: String(summary.pagamentosPendentes ?? 0), subtitle: 'aguardando baixa', icon: 'clock-alert-outline', variant: Number(summary.pagamentosPendentes ?? 0) > 0 ? 'danger' : 'neutral' },
          { title: 'Pedidos pendentes', value: String(summary.pedidosPendentes ?? 0), subtitle: 'fila atual', icon: 'cart-outline', variant: Number(summary.pedidosPendentes ?? 0) > 0 ? 'danger' : 'neutral' }
        ]
      },
      {
        title: 'Check-in rápido',
        metrics: [
          { title: 'Validados hoje', value: String(summary.ingressosValidadosHoje ?? 0), subtitle: 'check-ins', icon: 'qrcode-scan', variant: Number(summary.ingressosValidadosHoje ?? 0) > 0 ? 'success' : 'neutral' },
          { title: 'Cortesias liberadas', value: String(summary.cortesiasLiberadas ?? 0), subtitle: 'ativas', icon: 'ticket-percent-outline', variant: 'warning' },
          { title: 'Pendentes validar', value: String(summary.ingressosVendidosHoje ?? 0), subtitle: 'na portaria', icon: 'clipboard-clock-outline', variant: Number(summary.ingressosVendidosHoje ?? 0) > 0 ? 'warning' : 'neutral' },
          { title: 'Último check-in', value: time(lastCheckinDate), subtitle: lastCheckin?.cliente ?? 'sem registros', icon: 'account-check-outline', variant: lastCheckin ? 'success' : 'neutral' }
        ]
      },
      {
        title: 'Alertas rápidos',
        metrics: [
          { title: 'Clientes cadastrados', value: String(summary.clientes ?? 0), subtitle: 'base total', icon: 'account-outline', variant: 'neutral' },
          { title: 'Eventos próximos', value: String(summary.eventosProximos ?? 0), subtitle: 'próximos 7 dias', icon: 'calendar-alert-outline', variant: Number(summary.eventosProximos ?? 0) > 0 ? 'warning' : 'neutral' },
          { title: 'Inscrições pendentes', value: String(summary.inscricoesPendentes ?? 0), subtitle: 'cursos', icon: 'account-clock-outline', variant: Number(summary.inscricoesPendentes ?? 0) > 0 ? 'danger' : 'neutral' },
          { title: 'Status geral', value: Number(summary.pagamentosPendentes ?? 0) || Number(summary.pedidosPendentes ?? 0) ? 'Atenção' : 'OK', subtitle: 'operação', icon: 'shield-check-outline', variant: Number(summary.pagamentosPendentes ?? 0) || Number(summary.pedidosPendentes ?? 0) ? 'warning' : 'success' }
        ]
      }
    ];
  }
  return dashboardZeroState;
}

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Resumo tipado; `null` quando a API responde no formato legado (lista de seções). */
export function parseDashboardSummary(payload: unknown): DashboardSummary | null {
  const data = unwrapData<unknown>(payload);
  if (!data || typeof data !== 'object' || Array.isArray(data) || Array.isArray((data as { sections?: unknown }).sections)) return null;
  const raw = data as Record<string, any>;
  const next = raw.proximoEvento && typeof raw.proximoEvento === 'object' ? raw.proximoEvento : null;
  const last = raw.ultimoCheckin && typeof raw.ultimoCheckin === 'object' ? raw.ultimoCheckin : null;
  return {
    bailesAtivos: toNumber(raw.bailesAtivos),
    cursosAtivos: toNumber(raw.cursosAtivos),
    capacidadeAtiva: toNumber(raw.capacidadeAtiva),
    receitaDia: toNumber(raw.receitaDia),
    ingressosVendidosHoje: toNumber(raw.ingressosVendidosHoje),
    ingressosValidadosHoje: toNumber(raw.ingressosValidadosHoje),
    pagamentosPendentes: toNumber(raw.pagamentosPendentes),
    pedidosPendentes: toNumber(raw.pedidosPendentes),
    inscricoesPendentes: toNumber(raw.inscricoesPendentes),
    cortesiasLiberadas: toNumber(raw.cortesiasLiberadas),
    clientes: toNumber(raw.clientes),
    eventosProximos: toNumber(raw.eventosProximos),
    proximoEvento: next ? {
      nome: next.nome ?? next.name,
      data: next.data ?? next.date,
      local: next.local,
      cidade: next.cidade,
      vendidos: next.vendidos != null ? toNumber(next.vendidos) : undefined,
      capacidade: next.capacidade != null ? toNumber(next.capacidade) : undefined
    } : null,
    ultimoCheckin: last ? { cliente: last.cliente, horario: last.horario } : null
  };
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const response = await api.get('/admin/dashboard');
  return { summary: parseDashboardSummary(response.data), sections: normalizeDashboard(response.data) };
}
