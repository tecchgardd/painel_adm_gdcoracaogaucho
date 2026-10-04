/** Definição de colunas para exportar listas em CSV/PDF; o operador escolhe quais entram. */
export type ExportColumn<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number | boolean | null | undefined;
  /** Marcada por padrão no modal de exportação. */
  padrao?: boolean;
  /** Peso de largura no PDF (padrão 1). */
  peso?: number;
};

export function textoDaCelula(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value).replace(/\s+/g, ' ').trim();
}

function celulaCsv(value: string) {
  // Aspas quando há separador, aspas ou quebra; e neutraliza fórmulas (=, +, -, @) ao abrir no Excel.
  const seguro = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[";\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** CSV com ";" (padrão do Excel em português) e BOM para manter acentos. */
export function gerarCsv<T>(rows: T[], columns: ExportColumn<T>[]) {
  const header = columns.map((column) => celulaCsv(column.label)).join(';');
  const lines = rows.map((row) => columns.map((column) => celulaCsv(textoDaCelula(column.value(row)))).join(';'));
  return `\uFEFF${[header, ...lines].join('\r\n')}`;
}

export function nomeDoArquivo(base: string, extensao: 'csv' | 'pdf', agora = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const slug = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}-${pad(agora.getHours())}${pad(agora.getMinutes())}.${extensao}`;
}

/** Data e hora legíveis na planilha/PDF ("03/10/2026 15:30"); vazio quando não há data. */
export function dataHora(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** CPF completo formatado (o relatório é interno; na tela o CPF continua mascarado). */
export function cpfFormatado(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 11 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` : String(value ?? '');
}

const STATUS_ROTULOS: Record<string, string> = {
  ATIVO: 'Ativo', ATIVA: 'Ativa', PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', CONFIRMADA: 'Confirmada',
  CANCELADO: 'Cancelado', CANCELADA: 'Cancelada', COMPLETO: 'Completo', UTILIZADO: 'Utilizado', EXPIRADO: 'Expirado'
};

/** Rótulo em português para status da API; desconhecidos viram "Primeira maiúscula". */
export function rotuloStatus(value: unknown) {
  const key = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!key) return '';
  return STATUS_ROTULOS[key] ?? key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');
}
