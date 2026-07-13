import { api, unwrapData } from './api';
import type { Colaborador } from '@/types/entities';

export type ColaboradorPayload = {
  nome?: string;
  cpf?: string;
  email?: string;
  role?: 'ADMIN' | 'STAFF';
  status?: 'ATIVO' | 'INATIVO';
  password?: string;
  generateTemporaryPassword?: boolean;
  mustChangePassword?: boolean;
};

export type ColaboradorAccessResponse = {
  data: Colaborador;
  temporaryPassword?: string;
};

export async function listColaboradores() {
  const response = await api.get('/admin/colaboradores');
  return unwrapData<Colaborador[]>(response.data);
}

export async function createColaborador(data: ColaboradorPayload) {
  const response = await api.post('/admin/colaboradores', data);
  return response.data as ColaboradorAccessResponse;
}

export async function updateColaborador(id: string, data: ColaboradorPayload) {
  const response = await api.put(`/admin/colaboradores/${id}`, data);
  return unwrapData<Colaborador>(response.data);
}

export async function resetColaboradorPassword(id: string, password?: string) {
  const response = await api.post(`/admin/colaboradores/${id}/reset-password`, password ? { password } : {});
  return response.data as ColaboradorAccessResponse;
}

export async function deleteColaborador(id: string) {
  const response = await api.delete(`/admin/colaboradores/${id}`);
  return unwrapData(response.data);
}
