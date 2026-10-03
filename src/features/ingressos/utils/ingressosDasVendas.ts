import type { Sale } from '@/shared/types/entities';

/** Status da venda -> status de ingresso, para vendas que não trazem os ingressos individualmente. */
const STATUS_DA_VENDA: Record<string, string> = {
  PAGO: 'ATIVO',
  CORTESIA: 'ATIVO',
  PARCIALMENTE_ESTORNADO: 'ATIVO',
  PENDENTE: 'PENDENTE',
  PROCESSANDO: 'PENDENTE',
  CANCELADO: 'CANCELADO',
  EXPIRADO: 'CANCELADO',
  ESTORNADO: 'CANCELADO',
  FALHOU: 'CANCELADO'
};

export function vendaTemIngressos(sale: Sale) {
  return sale.tipo !== 'CURSO';
}

/** Ingressos individuais que a venda já traz (detalhe da venda: `raw.ingressos` ou o lote). */
export function ingressosDaVenda(sale: Sale) {
  return (sale.raw?.ingressos ?? sale.raw?.loteIngresso?.tickets ?? []) as any[];
}

/**
 * Monta ingressos (no formato aceito por `normalizeIngresso`) a partir das vendas de evento/baile.
 * Usado enquanto `GET /admin/ingressos` não devolve os ingressos vendidos. Quando a venda não traz os
 * ingressos individualmente, gera um por unidade com o código da venda — o mesmo que o documento usa —
 * marcado como `sintetico` (só consulta: sem id próprio, não dá para trocar portador nem cancelar).
 */
export function ingressosDasVendas(sales: Sale[]) {
  return sales.filter(vendaTemIngressos).flatMap((sale) => {
    const evento = sale.raw?.evento ?? { id: sale.eventoId, nome: sale.eventoNome };
    const comprador = { nome: sale.nome, cpf: sale.cpf, telefone: sale.telefone };
    const base = { evento, customer: comprador, vendaId: sale.id };
    const reais = ingressosDaVenda(sale);
    if (reais.length) {
      return reais.map((ticket) => ({
        ...base,
        ...ticket,
        id: ticket.id,
        codigo: ticket.codigo ?? ticket.qrcode,
        status: ticket.status ?? STATUS_DA_VENDA[sale.status] ?? 'ATIVO',
        portadorNome: ticket.portadorNome ?? ticket.alunoNome
      }));
    }
    const quantidade = Math.max(1, Number(sale.quantidade) || 1);
    return Array.from({ length: quantidade }, (_, index) => ({
      ...base,
      id: `venda-${sale.id}-${index + 1}`,
      codigo: `${sale.codigo}${index ? `-${index + 1}` : ''}`,
      status: STATUS_DA_VENDA[sale.status] ?? 'PENDENTE',
      sintetico: true
    }));
  });
}
