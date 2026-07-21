import { api, unwrapData } from './api';

export type GerarLotePayload = {
  cpf: string;
  valorUnitario: number;
  dataLimite?: string;
  observacoes?: string;
};

export async function listIngressos(params?: Record<string, string>) {
  const response = await api.get('/admin/ingressos', { params });
  return unwrapData<any[]>(response.data);
}

export async function listLotesIngressos(params?: Record<string, string>) {
  const response = await api.get('/admin/ingressos/lotes', { params });
  return unwrapData<any[]>(response.data);
}

export async function getIngresso(id: string) {
  const response = await api.get(`/admin/ingressos/${id}`);
  return unwrapData<any>(response.data);
}

export async function getLoteIngresso(id: string) {
  const response = await api.get(`/admin/ingressos/lotes/${id}`);
  return unwrapData<any>(response.data);
}

export async function buscarInscricaoPorCpf(cpf: string) {
  const response = await api.get(`/admin/ingressos/inscricao/cpf/${cpf.replace(/\D/g, '')}`);
  return unwrapData<any>(response.data);
}

export async function gerarLoteIngressos(data: GerarLotePayload) {
  const response = await api.post('/admin/ingressos/lotes', data);
  return unwrapData<any>(response.data);
}

export async function atualizarIngresso(id: string, data: Record<string, unknown>) {
  const response = await api.patch(`/admin/ingressos/${id}`, data);
  return unwrapData<any>(response.data);
}

export async function atualizarLote(id: string, data: Record<string, unknown>) {
  const response = await api.patch(`/admin/ingressos/lotes/${id}`, data);
  return unwrapData<any>(response.data);
}

export async function registrarPagamentoLote(id: string, data: Record<string, unknown> = { paymentStatus: 'PAGO' }) {
  const response = await api.post(`/admin/ingressos/lotes/${id}/pagamento`, data);
  return unwrapData<any>(response.data);
}

export async function gerarLinkPagamentoLote(id: string) {
  const response = await api.post(`/admin/ingressos/lotes/${id}/link-pagamento`);
  return unwrapData<{ checkoutUrl: string; shareText: string; lote: any; pagamento: any }>(response.data);
}

export async function anexarComprovante(loteId: string, file: File) {
  const formData = new FormData();
  formData.append('comprovante', file, file.name);
  const response = await api.post(`/admin/ingressos/lotes/${loteId}/comprovante`, formData);
  return unwrapData<any>(response.data);
}
