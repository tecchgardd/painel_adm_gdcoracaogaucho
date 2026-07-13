import { api, unwrapData } from './api';
import type { Evento } from '@/types/entities';

export async function listEventos(params?: { tipo?: 'BAILE' | 'CURSO' | 'EVENTO'; status?: string; search?: string }) {
  const response = await api.get('/admin/eventos', { params });
  return unwrapData<Evento[]>(response.data);
}

export async function getEvento(id: string) {
  const response = await api.get(`/admin/eventos/${id}`);
  return unwrapData<Evento>(response.data);
}

export async function createEvento(data: Partial<Evento>) {
  const response = await api.post('/admin/eventos', data);
  return unwrapData<Evento>(response.data);
}

export async function updateEvento(id: string, data: Partial<Evento>) {
  const response = await api.put(`/admin/eventos/${id}`, data);
  return unwrapData<Evento>(response.data);
}

export async function deleteEvento(id: string) {
  const response = await api.delete(`/admin/eventos/${id}`);
  return unwrapData(response.data);
}
