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
