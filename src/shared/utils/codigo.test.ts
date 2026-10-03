import { describe, expect, it } from 'vitest';

import { isCodigoValido, normalizeCodigo } from './codigo';

describe('código de ingresso/inscrição', () => {
  it('normaliza a digitação para até 8 caracteres alfanuméricos em maiúsculas', () => {
    expect(normalizeCodigo('ab-12 cd')).toBe('AB12CD');
    expect(normalizeCodigo('wpp-92ea56b292b3')).toBe('WPP92EA5');
    expect(normalizeCodigo('ção9')).toBe('CAO9');
  });

  it('aceita só 1 a 8 caracteres A-Z/0-9', () => {
    expect(isCodigoValido('K7Q2MX9P')).toBe(true);
    expect(isCodigoValido('K7Q2MX9P1')).toBe(false);
    expect(isCodigoValido('WPP-92EA')).toBe(false);
    expect(isCodigoValido('abc12345')).toBe(false);
    expect(isCodigoValido('')).toBe(false);
  });
});
