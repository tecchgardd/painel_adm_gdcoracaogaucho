export function formatCurrencyBRL(value?: number | string | null) {
  const amount = typeof value === 'string' ? Number(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) : Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function parseCurrencyInput(value?: string | number | null) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return Number(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
}

export function parseCurrencyToCents(value?: string | null) {
  if (!value) return 0;
  const normalized = value.trim().replace(/\s/g, '').replace(/^R\$/i, '');
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  const decimalAt = Math.max(comma, dot);
  const integer = (decimalAt >= 0 ? normalized.slice(0, decimalAt) : normalized).replace(/\D/g, '') || '0';
  const decimals = decimalAt >= 0 ? normalized.slice(decimalAt + 1).replace(/\D/g, '').slice(0, 2).padEnd(2, '0') : '00';
  return Number(integer) * 100 + Number(decimals);
}

export function maskCpf(value?: string | null) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return value ? '***.***.***-**' : '-';
  return `***.***.${digits.slice(6, 9)}-**`;
}
