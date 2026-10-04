import { MODULOS, PERFIS_PADRAO, PERMISSAO_TOTAL, chavesDoModulo, type ModuloPermissao } from '@/core/permissions/catalogo';
import { normalizarPermissoes } from '@/core/permissions/permissoes';
import type { PerfilPayload } from '@/features/perfis/services/perfis.service';
import type { PerfilAcesso, UserRole } from '@/shared/types/entities';

export type PerfilFormState = { id?: string; nome: string; descricao: string; permissoes: string[] };

/** Perfis exibidos enquanto o backend não tem `/admin/perfis` (somente leitura). */
export const PERFIS_LOCAIS: PerfilAcesso[] = PERFIS_PADRAO.map((perfil) => ({ ...perfil }));

export function toPerfilForm(perfil?: PerfilAcesso | null, copia = false): PerfilFormState {
  if (!perfil) return { nome: '', descricao: '', permissoes: ['dashboard.ver'] };
  return {
    id: copia ? undefined : perfil.id,
    nome: copia ? `${perfil.nome} (cópia)` : perfil.nome,
    descricao: perfil.descricao ?? '',
    permissoes: normalizarPermissoes(perfil.permissoes)
  };
}

/**
 * Marca ou desmarca uma permissão mantendo a matriz coerente: qualquer ação liga o "ver" do módulo,
 * e desligar o "ver" desliga o módulo inteiro.
 */
export function alternarPermissao(permissoes: readonly string[], chave: string, ativa: boolean) {
  const modulo = chave.split('.')[0];
  const conjunto = new Set(permissoes);
  if (ativa) {
    conjunto.add(chave);
    conjunto.add(`${modulo}.ver`);
  } else if (chave === `${modulo}.ver`) {
    [...conjunto].filter((item) => item.startsWith(`${modulo}.`)).forEach((item) => conjunto.delete(item));
  } else {
    conjunto.delete(chave);
  }
  return normalizarPermissoes([...conjunto]);
}

export function alternarModulo(permissoes: readonly string[], modulo: ModuloPermissao, ativo: boolean) {
  const chaves = chavesDoModulo(modulo);
  const sem = permissoes.filter((chave) => !chaves.includes(chave));
  return normalizarPermissoes(ativo ? [...sem, ...chaves] : sem);
}

export function estadoDoModulo(permissoes: readonly string[], modulo: ModuloPermissao): 'todos' | 'alguns' | 'nenhum' {
  const chaves = chavesDoModulo(modulo);
  const marcadas = chaves.filter((chave) => permissoes.includes(chave)).length;
  return marcadas === 0 ? 'nenhum' : marcadas === chaves.length ? 'todos' : 'alguns';
}

export function validatePerfil(form: PerfilFormState, existentes: PerfilAcesso[] = []) {
  const errors: Record<string, string> = {};
  const nome = form.nome.trim();
  if (nome.length < 3) errors.nome = 'Dê um nome com pelo menos 3 letras.';
  else if (existentes.some((perfil) => perfil.id !== form.id && perfil.nome.trim().toLowerCase() === nome.toLowerCase())) errors.nome = 'Já existe um perfil com esse nome.';
  if (!form.permissoes.length) errors.permissoes = 'Marque ao menos uma permissão.';
  return errors;
}

/**
 * Tipo de acesso antigo mais próximo do perfil, enviado junto para o backend que ainda confere `role`:
 * só check-in vira CHECKIN; o resto vira STAFF (ADMIN fica reservado ao perfil Administrador).
 */
export function roleCompativel(permissoes: readonly string[]): UserRole {
  if (permissoes.includes(PERMISSAO_TOTAL)) return 'ADMIN';
  return permissoes.length && permissoes.every((chave) => chave.startsWith('checkin.')) ? 'CHECKIN' : 'STAFF';
}

export function buildPerfilPayload(form: PerfilFormState): PerfilPayload {
  const permissoes = normalizarPermissoes(form.permissoes);
  return { nome: form.nome.trim(), descricao: form.descricao.trim() || undefined, permissoes, role: roleCompativel(permissoes) };
}

/** Resumo curto para o card: "12 permissões em 6 módulos". */
export function resumoPermissoes(permissoes: readonly string[]) {
  if (permissoes.includes(PERMISSAO_TOTAL)) return 'Acesso total';
  const efetivas = normalizarPermissoes(permissoes);
  const modulos = MODULOS.filter((modulo) => efetivas.includes(`${modulo.chave}.ver`)).length;
  return `${efetivas.length} permiss${efetivas.length === 1 ? 'ão' : 'ões'} em ${modulos} módulo${modulos === 1 ? '' : 's'}`;
}
