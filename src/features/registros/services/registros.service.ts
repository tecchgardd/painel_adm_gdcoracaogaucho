import { api } from '@/core/api/client';
import type { RegistroAcao, RegistroAtividade, RegistroFiltros, RegistroPagina } from '@/features/registros/types';

const ACOES: RegistroAcao[] = ['CRIAR', 'ATUALIZAR', 'EXCLUIR', 'STATUS', 'LOGIN', 'LOGIN_FALHOU', 'LOGOUT', 'SENHA', 'PAGAMENTO', 'REEMBOLSO', 'VALIDACAO', 'EXPORTAR', 'OUTRO'];

// A API nem sempre normaliza PT/EN; aceita os dois formatos de ação.
const ACAO_ALIASES: Record<string, RegistroAcao> = {
  CREATE: 'CRIAR', UPDATE: 'ATUALIZAR', DELETE: 'EXCLUIR', REMOVER: 'EXCLUIR', STATUS_CHANGE: 'STATUS',
  SIGN_IN: 'LOGIN', SIGN_OUT: 'LOGOUT', LOGIN_FAILED: 'LOGIN_FALHOU', PASSWORD_RESET: 'SENHA', REFUND: 'REEMBOLSO',
  PAYMENT: 'PAGAMENTO', CHECKIN: 'VALIDACAO', EXPORT: 'EXPORTAR'
};

function toAcao(value: unknown): RegistroAcao {
  const key = String(value ?? '').toUpperCase();
  if ((ACOES as string[]).includes(key)) return key as RegistroAcao;
  return ACAO_ALIASES[key] ?? 'OUTRO';
}

function toAlteracoes(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item: any) => ({ campo: String(item?.campo ?? item?.field ?? '-'), antes: item?.antes ?? item?.before, depois: item?.depois ?? item?.after }));
  }
  // Também aceita { campo: { antes, depois } }.
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, any>).map(([campo, diff]) => ({ campo, antes: diff?.antes ?? diff?.before, depois: diff?.depois ?? diff?.after }));
  }
  return [];
}

export function normalizeRegistro(raw: any): RegistroAtividade {
  const user = raw?.autor ?? raw?.usuario ?? raw?.user ?? null;
  return {
    id: String(raw?.id ?? ''),
    createdAt: String(raw?.createdAt ?? raw?.data ?? raw?.timestamp ?? ''),
    autor: user ? {
      id: user.id != null ? String(user.id) : undefined,
      nome: String(user.nome ?? user.name ?? user.email ?? 'Usuário'),
      email: user.email,
      username: user.username,
      role: user.role,
      fotoUrl: user.fotoUrl ?? user.image ?? null
    } : null,
    acao: toAcao(raw?.acao ?? raw?.action),
    entidade: String(raw?.entidade ?? raw?.entity ?? 'SISTEMA').toUpperCase(),
    entidadeId: (raw?.entidadeId ?? raw?.entityId) != null ? String(raw?.entidadeId ?? raw?.entityId) : undefined,
    descricao: raw?.descricao ?? raw?.description ?? undefined,
    alteracoes: toAlteracoes(raw?.alteracoes ?? raw?.changes),
    ip: raw?.ip ?? undefined,
    userAgent: raw?.userAgent ?? undefined
  };
}

export async function listRegistros(filtros: RegistroFiltros = {}): Promise<RegistroPagina> {
  const page = filtros.page ?? 1;
  const limit = filtros.limit ?? 30;
  const params = { ...filtros, page, limit, acao: Array.isArray(filtros.acao) ? filtros.acao.join(',') : filtros.acao };
  try {
    const response = await api.get('/admin/registros', { params });
    const payload = response.data as any;
    const pageData = Array.isArray(payload?.data) ? payload : payload?.data ?? payload;
    const items = Array.isArray(pageData) ? pageData : pageData?.data ?? [];
    return {
      data: items.map(normalizeRegistro),
      total: Number(pageData?.total ?? items.length),
      page: Number(pageData?.page ?? page),
      limit: Number(pageData?.limit ?? limit)
    };
  } catch (error) {
    if ((error as { status?: number })?.status === 404) return { data: [], total: 0, page, limit, indisponivel: true };
    throw error;
  }
}
