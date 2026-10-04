import type { SessionUser, UserRole } from '@/shared/types/entities';

import { MODULOS, PERMISSAO_TOTAL, perfilPadraoDoRole, ROTAS_LIVRES, TODAS_PERMISSOES } from './catalogo';

/**
 * Normaliza uma lista de permissões: expande `*` para todas e garante `<modulo>.ver` quando o perfil
 * tem qualquer outra ação do módulo (não faz sentido criar algo numa tela que não se pode abrir).
 */
export function normalizarPermissoes(permissoes: readonly string[]): string[] {
  if (permissoes.includes(PERMISSAO_TOTAL)) return [...TODAS_PERMISSOES];
  const conjunto = new Set(permissoes.filter((chave) => TODAS_PERMISSOES.includes(chave)));
  conjunto.forEach((chave) => conjunto.add(`${chave.split('.')[0]}.ver`));
  return TODAS_PERMISSOES.filter((chave) => conjunto.has(chave));
}

/**
 * Permissões efetivas do usuário logado: as do perfil mandadas pelo backend na sessão
 * (`permissoes` ou `perfil.permissoes`) ou, enquanto o backend não manda, as do perfil padrão do `role`.
 */
export function permissoesDoUsuario(user?: SessionUser | null, role?: UserRole | null): string[] {
  if (!user) return [];
  const explicitas = user.permissoes ?? user.perfil?.permissoes;
  if (Array.isArray(explicitas)) return normalizarPermissoes(explicitas);
  return normalizarPermissoes(perfilPadraoDoRole(role)?.permissoes ?? []);
}

export function pode(permissoes: readonly string[], chave: string) {
  return permissoes.includes(chave);
}

function normalizarRota(pathname: string) {
  return (pathname.replace('/(admin)', '').split('?')[0] || '/').replace(/\/$/, '') || '/';
}

export function moduloDaRota(pathname: string) {
  const rota = normalizarRota(pathname);
  return MODULOS.find((modulo) => modulo.rotas.includes(rota));
}

/** Rotas sem módulo (ajuda, perfil...) ficam liberadas; as demais exigem `<modulo>.ver`. */
export function rotaPermitida(permissoes: readonly string[], pathname: string) {
  const rota = normalizarRota(pathname);
  if (ROTAS_LIVRES.includes(rota)) return true;
  const modulo = moduloDaRota(rota);
  return !modulo || pode(permissoes, `${modulo.chave}.ver`);
}

/** Para onde mandar quem abriu uma tela sem permissão: a primeira tela que o perfil pode ver. */
export function rotaInicial(permissoes: readonly string[]) {
  if (pode(permissoes, 'dashboard.ver')) return '/dashboard';
  if (pode(permissoes, 'checkin.ver')) return '/scanner';
  const modulo = MODULOS.find((item) => pode(permissoes, `${item.chave}.ver`));
  return modulo?.rotas[0] ?? '/perfil';
}

/** Nome do perfil para exibir (sidebar, menu): o do backend ou, sem perfis no backend, o equivalente ao `role`. */
export function nomeDoPerfil(user?: SessionUser | null, role?: UserRole | null) {
  return user?.perfil?.nome ?? perfilPadraoDoRole(role)?.nome ?? null;
}
