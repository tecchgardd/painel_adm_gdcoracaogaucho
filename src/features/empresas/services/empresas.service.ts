import { api, unwrapData } from '@/core/api/client';

export type EmpresaTipo = 'PATROCINADOR' | 'APOIADOR' | 'PARCEIRO';

export type Empresa = {
  id: string;
  nome: string;
  imagemUrl: string;
  ativo: boolean;
  publicado: boolean;
  ordem: number;
  createdAt: string;
  /** Campos novos (docs/backend/2026-10-03-cadastros.md); a API atual pode não devolvê-los. */
  tipo?: EmpresaTipo;
  link?: string | null;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
};

/** Na web é um `File`; no app, o arquivo escolhido na galeria. */
export type EmpresaImagem = File | { uri: string; name: string; type: string };

export type EmpresaInput = {
  nome: string;
  imagem?: EmpresaImagem;
  ativo?: boolean;
  publicado?: boolean;
  ordem?: number;
  tipo?: EmpresaTipo;
  link?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
};

function body(input: EmpresaInput) {
  const data = new FormData();
  data.append('nome', input.nome);
  data.append('ativo', String(input.ativo ?? true));
  data.append('publicado', String(input.publicado ?? true));
  data.append('ordem', String(input.ordem ?? 0));
  if (input.tipo) data.append('tipo', input.tipo);
  // Campos opcionais vão vazios quando limpos, para a API remover o valor anterior.
  data.append('link', input.link ?? '');
  data.append('vigenciaInicio', input.vigenciaInicio ?? '');
  data.append('vigenciaFim', input.vigenciaFim ?? '');
  if (input.imagem) data.append('imagem', input.imagem as any);
  return data;
}

export async function listEmpresas() {
  const response = await api.get('/admin/empresas?limit=100');
  const value = unwrapData<{ data?: Empresa[] } | Empresa[]>(response.data);
  return Array.isArray(value) ? value : value.data ?? [];
}

export async function createEmpresa(input: EmpresaInput) {
  return unwrapData<Empresa>((await api.post('/admin/empresas', body(input))).data);
}

export async function updateEmpresa(id: string, input: EmpresaInput) {
  return unwrapData<Empresa>((await api.patch(`/admin/empresas/${id}`, body(input))).data);
}

export async function deleteEmpresa(id: string) {
  await api.delete(`/admin/empresas/${id}`);
}
