import { api, unwrapData } from './api';
import type { Pedido } from '@/types';

function toApiType(type?: 'LOJA' | 'EVENTO' | 'STORE' | 'EVENT') {
  if (type === 'LOJA') return 'STORE';
  if (type === 'EVENTO') return 'EVENT';
  return type;
}

function normalizePedido(pedido: any): Pedido {
  const customer = pedido.customer ?? {};
  const evento = pedido.evento ?? {};
  const type = pedido.type === 'EVENT' ? 'EVENTO' : 'LOJA';
  return {
    id: String(pedido.id),
    tipo: type,
    cliente: pedido.cliente ?? customer.nome ?? '',
    cpf: pedido.cpf ?? customer.cpf,
    telefone: pedido.telefone ?? customer.telefone ?? '',
    total: Number(pedido.total ?? 0),
    status: pedido.status ?? 'PENDENTE',
    statusPagamento: pedido.paymentStatus ?? pedido.statusPagamento,
    formaPagamento: pedido.paymentMethod ?? pedido.formaPagamento,
    eventoId: pedido.eventId ? String(pedido.eventId) : undefined,
    eventoNome: pedido.eventoNome ?? evento.nome,
    eventoTipo: evento.tipo,
    cortesia: pedido.isCourtesy ?? pedido.cortesia,
    motivoCortesia: pedido.courtesyReason ?? pedido.motivoCortesia,
    responsavelCortesia: pedido.courtesyResponsible ?? pedido.responsavelCortesia,
    data: pedido.createdAt ?? pedido.data ?? '',
    itens: (pedido.items ?? pedido.itens ?? []).map((item: any) => ({
      nome: item.description ?? item.nome ?? 'Item',
      qtd: item.quantity ?? item.qtd ?? 1,
      valor: item.unitPrice ?? item.valor ?? 0,
      lote: item.lote
    }))
  };
}

export async function listPedidos(params?: { tipo?: 'LOJA' | 'EVENTO'; type?: 'STORE' | 'EVENT'; eventoId?: string; status?: string; cpf?: string; cliente?: string; data?: string }) {
  const response = await api.get('/admin/pedidos', { params: { ...params, type: toApiType(params?.type ?? params?.tipo), tipo: undefined } });
  return unwrapData<any[]>(response.data).map(normalizePedido);
}

export async function getPedido(id: string) {
  const response = await api.get(`/admin/pedidos/${id}`);
  return normalizePedido(unwrapData<any>(response.data));
}

export async function createPedido(data: Partial<Pedido>) {
  const response = await api.post('/admin/pedidos', data);
  return normalizePedido(unwrapData<any>(response.data));
}

export async function updatePedido(id: string, data: Partial<Pedido>) {
  const response = await api.patch(`/admin/pedidos/${id}`, data);
  return normalizePedido(unwrapData<any>(response.data));
}

export async function deletePedido(id: string) {
  const response = await api.delete(`/admin/pedidos/${id}`);
  return unwrapData(response.data);
}
