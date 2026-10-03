import type { Customer } from '@/shared/types/entities';

/**
 * Pessoa = cliente e/ou aluno. É o mesmo cadastro (tabela `customers`, chave CPF): "aluno" é quem tem
 * inscrição em curso; "comprador" é quem tem compra de ingresso. Os dois papéis podem coexistir.
 */
export type PessoaView = {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  ativo: boolean;
  /** `undefined` quando a API não informa (o filtro por tipo vai para a API nesse caso). */
  aluno?: boolean;
  comprador?: boolean;
  raw: Customer & Record<string, any>;
};

function count(raw: any, ...keys: string[]) {
  for (const key of keys) {
    const value = raw?.[key] ?? raw?._count?.[key];
    if (Array.isArray(value)) return value.length;
    if (value !== undefined && value !== null) return Number(value) || 0;
  }
  return undefined;
}

export function normalizePessoa(raw: any): PessoaView {
  const inscricoes = count(raw, 'inscricoes', 'totalInscricoes', 'inscricoesCount');
  const compras = count(raw, 'vendas', 'pedidos', 'totalCompras', 'comprasCount');
  return {
    id: String(raw?.id ?? ''),
    nome: raw?.nome ?? raw?.name ?? 'Sem nome',
    cpf: raw?.cpf ?? undefined,
    telefone: raw?.telefone ?? raw?.phone ?? undefined,
    email: raw?.email ?? undefined,
    cidade: raw?.cidade ?? undefined,
    estado: raw?.estado ?? undefined,
    ativo: String(raw?.status ?? 'ATIVO').toUpperCase() !== 'INATIVO',
    aluno: raw?.aluno ?? raw?.isAluno ?? (inscricoes === undefined ? undefined : inscricoes > 0),
    comprador: raw?.comprador ?? (compras === undefined ? undefined : compras > 0),
    raw
  };
}

export type HistoricoTipo = 'VENDA' | 'INGRESSO' | 'INSCRICAO' | 'CORTESIA' | 'PAGAMENTO' | 'OUTRO';

export type HistoricoItem = {
  id: string;
  tipo: HistoricoTipo;
  titulo: string;
  data?: string;
  status?: string;
  valor?: number;
  codigo?: string;
};

const TIPO_POR_CHAVE: Record<string, HistoricoTipo> = {
  vendas: 'VENDA', pedidos: 'VENDA', compras: 'VENDA',
  ingressos: 'INGRESSO', inscricoes: 'INSCRICAO', cortesias: 'CORTESIA', pagamentos: 'PAGAMENTO'
};

function toItem(item: any, tipo: HistoricoTipo, index: number): HistoricoItem {
  const evento = item?.evento ?? item?.curso ?? {};
  const nomeEvento = evento.nome ?? item?.eventoNome ?? item?.cursoNome ?? item?.descricao ?? item?.description;
  const titulos: Record<HistoricoTipo, string> = {
    VENDA: `Compra${nomeEvento ? ` · ${nomeEvento}` : ''}`,
    INGRESSO: `Ingresso${nomeEvento ? ` · ${nomeEvento}` : ''}`,
    INSCRICAO: `Inscrição${nomeEvento ? ` · ${nomeEvento}` : ''}`,
    CORTESIA: `Cortesia${nomeEvento ? ` · ${nomeEvento}` : ''}`,
    PAGAMENTO: 'Pagamento',
    OUTRO: item?.titulo ?? item?.descricao ?? 'Atividade'
  };
  const valor = item?.valorTotal ?? item?.total ?? item?.valor ?? item?.amount;
  return {
    id: String(item?.id ?? `${tipo}-${index}`),
    tipo,
    titulo: titulos[tipo],
    data: item?.createdAt ?? item?.data ?? item?.date ?? undefined,
    status: item?.status ?? undefined,
    valor: valor !== undefined && valor !== null ? Number(valor) : undefined,
    codigo: item?.codigo ?? item?.code ?? item?.qrcode ?? undefined
  };
}

/** Aceita lista de eventos (`[{ tipo, ... }]`) ou objeto agrupado (`{ vendas: [], inscricoes: [] }`). Mais recente primeiro. */
export function normalizeHistorico(payload: unknown): HistoricoItem[] {
  const value = (payload as { data?: unknown })?.data ?? payload;
  let items: HistoricoItem[] = [];
  if (Array.isArray(value)) {
    items = value.map((item: any, index) => {
      const tipo = String(item?.tipo ?? item?.type ?? '').toUpperCase();
      return toItem(item, (['VENDA', 'INGRESSO', 'INSCRICAO', 'CORTESIA', 'PAGAMENTO'].includes(tipo) ? tipo : 'OUTRO') as HistoricoTipo, index);
    });
  } else if (value && typeof value === 'object') {
    items = Object.entries(value as Record<string, unknown>).flatMap(([key, list]) => {
      const tipo = TIPO_POR_CHAVE[key];
      return tipo && Array.isArray(list) ? list.map((item, index) => toItem(item, tipo, index)) : [];
    });
  }
  return items.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
}

/** Quem já tem histórico não é apagado: é inativado, para preservar vendas e inscrições. */
export function podeExcluirPessoa(historico: HistoricoItem[]) {
  return historico.length === 0;
}
