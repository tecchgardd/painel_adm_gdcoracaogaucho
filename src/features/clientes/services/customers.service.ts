import type { Customer } from '@/shared/types/entities';
import { api, unwrapData } from '@/core/api/client';

export type CustomerFilters = {
  /** `aluno` = com inscrição em curso; `comprador` = com compra de ingresso. */
  tipo?: 'aluno' | 'comprador';
  search?: string;
  status?: 'ATIVO' | 'INATIVO';
};

export async function listCustomers(filters: CustomerFilters = {}) {
  const response = await api.get('/admin/customers', { params: filters });
  const value = unwrapData<Customer[] | { data?: Customer[] }>(response.data);
  return Array.isArray(value) ? value : value?.data ?? [];
}

export async function findCustomerByCpf(cpf: string) {
  const response = await api.get('/admin/customers', { params: { cpf } });
  const data = unwrapData<Customer[] | Customer | null>(response.data);
  return Array.isArray(data) ? data[0] ?? null : data;
}

export async function getCustomer(id: string) {
  const response = await api.get(`/admin/customers/${id}`);
  return unwrapData<Customer>(response.data);
}

export async function getHistoricoCustomer(id: string) {
  const response = await api.get(`/admin/customers/${id}/historico`);
  return unwrapData(response.data);
}

export async function createCustomer(data: Partial<Customer>) {
  const response = await api.post('/admin/customers', data);
  return unwrapData<Customer>(response.data);
}

export async function updateCustomer(id: string, data: Partial<Customer>) {
  const response = await api.put(`/admin/customers/${id}`, data);
  return unwrapData<Customer>(response.data);
}

export async function deleteCustomer(id: string) {
  const response = await api.delete(`/admin/customers/${id}`);
  return unwrapData(response.data);
}
