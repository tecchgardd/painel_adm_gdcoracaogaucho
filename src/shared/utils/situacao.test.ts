import { describe, expect, it } from 'vitest';

import { matchSituacao, normalizeStatus } from './situacao';

describe('situação', () => {
  it('normaliza acentos, espaços e caixa', () => {
    expect(normalizeStatus('JÁ_UTILIZADO')).toBe('JA_UTILIZADO');
    expect(normalizeStatus('já utilizado')).toBe('JA_UTILIZADO');
    expect(normalizeStatus(undefined)).toBe('');
  });

  it('TODAS não filtra; o resto compara normalizado', () => {
    expect(matchSituacao('ATIVO', 'TODAS')).toBe(true);
    expect(matchSituacao('Válido', 'VALIDO')).toBe(true);
    expect(matchSituacao('CANCELADO', 'ATIVO')).toBe(false);
  });
});
