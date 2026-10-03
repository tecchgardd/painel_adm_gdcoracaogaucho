import { describe, expect, it } from 'vitest';

import { normalizeHistorico, normalizePessoa, podeExcluirPessoa } from './pessoa';

describe('normalizePessoa', () => {
  it('deriva aluno e comprador das contagens', () => {
    const pessoa = normalizePessoa({ id: 3, name: 'Ana', status: 'ATIVO', _count: { inscricoes: 1, vendas: 0 } });
    expect(pessoa).toMatchObject({ id: '3', nome: 'Ana', ativo: true, aluno: true, comprador: false });
  });

  it('sem contagem, deixa o tipo indefinido e respeita INATIVO', () => {
    const pessoa = normalizePessoa({ id: 1, nome: 'Bia', status: 'INATIVO' });
    expect(pessoa.aluno).toBeUndefined();
    expect(pessoa.ativo).toBe(false);
  });
});

describe('normalizeHistorico', () => {
  it('aceita objeto agrupado e ordena do mais recente', () => {
    const historico = normalizeHistorico({ data: {
      vendas: [{ id: 1, createdAt: '2026-08-01', evento: { nome: 'Baile' }, valorTotal: 60, status: 'PAGO' }],
      inscricoes: [{ id: 2, createdAt: '2026-09-01', curso: { nome: 'Curso Iniciante' }, status: 'CONFIRMADO' }]
    } });
    expect(historico.map((item) => item.titulo)).toEqual(['Inscrição · Curso Iniciante', 'Compra · Baile']);
    expect(historico[1].valor).toBe(60);
  });

  it('aceita lista de eventos com tipo', () => {
    const historico = normalizeHistorico([{ id: 9, tipo: 'cortesia', eventoNome: 'Baile do Laço', createdAt: '2026-10-01' }]);
    expect(historico[0]).toMatchObject({ tipo: 'CORTESIA', titulo: 'Cortesia · Baile do Laço' });
  });

  it('formato desconhecido vira lista vazia', () => {
    expect(normalizeHistorico(null)).toEqual([]);
  });
});

describe('podeExcluirPessoa', () => {
  it('só sem histórico', () => {
    expect(podeExcluirPessoa([])).toBe(true);
    expect(podeExcluirPessoa(normalizeHistorico([{ id: 1, tipo: 'VENDA' }]))).toBe(false);
  });
});
