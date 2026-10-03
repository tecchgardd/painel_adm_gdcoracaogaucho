import { describe, expect, it } from 'vitest';

import type { Sale } from '@/shared/types/entities';

import { normalizeIngresso } from './ingresso';
import { ingressosDasVendas } from './ingressosDasVendas';

function sale(overrides: Partial<Sale>): Sale {
  return { id: '1', codigo: 'K7Q2MX9P', tipo: 'BAILE', status: 'PAGO', nome: 'Gabriel', cpf: '12007279916', quantidade: 1, valorUnitario: 1, valorTotal: 1, desconto: 0, createdAt: '2026-08-09T21:46:00Z', eventoNome: 'Baile do Ano', ...overrides } as Sale;
}

describe('ingressosDasVendas', () => {
  it('usa os ingressos individuais da venda, com evento e comprador da venda', () => {
    const [ingresso] = ingressosDasVendas([sale({ raw: { evento: { id: '9', nome: 'Baile do Ano' } as any, ingressos: [{ id: 33, qrcode: 'A4F7KQ2M', status: 'ATIVO' }] } })]).map(normalizeIngresso);
    expect(ingresso).toMatchObject({ id: '33', codigo: 'A4F7KQ2M', situacao: 'LIBERADO', vendaId: '1', evento: { nome: 'Baile do Ano' }, comprador: { nome: 'Gabriel' } });
    expect(ingresso.raw.sintetico).toBeUndefined();
  });

  it('sem ingressos individuais, gera um por unidade com o código da venda (só consulta)', () => {
    const ingressos = ingressosDasVendas([sale({ quantidade: 2 })]).map(normalizeIngresso);
    expect(ingressos.map((item) => item.codigo)).toEqual(['K7Q2MX9P', 'K7Q2MX9P-2']);
    expect(ingressos.every((item) => item.raw.sintetico)).toBe(true);
    expect(ingressos[0].situacao).toBe('LIBERADO');
  });

  it('situação acompanha a venda e cursos ficam de fora', () => {
    const lista = ingressosDasVendas([
      sale({ id: '2', status: 'PENDENTE' }),
      sale({ id: '3', status: 'ESTORNADO' }),
      sale({ id: '4', tipo: 'CURSO' })
    ]).map(normalizeIngresso);
    expect(lista.map((item) => item.situacao)).toEqual(['RESERVADO', 'CANCELADO']);
  });
});
