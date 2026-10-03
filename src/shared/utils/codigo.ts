/**
 * Código de ingresso e de inscrição: até 8 caracteres, só letras e números (A–Z, 0–9), em maiúsculas.
 * É o mesmo valor gravado no QR Code e o que o operador digita na portaria. Quem gera é o backend
 * (ver docs/backend/2026-10-03-modulo-comercial.md); o painel só normaliza e valida.
 */
export const CODIGO_MAX = 8;

export const CODIGO_PATTERN = /^[A-Z0-9]{1,8}$/;

/** Para a digitação: maiúsculas, sem espaços/hífens/acentos, cortado em 8. */
export function normalizeCodigo(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODIGO_MAX);
}

export function isCodigoValido(value: string) {
  return CODIGO_PATTERN.test(value);
}
