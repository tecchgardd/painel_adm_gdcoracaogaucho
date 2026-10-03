import { describe, expect, it } from 'vitest';

import {
  buildColaboradorPayload,
  emptyColaboradorForm,
  normalizeUsername,
  suggestUsername,
  toColaboradorForm,
  validateColaborador
} from './colaboradorForm';

const valid = { ...emptyColaboradorForm, nome: 'Maria Fernandes', cpf: '123.456.789-09', email: 'Maria@CG.com', username: 'maria.fernandes' };

describe('username', () => {
  it('sugere primeiro.último sem acentos', () => {
    expect(suggestUsername('Maria Aparecida Fernandes')).toBe('maria.fernandes');
    expect(suggestUsername('João')).toBe('joao');
    expect(suggestUsername('   ')).toBe('');
  });

  it('normaliza o que for digitado para o formato aceito', () => {
    expect(normalizeUsername('Gonçalo Silva!')).toBe('goncalo.silva');
  });

  it('exige usuário válido', () => {
    expect(validateColaborador(valid).username).toBeUndefined();
    expect(validateColaborador({ ...valid, username: 'ab' }).username).toBeDefined();
    expect(validateColaborador({ ...valid, username: 'Maria Silva' }).username).toBeDefined();
  });
});

describe('buildColaboradorPayload', () => {
  it('envia usuário em minúsculas e e-mail normalizado', () => {
    const payload = buildColaboradorPayload(valid);
    expect(payload).toMatchObject({ email: 'maria@cg.com', username: 'maria.fernandes', cpf: '12345678909' });
  });

  it('foto: envia a URL, null quando removida e nada quando não mudou', () => {
    expect(buildColaboradorPayload({ ...valid, fotoUrl: 'https://img/1.jpg' }).fotoUrl).toBe('https://img/1.jpg');
    expect(buildColaboradorPayload({ ...valid, fotoUrl: '', fotoRemovida: true }).fotoUrl).toBeNull();
    expect('fotoUrl' in buildColaboradorPayload(valid)).toBe(false);
  });

  it('só envia senha na criação', () => {
    expect(buildColaboradorPayload({ ...valid, generateTemporaryPassword: false, password: '12345678' }).password).toBe('12345678');
    expect(buildColaboradorPayload({ ...valid, id: '1', generateTemporaryPassword: false, password: '12345678' }).password).toBeUndefined();
  });
});

describe('toColaboradorForm', () => {
  it('lê usuário e foto também do usuário vinculado', () => {
    const form = toColaboradorForm({ id: '7', nome: 'Ana', user: { id: 'u', username: 'ana.s', image: 'https://img/a.jpg' } });
    expect(form.username).toBe('ana.s');
    expect(form.fotoUrl).toBe('https://img/a.jpg');
  });
});
