import { api, unwrapData } from '@/core/api/client';
import type { PerfilAcesso, UserRole } from '@/shared/types/entities';

export type PerfilPayload = {
  nome: string;
  descricao?: string;
  permissoes: string[];
  /** Tipo de acesso antigo equivalente, para o backend que ainda confere `role`. */
  role: UserRole;
};

function normalizePerfil(raw: any): PerfilAcesso {
  return {
    id: String(raw?.id ?? ''),
    nome: String(raw?.nome ?? raw?.name ?? 'Perfil sem nome'),
    descricao: raw?.descricao ?? raw?.description ?? undefined,
    permissoes: Array.isArray(raw?.permissoes) ? raw.permissoes.map(String) : Array.isArray(raw?.permissions) ? raw.permissions.map(String) : [],
    sistema: Boolean(raw?.sistema ?? raw?.system),
    role: raw?.role ? String(raw.role).toUpperCase() as UserRole : undefined,
    usuarios: typeof raw?.usuarios === 'number' ? raw.usuarios : typeof raw?._count?.colaboradores === 'number' ? raw._count.colaboradores : undefined,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt
  };
}

export async function listPerfis() {
  const response = await api.get('/admin/perfis');
  return (unwrapData<any[]>(response.data) ?? []).map(normalizePerfil);
}

export async function createPerfil(data: PerfilPayload) {
  const response = await api.post('/admin/perfis', data);
  return normalizePerfil(unwrapData<any>(response.data));
}

export async function updatePerfil(id: string, data: PerfilPayload) {
  const response = await api.put(`/admin/perfis/${id}`, data);
  return normalizePerfil(unwrapData<any>(response.data));
}

export async function deletePerfil(id: string) {
  await api.delete(`/admin/perfis/${id}`);
}
