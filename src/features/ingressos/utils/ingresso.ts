/** Situação do ingresso na portaria, independente do financeiro da venda. */
export type IngressoSituacao = 'RESERVADO' | 'LIBERADO' | 'UTILIZADO' | 'CANCELADO';

export type IngressoView = {
  id: string;
  codigo: string;
  situacao: IngressoSituacao;
  cortesia: boolean;
  evento: { id?: string; nome: string; data?: string };
  comprador: { nome?: string; cpf?: string; telefone?: string };
  /** Quem usa o ingresso; sem portador informado, vale o comprador. */
  portador: { nome?: string; cpf?: string };
  vendaId?: string;
  validadoEm?: string;
  validadoPor?: string;
  /** Montado a partir da venda (sem registro próprio na API): só consulta. */
  sintetico: boolean;
  raw: any;
};

export const SITUACAO_LABELS: Record<IngressoSituacao, string> = {
  RESERVADO: 'Reservado',
  LIBERADO: 'Liberado',
  UTILIZADO: 'Utilizado',
  CANCELADO: 'Cancelado'
};

const SITUACAO_POR_STATUS: Record<string, IngressoSituacao> = {
  PENDENTE: 'RESERVADO', RESERVADO: 'RESERVADO', AGUARDANDO_PAGAMENTO: 'RESERVADO', PROCESSANDO: 'RESERVADO',
  ATIVO: 'LIBERADO', LIBERADO: 'LIBERADO', VALIDO: 'LIBERADO', PAGO: 'LIBERADO', EMITIDO: 'LIBERADO', CORTESIA: 'LIBERADO',
  UTILIZADO: 'UTILIZADO', VALIDADO: 'UTILIZADO', USADO: 'UTILIZADO',
  CANCELADO: 'CANCELADO', EXPIRADO: 'CANCELADO', ESTORNADO: 'CANCELADO', REEMBOLSADO: 'CANCELADO'
};

export function situacaoDoIngresso(status: unknown, validadoEm?: unknown): IngressoSituacao {
  const situacao = SITUACAO_POR_STATUS[String(status ?? '').toUpperCase()];
  if (situacao === 'CANCELADO') return situacao;
  if (validadoEm) return 'UTILIZADO';
  return situacao ?? 'LIBERADO';
}

/** A API traz o ingresso com o evento/comprador no próprio registro, no lote ou na venda; aceita os três. */
export function normalizeIngresso(raw: any): IngressoView {
  const lote = raw?.lote ?? raw?.loteIngresso ?? {};
  const venda = raw?.venda ?? raw?.pedido ?? {};
  const evento = raw?.evento ?? lote.evento ?? venda.evento ?? {};
  const comprador = raw?.customer ?? raw?.comprador ?? lote.customer ?? venda.customer ?? {};
  const validadoEm = raw?.validadoEm ?? raw?.usedAt ?? raw?.checkinEm ?? undefined;
  const vendaId = raw?.vendaId ?? venda.id ?? raw?.pedidoId ?? lote.pedidoId;
  return {
    id: String(raw?.id ?? ''),
    codigo: String(raw?.codigo ?? raw?.qrcode ?? raw?.code ?? raw?.id ?? ''),
    situacao: situacaoDoIngresso(raw?.status, validadoEm),
    cortesia: Boolean(raw?.cortesia) || raw?.origem === 'CORTESIA' || lote.origemFinanceira === 'CORTESIA',
    evento: { id: evento.id != null ? String(evento.id) : undefined, nome: evento.nome ?? evento.name ?? 'Evento', data: evento.data ?? evento.date },
    comprador: { nome: comprador.nome ?? comprador.name, cpf: comprador.cpf, telefone: comprador.telefone ?? comprador.phone },
    portador: { nome: raw?.portadorNome ?? raw?.portador?.nome ?? raw?.nomePortador, cpf: raw?.portadorCpf ?? raw?.portador?.cpf },
    vendaId: vendaId != null ? String(vendaId) : undefined,
    validadoEm,
    validadoPor: raw?.validadoPor?.nome ?? raw?.validadoPorNome ?? undefined,
    sintetico: Boolean(raw?.sintetico),
    raw
  };
}

export function nomeDoPortador(ingresso: IngressoView) {
  return ingresso.portador.nome || ingresso.comprador.nome || 'Portador não informado';
}

/** Portador só pode ser trocado antes da entrada e com o ingresso válido. */
export function podeTrocarPortador(ingresso: IngressoView) {
  return !ingresso.sintetico && (ingresso.situacao === 'LIBERADO' || ingresso.situacao === 'RESERVADO');
}

export function buscaIngresso(ingresso: IngressoView, termo: string) {
  const alvo = `${ingresso.codigo} ${ingresso.portador.nome ?? ''} ${ingresso.portador.cpf ?? ''} ${ingresso.comprador.nome ?? ''} ${ingresso.comprador.cpf ?? ''} ${ingresso.evento.nome}`;
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalize(alvo).includes(normalize(termo.trim()));
}
