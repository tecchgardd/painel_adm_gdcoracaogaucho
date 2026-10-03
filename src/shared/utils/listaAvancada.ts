/** Filtros de período e ordenação usados nas listas com busca avançada (Inscrições, Cortesias). */

export type PeriodoPreset = 'TODOS' | 'HOJE' | '7' | '30' | 'MES' | 'ANO' | 'PERSONALIZADO';

export const PERIODO_OPTIONS: { value: PeriodoPreset; label: string }[] = [
  { value: 'TODOS', label: 'Qualquer data' },
  { value: 'HOJE', label: 'Hoje' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: 'MES', label: 'Este mês' },
  { value: 'ANO', label: 'Este ano' },
  { value: 'PERSONALIZADO', label: 'Personalizado…' }
];

export type Intervalo = { inicio?: Date; fim?: Date };

/** "31/12/2026" -> Date (meia-noite local); vazio ou inválido -> undefined. */
export function parseDataBr(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, dd, mm, yyyy] = match.map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  return date.getDate() === dd && date.getMonth() === mm - 1 ? date : undefined;
}

/** Intervalo do preset. Personalizado usa as datas digitadas (dd/mm/aaaa), com o fim incluindo o dia inteiro. */
export function intervaloDoPeriodo(preset: PeriodoPreset, personalizado: { de?: string; ate?: string } = {}, agora = new Date()): Intervalo {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const fimDoDia = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  switch (preset) {
    case 'HOJE': return { inicio: hoje, fim: fimDoDia(hoje) };
    case '7': return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6), fim: fimDoDia(hoje) };
    case '30': return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29), fim: fimDoDia(hoje) };
    case 'MES': return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim: fimDoDia(hoje) };
    case 'ANO': return { inicio: new Date(hoje.getFullYear(), 0, 1), fim: fimDoDia(hoje) };
    case 'PERSONALIZADO': {
      const inicio = personalizado.de ? parseDataBr(personalizado.de) : undefined;
      const fim = personalizado.ate ? parseDataBr(personalizado.ate) : undefined;
      return { inicio, fim: fim ? fimDoDia(fim) : undefined };
    }
    default: return {};
  }
}

/** Sem data no registro: só aparece quando não há filtro de período. */
export function dentroDoIntervalo(value: unknown, intervalo: Intervalo) {
  if (!intervalo.inicio && !intervalo.fim) return true;
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  if (intervalo.inicio && date < intervalo.inicio) return false;
  if (intervalo.fim && date > intervalo.fim) return false;
  return true;
}

export type Ordenacao = 'RECENTES' | 'ANTIGAS' | 'MODIFICADAS' | 'NOME';

export const ORDENACAO_OPTIONS: { value: Ordenacao; label: string }[] = [
  { value: 'RECENTES', label: 'Mais recentes' },
  { value: 'ANTIGAS', label: 'Mais antigas' },
  { value: 'MODIFICADAS', label: 'Modificadas recentemente' },
  { value: 'NOME', label: 'Nome (A–Z)' }
];

function tempo(value: unknown) {
  const time = value ? new Date(String(value)).getTime() : NaN;
  return Number.isNaN(time) ? -Infinity : time;
}

/** Ordena sem alterar a lista original. Registros sem data vão para o fim. */
export function ordenar<T>(rows: T[], ordenacao: Ordenacao, campos: { criado: (row: T) => unknown; modificado: (row: T) => unknown; nome: (row: T) => string }) {
  const copia = [...rows];
  switch (ordenacao) {
    case 'ANTIGAS': return copia.sort((a, b) => {
      const ta = tempo(campos.criado(a));
      const tb = tempo(campos.criado(b));
      if (ta === -Infinity) return 1;
      if (tb === -Infinity) return -1;
      return ta - tb;
    });
    case 'MODIFICADAS': return copia.sort((a, b) => tempo(campos.modificado(b) ?? campos.criado(b)) - tempo(campos.modificado(a) ?? campos.criado(a)));
    case 'NOME': return copia.sort((a, b) => campos.nome(a).localeCompare(campos.nome(b), 'pt-BR'));
    default: return copia.sort((a, b) => tempo(campos.criado(b)) - tempo(campos.criado(a)));
  }
}
