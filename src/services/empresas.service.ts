import { api, unwrapData } from './api';
export type Empresa = { id: string; nome: string; imagemUrl: string; ativo: boolean; publicado: boolean; ordem: number; createdAt: string };
export type EmpresaInput = { nome: string; imagem?: File; ativo?: boolean; publicado?: boolean; ordem?: number };
function body(input: EmpresaInput) { const data = new FormData(); data.append('nome', input.nome); data.append('ativo', String(input.ativo ?? true)); data.append('publicado', String(input.publicado ?? true)); data.append('ordem', String(input.ordem ?? 0)); if (input.imagem) data.append('imagem', input.imagem); return data; }
export async function listEmpresas() { const response = await api.get('/admin/empresas?limit=100'); const value = unwrapData<{ data?: Empresa[] } | Empresa[]>(response.data); return Array.isArray(value) ? value : value.data ?? []; }
export async function createEmpresa(input: EmpresaInput) { return unwrapData<Empresa>((await api.post('/admin/empresas', body(input), { headers: { 'Content-Type': 'multipart/form-data' } })).data); }
export async function updateEmpresa(id: string, input: EmpresaInput) { return unwrapData<Empresa>((await api.patch(`/admin/empresas/${id}`, body(input), { headers: { 'Content-Type': 'multipart/form-data' } })).data); }
export async function deleteEmpresa(id: string) { await api.delete(`/admin/empresas/${id}`); }
