import { describe, expect, it } from 'vitest';

import { CORTESIA_COLUMNS } from './cortesiaExport';

const coluna = (key: string) => CORTESIA_COLUMNS.find((column) => column.key === key)!;

describe('colunas de exportação das cortesias', () => {
  it('lê responsável em texto ou objeto e situação padrão', () => {
    expect(coluna('responsavel').value({ id: '1', responsavel: { nome: 'Gabriel' } })).toBe('Gabriel');
    expect(coluna('responsavel').value({ id: '1', responsavel: 'Maria' })).toBe('Maria');
    expect(coluna('status').value({ id: '1' })).toBe('Ativo');
    expect(coluna('quantidade').value({ id: '1' })).toBe(1);
  });

  it('nome e código com variantes da API', () => {
    expect(coluna('nome').value({ id: '1', beneficiario: 'João' })).toBe('João');
    expect(coluna('codigo').value({ id: '1', ingressos: [{ codigo: 'AB12CD34' }, { codigo: 'EF56GH78' }] })).toBe('AB12CD34, EF56GH78');
  });
});
