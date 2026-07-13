import type { ReportCategory } from '@/types/entities';
import { formatCurrencyBRL } from '@/utils/format';
import { api, unwrapData } from './api';

export type ReportResult = ReportCategory & { error?: string };

function getValue(data: any, keys: string[], fallback: string | number = 0) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
  }
  return fallback;
}

function metric(title: string, value: string | number, subtitle: string, icon: ReportCategory['metrics'][number]['icon'], variant: ReportCategory['metrics'][number]['variant'] = 'neutral') {
  return { title, value: String(value), subtitle, icon, variant };
}

function buildCategory(title: string, data: any): ReportCategory {
  if (Array.isArray(data?.metrics)) return { title, metrics: data.metrics, chart: data.chart };
  if (title === 'Financeiro') {
    return {
      title,
      metrics: [
        metric('Receita prevista', formatCurrencyBRL(getValue(data, ['receitaPrevista'])), 'ingressos gerados', 'cash-multiple', 'success'),
        metric('Receita recebida', formatCurrencyBRL(getValue(data, ['receitaRecebida'])), 'ingressos pagos', 'finance', 'success'),
        metric('Receita pendente', formatCurrencyBRL(getValue(data, ['receitaPendente'])), 'aguardando', 'clock-alert-outline', 'danger'),
        metric('Ingressos pagos', getValue(data, ['ingressosPagos']), 'confirmados', 'check-decagram-outline', 'success'),
        metric('Ingressos pendentes', getValue(data, ['ingressosPendentes']), 'aguardando', 'ticket-outline', 'warning'),
        metric('Cortesias', getValue(data, ['cortesias']), 'separadas', 'ticket-percent-outline', 'warning')
      ]
    };
  }
  if (title === 'Eventos') {
    return {
      title,
      metrics: [
        metric('Maior venda', getValue(data, ['eventoMaiorVenda', 'topSellingEvent'], '-'), 'evento destaque', 'trophy-outline', 'success'),
        metric('Maior check-in', getValue(data, ['eventoMaiorCheckin', 'topCheckinEvent'], '-'), 'validações', 'qrcode-scan', 'warning'),
        metric('Total de bailes', getValue(data, ['totalBailes', 'dancesTotal']), 'no período', 'music-circle-outline'),
        metric('Total de cursos', getValue(data, ['totalCursos', 'coursesTotal']), 'turmas criadas', 'school-outline'),
        metric('Ocupação média', `${getValue(data, ['ocupacaoMedia', 'averageOccupation'])}%`, 'eventos ativos', 'chart-donut', 'success'),
        metric('Cortesias emitidas', getValue(data, ['cortesiasEmitidas', 'courtesiesIssued']), 'total liberado', 'ticket-percent-outline', 'warning')
      ]
    };
  }
  if (title === 'Cursos') {
    return {
      title,
      metrics: [
        metric('Total inscrições', getValue(data, ['totalInscricoes']), 'alunos em cursos', 'account-check-outline', 'success'),
        metric('Participantes', getValue(data, ['totalParticipantes']), 'pessoas inscritas', 'account-group-outline', 'success'),
        metric('Padrinhos pendentes', getValue(data, ['totalPadrinhosPendentes']), 'a completar', 'account-clock-outline', 'danger'),
        metric('Padrinhos cadastrados', getValue(data, ['totalPadrinhosCadastrados']), 'nomes recebidos', 'account-multiple-check-outline', 'success'),
        metric('Cidade maior fluxo', getValue(data, ['cidadeMaiorFluxo', 'topCity'], '-'), 'maior origem', 'map-marker-radius-outline'),
        metric('Lotes gerados', getValue(data, ['totalLotesGerados']), 'ingressos criados', 'ticket-confirmation-outline', 'warning')
      ]
    };
  }
  if (title === 'Pedidos') {
    return {
      title,
      metrics: [
        metric('Total de ingressos', getValue(data, ['totalIngressos']), 'emitidos', 'ticket-confirmation-outline', 'success'),
        metric('Ingressos pagos', getValue(data, ['ingressosPagos']), 'confirmados', 'cart-check', 'success'),
        metric('Ingressos cancelados', getValue(data, ['ingressosCancelados']), 'cancelados', 'cart-remove', 'danger'),
        metric('Ingressos utilizados', getValue(data, ['ingressosUtilizados']), 'check-in futuro', 'qrcode-scan', 'success'),
        metric('Ingressos expirados', getValue(data, ['ingressosExpirados']), 'vencidos', 'timer-alert-outline', 'danger')
      ]
    };
  }
  return {
    title: 'Cadastros',
    metrics: [
      metric('Clientes cadastrados', getValue(data, ['clientesCadastrados', 'customersTotal']), 'base total', 'account-outline'),
      metric('Alunos cadastrados', getValue(data, ['alunosCadastrados', 'studentsTotal']), 'em cursos', 'account-school-outline'),
      metric('Colaboradores ativos', getValue(data, ['colaboradoresAtivos', 'activeStaff']), 'operação', 'account-multiple-outline', 'success'),
      metric('Novos cadastros no mês', getValue(data, ['novosCadastrosMes', 'newRegistrations']), 'crescimento', 'account-plus-outline', 'success')
    ]
  };
}

async function getReportCategory(title: string, path: string): Promise<ReportResult> {
  try {
    const response = await api.get(path);
    return buildCategory(title, unwrapData(response.data));
  } catch (error) {
    const message = (error as { message?: string })?.message ?? `Erro ao carregar ${title}.`;
    return { title, error: message, metrics: [] };
  }
}

export async function getFinanceiro() {
  const response = await api.get('/admin/relatorios/financeiro');
  return unwrapData(response.data);
}

export async function getEventos() {
  const response = await api.get('/admin/relatorios/eventos');
  return unwrapData(response.data);
}

export async function getCursos() {
  const response = await api.get('/admin/relatorios/cursos');
  return unwrapData(response.data);
}

export async function getPedidos() {
  const response = await api.get('/admin/relatorios/pedidos');
  return unwrapData(response.data);
}

export async function getCadastros() {
  const response = await api.get('/admin/relatorios/cadastros');
  return unwrapData(response.data);
}

export async function getReports(): Promise<ReportResult[]> {
  return Promise.all([
    getReportCategory('Financeiro', '/admin/relatorios/financeiro'),
    getReportCategory('Eventos', '/admin/relatorios/eventos'),
    getReportCategory('Cursos', '/admin/relatorios/cursos'),
    getReportCategory('Pedidos', '/admin/relatorios/pedidos'),
    getReportCategory('Cadastros', '/admin/relatorios/cadastros')
  ]);
}

export function getReportExportUrl(format: 'pdf' | 'csv' | 'xlsx') {
  return `${api.defaults.baseURL}/admin/relatorios/export/${format}`;
}

export async function exportReport(format: 'pdf' | 'csv' | 'xlsx') {
  const response = await api.get(`/admin/relatorios/export/${format}`, { responseType: 'blob' });
  if (typeof window !== 'undefined') {
    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-coracao-gaucho.${format === 'xlsx' ? 'xls' : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
