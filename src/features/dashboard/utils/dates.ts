function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function parse(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Sábado, 3 de outubro" */
export function formatLongToday(now = new Date()) {
  const text = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Hoje", "Amanhã", "Em 3 dias", "Há 2 dias" (por dia de calendário, não por 24h). */
export function relativeDayLabel(value?: string | null, now = new Date()) {
  const date = parse(value);
  if (!date) return null;
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days === -1) return 'Ontem';
  return days > 0 ? `Em ${days} dias` : `Há ${-days} dias`;
}

/** "sáb., 10 de out. · 21:00" */
export function formatEventDate(value?: string | null) {
  const date = parse(value);
  if (!date) return null;
  const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function formatTime(value?: string | null) {
  const date = parse(value);
  return date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
}
