import { api, unwrapData } from './api';
import type { Customer } from '@/types/entities';

export async function listCustomers() {
  const response = await api.get('/admin/customers');
  return unwrapData<Customer[]>(response.data);
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
