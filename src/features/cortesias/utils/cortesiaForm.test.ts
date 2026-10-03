import { describe, expect, it } from 'vitest';

import { buildCortesiaPayload, emptyCortesiaForm, responsavelNome, validateCortesia } from './cortesiaForm';

const valid = { ...emptyCortesiaForm, cpf: '123.456.789-09', pessoaId: '5', eventoId: '3', quantidade: '2', motivo: 'Convidado da diretoria do CTG' };

describe('validateCortesia', () => {
  it('aceita um formulário completo', () => {
    expect(validateCortesia(valid)).toEqual({});
  });

  it('exige motivo com pelo menos 10 caracteres', () => {
    expect(validateCortesia({ ...valid, motivo: 'amigo' }).motivo).toBeDefined();
  });

  it('pede o nome quando a pessoa não foi encontrada', () => {
    expect(validateCortesia({ ...valid, pessoaId: undefined, nome: '' }).nome).toBeDefined();
    expect(validateCortesia({ ...valid, pessoaId: undefined, nome: 'Ana Souza' }).nome).toBeUndefined();
  });

  it('limita a quantidade por emissão', () => {
    expect(validateCortesia({ ...valid, quantidade: '0' }).quantidade).toBeDefined();
    expect(validateCortesia({ ...valid, quantidade: '21' }).quantidade).toBeDefined();
    expect(validateCortesia({ ...valid, quantidade: '1.5' }).quantidade).toBeDefined();
  });
});

describe('buildCortesiaPayload', () => {
  it('envia CPF só com dígitos, quantidade numérica e motivo limpo', () => {
    expect(buildCortesiaPayload({ ...valid, motivo: '  Convidado da diretoria  ' }, '5')).toEqual({ customerId: '5', cpf: '12345678909', eventoId: '3', quantidade: 2, motivo: 'Convidado da diretoria' });
  });
});

describe('responsavelNome', () => {
  it('aceita texto ou objeto', () => {
    expect(responsavelNome('Fran')).toBe('Fran');
    expect(responsavelNome({ nome: 'Fran' })).toBe('Fran');
    expect(responsavelNome(null)).toBeUndefined();
  });
});
