import { describe, expect, it } from 'vitest';
import { maskCpf, parseCurrencyToCents } from './format';

describe('parseCurrencyToCents', () => {
  it.each([['25,00', 2500], ['R$ 1.234,56', 123456], ['25.99', 2599], ['0', 0]])('converte %s sem ponto flutuante', (input, expected) => {
    expect(parseCurrencyToCents(input)).toBe(expected);
  });
});

describe('maskCpf', () => {
  it('não expõe o CPF completo', () => expect(maskCpf('12345678901')).toBe('***.***.789-**'));
});
