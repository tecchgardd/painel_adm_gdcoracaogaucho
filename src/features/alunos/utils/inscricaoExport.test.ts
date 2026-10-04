import { describe, expect, it } from 'vitest';

import { gerarCsv } from '@/shared/utils/exportacao';

import { INSCRICAO_COLUMNS, enderecoCompleto, nomesPadrinhos } from './inscricaoExport';

const inscricao = {
  id: '42',
  nome: 'Ana Souza',
  cpf: '12345678901',
  status: 'CONFIRMADO',
  courseId: 'Dança de Salão — Turma A',
  semPar: false,
  nomePar: 'Bruno',
  rua: 'Rua A',
  numero: '10',
  bairro: 'Centro',
  cep: '90000-000',
  padrinhos: [{ nome: 'Carlos' }, { nome: '' }, { nome: 'Dora' }],
  quantidadePadrinhosEsperada: 2,
  padrinhosStatus: 'COMPLETO',
  createdAt: '2026-09-01T12:00:00'
};

describe('colunas de exportação das inscrições', () => {
  const coluna = (key: string) => INSCRICAO_COLUMNS.find((column) => column.key === key)!;

  it('formata CPF, status, padrinhos e endereço', () => {
    expect(coluna('cpf').value(inscricao)).toBe('123.456.789-01');
    expect(coluna('status').value(inscricao)).toBe('Confirmado');
    expect(nomesPadrinhos(inscricao)).toBe('Carlos, Dora');
    expect(enderecoCompleto(inscricao)).toBe('Rua A, 10 - Centro - 90000-000');
    expect(coluna('padrinhosStatus').value(inscricao)).toBe('Completo (2/2)');
  });

  it('sem par e datas vazias', () => {
    expect(coluna('par').value({ ...inscricao, semPar: true })).toBe('Sem par');
    expect(coluna('modificado').value(inscricao)).toBe('');
    expect(String(coluna('criado').value(inscricao))).toMatch(/^01\/09\/2026 12:00$/);
  });

  it('chaves únicas e colunas padrão definidas', () => {
    const keys = INSCRICAO_COLUMNS.map((column) => column.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(INSCRICAO_COLUMNS.filter((column) => column.padrao).length).toBeGreaterThan(4);
    expect(gerarCsv([inscricao], INSCRICAO_COLUMNS).split('\r\n')).toHaveLength(2);
  });
});
