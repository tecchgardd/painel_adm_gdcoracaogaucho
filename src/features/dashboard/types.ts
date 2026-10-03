import type { DashboardMetrics } from '@/shared/types/entities';

/** Resumo bruto retornado por `GET /admin/dashboard` (formato objeto). */
export type DashboardSummary = {
  bailesAtivos: number;
  cursosAtivos: number;
  capacidadeAtiva: number;
  receitaDia: number;
  ingressosVendidosHoje: number;
  ingressosValidadosHoje: number;
  pagamentosPendentes: number;
  pedidosPendentes: number;
  inscricoesPendentes: number;
  cortesiasLiberadas: number;
  clientes: number;
  eventosProximos: number;
  proximoEvento: DashboardNextEvent | null;
  ultimoCheckin: { cliente?: string; horario?: string } | null;
};

export type DashboardNextEvent = {
  nome?: string;
  data?: string;
  local?: string;
  cidade?: string;
  vendidos?: number;
  capacidade?: number;
};

/**
 * `summary` só existe quando a API devolve o formato objeto; no formato legado (lista de seções)
 * o dashboard cai para a grade de seções.
 */
export type DashboardOverview = {
  summary: DashboardSummary | null;
  sections: DashboardMetrics;
};
