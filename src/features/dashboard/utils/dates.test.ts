import { describe, expect, it } from 'vitest';

import { formatLongToday, formatTime, relativeDayLabel } from './dates';

describe('dashboard dates', () => {
  const now = new Date(2026, 9, 3, 23, 30);

  it('conta dias de calendário, não janelas de 24h', () => {
    expect(relativeDayLabel(new Date(2026, 9, 4, 0, 15).toISOString(), now)).toBe('Amanhã');
    expect(relativeDayLabel(new Date(2026, 9, 3, 8, 0).toISOString(), now)).toBe('Hoje');
    expect(relativeDayLabel(new Date(2026, 9, 6, 20, 0).toISOString(), now)).toBe('Em 3 dias');
    expect(relativeDayLabel(new Date(2026, 9, 1, 20, 0).toISOString(), now)).toBe('Há 2 dias');
  });

  it('tolera datas ausentes ou inválidas', () => {
    expect(relativeDayLabel(undefined, now)).toBeNull();
    expect(relativeDayLabel('não é data', now)).toBeNull();
    expect(formatTime(null)).toBeNull();
  });

  it('capitaliza o dia da semana', () => {
    expect(formatLongToday(now)).toMatch(/^[A-ZÀ-Ú]/);
  });
});
