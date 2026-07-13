import { api, unwrapData } from './api';
import type { Inscricao } from '@/types/entities';

function normalizeInscricao(inscricao: any): Inscricao {
  const customer = inscricao.customer ?? {};
  const evento = inscricao.evento ?? {};
  return {
    ...inscricao,
    id: String(inscricao.id),
    customerId: inscricao.customerId ? String(inscricao.customerId) : undefined,
    cursoId: inscricao.eventoId ? String(inscricao.eventoId) : undefined,
    nome: inscricao.nome ?? customer.nome ?? '',
    cpf: inscricao.cpf ?? customer.cpf ?? '',
    telefone: inscricao.telefone ?? customer.telefone ?? '',
    email: inscricao.email ?? customer.email ?? '',
    cidade: inscricao.cidade ?? customer.cidade ?? '',
    cursoCidadeAnterior: inscricao.observacao ?? '',
    courseId: evento.nome ?? String(inscricao.eventoId ?? ''),
    quantidadeParticipantes: inscricao.quantidadeParticipantes ?? 1,
    quantidadePadrinhosEsperada: inscricao.quantidadePadrinhosEsperada ?? 2,
    quantidadePadrinhosCadastrada: inscricao.quantidadePadrinhosCadastrada ?? 0,
    padrinhosStatus: inscricao.padrinhosStatus ?? 'PENDENTE',
    padrinhos: Array.isArray(inscricao.padrinhos) ? inscricao.padrinhos : []
  };
}

export async function listInscricoes() {
  const response = await api.get('/admin/inscricoes');
  return unwrapData<any[]>(response.data).map(normalizeInscricao);
}

export async function getInscricao(id: string) {
  const response = await api.get(`/admin/inscricoes/${id}`);
  return normalizeInscricao(unwrapData<any>(response.data));
}

export async function createInscricao(data: Partial<Inscricao>) {
  const response = await api.post('/admin/inscricoes', data);
  return normalizeInscricao(unwrapData<any>(response.data));
}

export async function updateInscricao(id: string, data: Partial<Inscricao>) {
  const response = await api.put(`/admin/inscricoes/${id}`, data);
  return normalizeInscricao(unwrapData<any>(response.data));
}

export async function updateStatus(id: string, status: string) {
  const response = await api.patch(`/admin/inscricoes/${id}/status`, { status });
  return normalizeInscricao(unwrapData<any>(response.data));
}

export async function deleteInscricao(id: string) {
  const response = await api.delete(`/admin/inscricoes/${id}`);
  return unwrapData(response.data);
}
