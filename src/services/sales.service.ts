import { api, unwrapData } from './api';

export type SalePayload = {
  cpf: string;
  tipo: 'EVENTO' | 'BAILE' | 'CURSO';
  eventoId?: string | number;
  cursoId?: string | number;
  inscricaoId?: string | number;
  quantidade: number;
  valorUnitario: number;
  desconto?: number;
  formaPagamento?: 'PIX' | 'DINHEIRO' | 'CARTAO' | 'CORTESIA';
  observacao?: string;
};

export type SaleFilters = {
  search?: string;
  cpf?: string;
  nome?: string;
  codigo?: string;
  tipo?: string;
  status?: string;
};

export async function listSales(params?: SaleFilters) {
  const response = await api.get('/admin/vendas', { params });
  return unwrapData<{ data: any[]; total: number; summary?: any }>(response.data);
}

export async function getSale(id: string) {
  const response = await api.get(`/admin/vendas/${id}`);
  return unwrapData<any>(response.data);
}

export async function createSale(data: SalePayload) {
  const response = await api.post('/admin/vendas', data);
  return unwrapData<any>(response.data);
}

export async function updateSale(id: string, data: Record<string, unknown>) {
  const response = await api.patch(`/admin/vendas/${id}`, data);
  return unwrapData<any>(response.data);
}

export async function generateSalePaymentLink(id: string) {
  const response = await api.post(`/admin/vendas/${id}/link-pagamento`);
  return unwrapData<{ checkoutUrl: string; shareText: string; venda: any; pagamento: any }>(response.data);
}

export async function removeSale(id: string) {
  const response = await api.delete(`/admin/vendas/${id}`);
  return unwrapData(response.data);
}
