import { describe, expect, it } from 'vitest';
import { getEventInfo, getReceiptTotals, getRegistrationFields } from './documentUtils';
import type { Sale } from '@/types/entities';

function buildSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: '1', codigo: 'VEN-1', tipo: 'CURSO', status: 'PAGO', nome: 'Gabriel', cpf: '12000079999',
    quantidade: 1, valorUnitario: 30, valorTotal: 30, desconto: 0, createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  } as Sale;
}

describe('getRegistrationFields pair info', () => {
  it('reports temPar true and the partner name when the inscricao has one', () => {
    const sale = buildSale({ raw: { inscricoes: [{ id: 1, nomePar: 'Maria Silva', semPar: false }] } });
    const fields = getRegistrationFields(sale);
    expect(fields.temPar).toBe(true);
    expect(fields.parNome).toBe('Maria Silva');
  });

  it('reports temPar false when semPar is true or there is no inscricao', () => {
    expect(getRegistrationFields(buildSale({ raw: { inscricoes: [{ id: 1, semPar: true }] } })).temPar).toBe(false);
    expect(getRegistrationFields(buildSale({ raw: undefined })).temPar).toBe(false);
  });
});

describe('getEventInfo observacao', () => {
  it('forwards the event observacao when present', () => {
    const sale = buildSale({ raw: { evento: { id: '1', nome: 'Curso', observacao: 'Apresente este comprovante no primeiro dia de aula.' } } });
    expect(getEventInfo(sale).observacao).toBe('Apresente este comprovante no primeiro dia de aula.');
  });

  it('is undefined when the event has no observacao', () => {
    const sale = buildSale({ raw: { evento: { id: '1', nome: 'Curso' } } });
    expect(getEventInfo(sale).observacao).toBeUndefined();
  });
});

describe('getReceiptTotals', () => {
  it('labels a positive gap between valorTotal and the items subtotal as a service fee', () => {
    const sale = buildSale({ valorTotal: 38.5, raw: { items: [{ description: 'Ingresso', quantity: 1, unitPrice: 35, total: 35 }] } });
    const totals = getReceiptTotals(sale);
    expect(totals.subtotal).toBe(35);
    expect(totals.ajusteLabel).toBe('Taxa de serviço');
    expect(totals.ajusteValor).toBe(3.5);
  });

  it('labels a negative gap as a discount and omits the label when there is no gap', () => {
    expect(getReceiptTotals(buildSale({ valorTotal: 90, raw: { items: [{ description: 'Item', quantity: 1, unitPrice: 100, total: 100 }] } })).ajusteLabel).toBe('Desconto');
    expect(getReceiptTotals(buildSale({ valorTotal: 50, raw: { items: [{ description: 'Item', quantity: 1, unitPrice: 50, total: 50 }] } })).ajusteLabel).toBeNull();
  });
});
