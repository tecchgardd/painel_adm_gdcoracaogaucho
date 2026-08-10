import { colors } from './theme';

export const buttonTones = {
  red: { bg: colors.red, border: colors.red, text: '#FFFFFF' },
  green: { bg: colors.green, border: colors.green, text: '#FFFFFF' },
  dark: { bg: 'transparent', border: colors.border, text: colors.text },
  soft: { bg: colors.card, border: colors.border, text: colors.text }
} as const;

export type ButtonTone = keyof typeof buttonTones;

export const statusTones: Record<string, string> = {
  ATIVO: colors.green,
  PAGO: colors.green,
  CONFIRMADO: colors.green,
  ENTREGUE: colors.green,
  PENDENTE: colors.amber,
  FUTURO: colors.amber,
  PROCESSANDO: colors.blue,
  FALHOU: '#D32F2F',
  CANCELADO: '#666666',
  EXPIRADO: '#D66A00',
  ESTORNADO: '#7137A8',
  PARCIALMENTE_ESTORNADO: '#9B6BC0',
  CONTESTADO: '#D84B20',
  CONTESTACAO_PERDIDA: '#8B1010',
  CORTESIA: colors.goldAccent
};
