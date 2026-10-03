import { describe, expect, it } from 'vitest';

import { buscaIngresso, nomeDoPortador, normalizeIngresso, podeTrocarPortador, situacaoDoIngresso } from './ingresso';

describe('situacaoDoIngresso', () => {
  it('traduz os status da API para as quatro situações da portaria', () => {
    expect(situacaoDoIngresso('ATIVO')).toBe('LIBERADO');
    expect(situacaoDoIngresso('PENDENTE')).toBe('RESERVADO');
    expect(situacaoDoIngresso('UTILIZADO')).toBe('UTILIZADO');
    expect(situacaoDoIngresso('EXPIRADO')).toBe('CANCELADO');
  });

  it('data de validação vale como utilizado, mas cancelado continua cancelado', () => {
    expect(situacaoDoIngresso('ATIVO', '2026-10-03T21:00:00Z')).toBe('UTILIZADO');
    expect(situacaoDoIngresso('CANCELADO', '2026-10-03T21:00:00Z')).toBe('CANCELADO');
  });
});

describe('normalizeIngresso', () => {
  it('lê evento e comprador do lote quando não vêm no ingresso', () => {
    const ingresso = normalizeIngresso({ id: 7, qrcode: 'ING-7', status: 'ATIVO', lote: { evento: { id: 3, nome: 'Baile' }, customer: { nome: 'Ana', cpf: '1' }, origemFinanceira: 'CORTESIA' } });
    expect(ingresso).toMatchObject({ id: '7', codigo: 'ING-7', situacao: 'LIBERADO', cortesia: true, evento: { id: '3', nome: 'Baile' }, comprador: { nome: 'Ana' } });
  });

  it('sem portador, o nome exibido é o do comprador', () => {
    const semPortador = normalizeIngresso({ id: 1, customer: { nome: 'Ana' } });
    expect(nomeDoPortador(semPortador)).toBe('Ana');
    expect(nomeDoPortador(normalizeIngresso({ id: 1, customer: { nome: 'Ana' }, portadorNome: 'Bia' }))).toBe('Bia');
  });
});

describe('regras', () => {
  it('portador só muda antes da entrada', () => {
    expect(podeTrocarPortador(normalizeIngresso({ id: 1, status: 'ATIVO' }))).toBe(true);
    expect(podeTrocarPortador(normalizeIngresso({ id: 1, status: 'UTILIZADO' }))).toBe(false);
    expect(podeTrocarPortador(normalizeIngresso({ id: 1, status: 'CANCELADO' }))).toBe(false);
  });

  it('busca ignora acentos e cobre código, pessoas e evento', () => {
    const ingresso = normalizeIngresso({ id: 1, codigo: 'ING-AB12', evento: { nome: 'Baile da Primavera' }, customer: { nome: 'João' } });
    expect(buscaIngresso(ingresso, 'joao')).toBe(true);
    expect(buscaIngresso(ingresso, 'ab12')).toBe(true);
    expect(buscaIngresso(ingresso, 'primavera')).toBe(true);
    expect(buscaIngresso(ingresso, 'curso')).toBe(false);
  });
});
