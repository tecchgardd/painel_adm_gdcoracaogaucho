import { api, unwrapData } from './api';
import type { Cortesia } from '@/types/entities';

export async function listCortesias() {
  const response = await api.get('/admin/cortesias');
  return unwrapData<Cortesia[]>(response.data);
}

export async function createCortesia(data: Partial<Cortesia>) {
  const response = await api.post('/admin/cortesias', data);
  return unwrapData<Cortesia>(response.data);
}

export async function cancelarCortesia(id: string) {
  const response = await api.patch(`/admin/cortesias/${id}/cancelar`);
  return unwrapData(response.data);
}
