import { describe, expect, it } from 'vitest';

import type { Sale } from '@/shared/types/entities';

import { authenticationCode, buildTemplateDocument, fitText, receiptRows, TEMPLATE_SIZES } from './documentTemplates';

function buildSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: '1', codigo: 'VEN-1', tipo: 'CURSO', status: 'PAGO', nome: 'Gabriel Souza', cpf: '12000079999',
    quantidade: 1, valorUnitario: 30, valorTotal: 30, desconto: 0, createdAt: '2026-08-01T00:00:00.000Z',
    eventoNome: 'Curso de Danças Gaúchas',
    ...overrides
  } as Sale;
}

describe('fitText', () => {
  it('mantém o tamanho quando cabe e reduz quando não cabe', () => {
    expect(fitText('Ana', 400, 24, 'sans')).toEqual({ text: 'Ana', size: 24 });
    const long = fitText('Maria Aparecida dos Santos Ferreira', 300, 24, 'sans');
    expect(long.size).toBeLessThan(24);
  });

  it('corta com reticências quando nem o tamanho mínimo cabe', () => {
    const fitted = fitText('x'.repeat(200), 200, 24, 'sans');
    expect(fitted.text.endsWith('…')).toBe(true);
    expect(fitted.text.length).toBeLessThan(200);
  });

  it('usa traço para valores vazios', () => {
    expect(fitText('   ', 100, 20, 'sans').text).toBe('-');
  });
});

describe('buildTemplateDocument', () => {
  it('mantém todos os textos, marcas e o QR dentro da arte', () => {
    const sale = buildSale({ raw: { inscricoes: [{ id: 1, nomePar: 'Maria', semPar: false }], items: [{ description: 'A', quantity: 1, unitPrice: 10, total: 10 }, { description: 'B', quantity: 2, unitPrice: 5, total: 10 }, { description: 'C', quantity: 1, unitPrice: 10, total: 10 }] } as any });
    (['registration', 'ticket', 'receipt'] as const).forEach((kind) => {
      const doc = buildTemplateDocument(kind, sale, 0, 3);
      const { width, height } = TEMPLATE_SIZES[kind];
      [...doc.texts, ...doc.marks.map((mark) => ({ ...mark, width: mark.size, height: mark.size })), { ...doc.qr, width: doc.qr.size, height: doc.qr.size }].forEach((box) => {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y + box.height).toBeLessThanOrEqual(height);
      });
    });
  });

  it('inscrição marca "Sim" e mostra o par quando há par, senão marca "Não"', () => {
    const withPair = buildTemplateDocument('registration', buildSale({ raw: { inscricoes: [{ id: 1, nomePar: 'Maria', semPar: false }] } as any }));
    expect(withPair.marks[0].x).toBe(253);
    expect(withPair.texts.some((item) => item.text === 'Par: Maria')).toBe(true);
    const alone = buildTemplateDocument('registration', buildSale());
    expect(alone.marks[0].x).toBe(392);
    expect(alone.texts.some((item) => item.text.startsWith('Par:'))).toBe(false);
  });

  it('ingresso usa o código do ingresso no QR e numera quando há vários', () => {
    const sale = buildSale({ raw: { ingressos: [{ id: 1, qrcode: 'QR-A' }, { id: 2, qrcode: 'QR-B' }] } as any });
    const second = buildTemplateDocument('ticket', sale, 1, 2);
    expect(second.qr.value).toBe('QR-B');
    expect(second.texts.some((item) => item.text === 'Ingresso 2 de 2')).toBe(true);
    expect(buildTemplateDocument('ticket', sale, 0, 1).texts.some((item) => item.text.startsWith('Ingresso '))).toBe(false);
  });
});

describe('receiptRows', () => {
  it('resume itens além do primeiro na segunda linha', () => {
    const sale = buildSale({ raw: { items: [{ description: 'Ingresso', quantity: 1, unitPrice: 50, total: 50 }, { description: 'Camiseta', quantity: 2, unitPrice: 40, total: 80 }, { description: 'Boné', quantity: 1, unitPrice: 30, total: 30 }] } as any, valorTotal: 160 });
    const rows = receiptRows(sale);
    expect(rows).toHaveLength(2);
    expect(rows[1].description).toBe('Mais 2 itens');
    expect(rows[1].quantity).toBe('3');
  });

  it('com um item só, a segunda linha mostra o desconto', () => {
    const rows = receiptRows(buildSale({ valorUnitario: 50, valorTotal: 40, raw: { items: [{ description: 'Curso', quantity: 1, unitPrice: 50, total: 50 }] } as any }));
    expect(rows[1].description).toBe('Desconto');
    expect(rows[1].total.startsWith('- ')).toBe(true);
  });
});

describe('authenticationCode', () => {
  it('gera blocos de 4 caracteres estáveis', () => {
    expect(authenticationCode('VEN-1 1 receipt')).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(authenticationCode('abc')).toBe(authenticationCode('abc'));
  });
});
