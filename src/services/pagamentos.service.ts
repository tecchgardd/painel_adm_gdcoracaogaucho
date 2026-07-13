import { api, unwrapData } from './api';
import type { Pagamento } from '@/types/entities';

export async function listPagamentos() {
  const response = await api.get('/admin/pagamentos');
  return unwrapData<Pagamento[]>(response.data);
}

export async function getPagamento(id: string) {
  const response = await api.get(`/admin/pagamentos/${id}`);
  return unwrapData<Pagamento>(response.data);
}

export async function criarCobranca(data: Partial<Pagamento>) {
  const response = await api.post('/admin/pagamentos/criar-cobranca', data);
  return unwrapData(response.data);
}

export async function confirmarPagamento(id: string) {
  const response = await api.patch(`/admin/pagamentos/${id}/confirmar`);
  return unwrapData(response.data);
}

export async function cancelarPagamento(id: string) {
  const response = await api.patch(`/admin/pagamentos/${id}/cancelar`);
  return unwrapData(response.data);
}
