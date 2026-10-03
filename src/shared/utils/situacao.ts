/** "Já utilizado" / "JÁ_UTILIZADO" / "ja-utilizado" -> "JA_UTILIZADO" (a API mistura formatos). */
export function normalizeStatus(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/** Filtro de situação das listas: `TODAS`/`TODOS` não filtra; o resto compara o status normalizado. */
export function matchSituacao(status: unknown, filtro: string) {
  if (filtro === 'TODAS' || filtro === 'TODOS') return true;
  return normalizeStatus(status) === normalizeStatus(filtro);
}

export const EVENTO_SITUACOES = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'FUTURO', label: 'Futuros' },
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'ENCERRADO', label: 'Encerrados' },
  { value: 'CANCELADO', label: 'Cancelados' }
];
