import { api, unwrapData } from './api';
import type { PaginatedResponse } from '@/types/api';
import type { PaymentHistory, Sale, SaleStatus } from '@/types/entities';

export type SalePayload = {
  cpf: string;
  tipo: 'EVENTO' | 'BAILE' | 'CURSO';
  eventoId?: string | number;
  cursoId?: string | number;
  inscricaoId?: string | number;
  quantidade: number;
  valorUnitario: number;
  desconto?: number;
  formaPagamento?: 'LINK_PAGAMENTO' | 'PIX_EXTERNO' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'CORTESIA';
  observacao?: string;
};

export type SaleFilters = {
  page?: number;
  limit?: number;
  search?: string;
  cpf?: string;
  nome?: string;
  codigo?: string;
  tipo?: string;
  status?: string;
  formaPagamento?: string;
  provider?: 'STRIPE' | 'EXTERNO' | 'CORTESIA';
  origem?: 'SITE' | 'WHATSAPP' | 'PAINEL_ADMIN';
  eventoId?: string;
  cursoId?: string;
  dataInicial?: string;
  dataFinal?: string;
  sort?: 'createdAt:desc' | 'createdAt:asc' | 'total:desc' | 'total:asc';
};

export async function listSales(params?: SaleFilters) {
  const response = await api.get('/admin/vendas', { params });
  type SalesPage = Pick<PaginatedResponse<Sale>, 'data' | 'total' | 'page'> & {
    limit: number;
    summary?: { totalVendido: number; vendasPagas: number; vendasPendentes: number; cortesias: number };
  };
  const payload = response.data as SalesPage | { data: SalesPage };
  // The API page itself has a `data` array. Using the generic unwrapData here
  // discarded total/page/summary and made the screen look empty.
  return Array.isArray((payload as SalesPage).data)
    ? payload as SalesPage
    : (payload as { data: SalesPage }).data;
}

export async function getSale(id: string) {
  const response = await api.get(`/admin/vendas/${id}`);
  return unwrapData<Sale>(response.data);
}

export async function getSaleHistory(id: string) {
  const response = await api.get(`/admin/vendas/${id}/historico`);
  return unwrapData<PaymentHistory[]>(response.data);
}

export async function createSale(data: SalePayload) {
  const response = await api.post('/admin/vendas', data);
  return unwrapData<Sale>(response.data);
}

export async function updateSale(id: string, data: { status?: Extract<SaleStatus, 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'CORTESIA'>; formaPagamento?: SalePayload['formaPagamento']; observacao?: string; quantidade?: number; desconto?: number }) {
  const response = await api.patch(`/admin/vendas/${id}`, data);
  return unwrapData<Sale>(response.data);
}

export async function generateSalePaymentLink(id: string) {
  const response = await api.post(`/admin/vendas/${id}/link-pagamento`);
  return unwrapData<{ checkoutUrl: string; shareText: string; venda: Sale; pagamento: { paymentId?: string | number; status?: string } }>(response.data);
}

export async function removeSale(id: string) {
  const response = await api.delete(`/admin/vendas/${id}`);
  return unwrapData(response.data);
}
