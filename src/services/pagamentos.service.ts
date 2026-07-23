import { api, unwrapData } from './api';
import type { Pagamento } from '@/types/entities';

export type PagamentoStatus = 'PENDENTE' | 'PROCESSANDO' | 'PAGO' | 'FALHOU' | 'CANCELADO' | 'EXPIRADO' | 'ESTORNADO' | 'PARCIALMENTE_ESTORNADO' | 'CONTESTADO' | 'CONTESTACAO_PERDIDA';
export type PagamentoFilters = { page?: number; limit?: number; status?: PagamentoStatus; customerId?: string; search?: string };
export type PagamentosPage = { data: Pagamento[]; total: number; page: number; limit: number; totalPages?: number };

export async function listPagamentos(params: PagamentoFilters = {}) {
  const response = await api.get('/admin/pagamentos', { params });
  const value = unwrapData<Pagamento[] | PagamentosPage>(response.data);
  return Array.isArray(value)
    ? { data: value, total: value.length, page: params.page ?? 1, limit: params.limit ?? 20 }
    : value;
}

export async function getPagamento(id: string) {
  const response = await api.get(`/admin/pagamentos/${id}`);
  return unwrapData<Pagamento>(response.data);
}

export async function cancelarPagamento(id: string, reason: string) {
  const response = await api.patch(`/admin/pagamentos/${id}/cancelar`, { reason });
  return unwrapData<Pagamento>(response.data);
}

export type ExternalPaymentMethod = 'PIX_EXTERNO' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
export type ManualPaymentPayload = { method: ExternalPaymentMethod; amount?: number; reason: string; paidAt?: string; reference?: string; observation?: string };
export async function darBaixaExterna(id: string, payload: ManualPaymentPayload) {
  const response = await api.post(`/admin/pagamentos/${id}/baixa-externa`, payload);
  return unwrapData<Pagamento>(response.data);
}

export async function substituirPorPagamentoExterno(id: string, payload: ManualPaymentPayload) {
  const response = await api.post(`/admin/pagamentos/${id}/substituir-por-externo`, payload);
  return unwrapData<Pagamento>(response.data);
}

export type EditPaymentPayload = {
  method: ExternalPaymentMethod | 'CORTESIA';
  status: 'PENDENTE' | 'PROCESSANDO' | 'PAGO' | 'FALHOU' | 'CANCELADO' | 'EXPIRADO';
  amount: number;
  paidAt?: string | null;
  reference?: string;
  observation?: string;
  reason: string;
};
export async function editarPagamento(id: string, payload: EditPaymentPayload) {
  const response = await api.patch(`/admin/pagamentos/${id}`, payload);
  return unwrapData<Pagamento>(response.data);
}

export type StripeRefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer';
export async function reembolsarPagamento(id: string, payload: { amount?: number; reason: string; stripeReason: StripeRefundReason }) {
  const response = await api.post(`/admin/pagamentos/${id}/reembolsar`, payload);
  return unwrapData<Pagamento>(response.data);
}
