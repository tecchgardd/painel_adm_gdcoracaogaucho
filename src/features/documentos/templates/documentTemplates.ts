import type { Sale } from '@/shared/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/shared/utils/format';
import {
  getDocumentCode,
  getEventInfo,
  getReceiptItems,
  getReceiptPaymentMethodLabel,
  getReceiptStatusLabel,
  getReceiptTotals,
  getRegistrationFields
} from '@/features/documentos/utils/documentUtils';

/**
 * Modelos de documento: a arte (assets/documents/*.jpg) traz cabeçalho, ilustrações, rótulos e linhas;
 * aqui ficam só os dados da venda e onde cada um entra, em pixels da arte. A pré-visualização (React
 * Native) e o PDF (pdf-lib) desenham a mesma lista, então os dois saem iguais.
 */
export type DocumentKind = 'ticket' | 'receipt' | 'registration';

export type TemplateFont = 'sans' | 'serif';

export type TemplateText = {
  text: string;
  /** Caixa onde o texto entra (px da arte); o texto fica centralizado na vertical. */
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  font: TemplateFont;
  align: 'left' | 'center' | 'right';
  color: string;
};

export type TemplateQr = { value: string; x: number; y: number; size: number };
export type TemplateMark = { x: number; y: number; size: number; color: string };

export type TemplateDocument = {
  kind: DocumentKind;
  width: number;
  height: number;
  texts: TemplateText[];
  qr: TemplateQr;
  marks: TemplateMark[];
};

export const TEMPLATE_SIZES: Record<DocumentKind, { width: number; height: number }> = {
  registration: { width: 1024, height: 1536 },
  ticket: { width: 1536, height: 1024 },
  receipt: { width: 1024, height: 1536 }
};

const INK = '#163A2B';
const INK_TITLE = '#12301F';
const WINE = '#7A1E1E';

/** Largura média aproximada de um caractere, em fração do tamanho da fonte (negrito). */
const CHAR_WIDTH: Record<TemplateFont, number> = { sans: 0.58, serif: 0.52 };

/** Reduz a fonte até caber na largura; abaixo do mínimo, corta com reticências. */
export function fitText(text: string, width: number, size: number, font: TemplateFont, minSize = Math.round(size * 0.6)) {
  const clean = text.replace(/\s+/g, ' ').trim() || '-';
  const fitsAt = (value: string, fontSize: number) => value.length * CHAR_WIDTH[font] * fontSize <= width;
  let current = size;
  while (current > minSize && !fitsAt(clean, current)) current -= 1;
  if (fitsAt(clean, current)) return { text: clean, size: current };
  const maxChars = Math.max(1, Math.floor(width / (CHAR_WIDTH[font] * current)) - 1);
  return { text: `${clean.slice(0, maxChars).trimEnd()}…`, size: current };
}

function text(value: unknown, box: Omit<TemplateText, 'text' | 'size' | 'font' | 'align' | 'color'> & Partial<Pick<TemplateText, 'size' | 'font' | 'align' | 'color'>>): TemplateText {
  const font = box.font ?? 'sans';
  const fitted = fitText(value === undefined || value === null || value === '' ? '-' : String(value), box.width, box.size ?? 24, font);
  return { align: 'left', color: INK, ...box, font, text: fitted.text, size: fitted.size };
}

function dateOnly(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('pt-BR') : '-';
}

function timeOnly(value?: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
}

/** Código curto de autenticação derivado da venda (estável para o mesmo documento). */
export function authenticationCode(seed: string) {
  const clean = seed.replace(/[^A-Z0-9]/gi, '').toUpperCase().padEnd(16, '0').slice(0, 16);
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
}

function registrationTemplate(sale: Sale): TemplateDocument {
  const fields = getRegistrationFields(sale);
  const event = getEventInfo(sale);
  const marks: TemplateMark[] = [fields.temPar ? { x: 253, y: 1081, size: 36, color: WINE } : { x: 392, y: 1081, size: 36, color: WINE }];
  const texts = [
    text(sale.nome, { x: 178, y: 746, width: 795, height: 36 }),
    text(maskCpf(sale.cpf), { x: 122, y: 806, width: 850, height: 36 }),
    text(event.name, { x: 143, y: 869, width: 830, height: 36 }),
    text(event.location, { x: 143, y: 934, width: 830, height: 36 }),
    text(dateOnly(fields.startDate), { x: 258, y: 1004, width: 250, height: 36, size: 22 }),
    text(fields.time ?? timeOnly(fields.startDate), { x: 664, y: 1004, width: 310, height: 36, size: 22 }),
    text(sale.codigo, { x: 532, y: 1178, width: 440, height: 36, size: 22 }),
    text(getReceiptStatusLabel(sale.status), { x: 564, y: 1268, width: 410, height: 36, size: 22 })
  ];
  if (fields.temPar && fields.parNome) texts.push(text(`Par: ${fields.parNome}`, { x: 520, y: 1080, width: 455, height: 38, size: 22 }));
  return { kind: 'registration', ...TEMPLATE_SIZES.registration, texts, marks, qr: { value: getDocumentCode(sale), x: 74, y: 1174, size: 196 } };
}

function ticketTemplate(sale: Sale, ticketIndex: number, ticketCount: number): TemplateDocument {
  const event = getEventInfo(sale);
  const code = getDocumentCode(sale, ticketIndex);
  const box = (x: number, y: number) => ({ x: x + 16, y: y + 2, width: 380, height: 44, size: 24 });
  const texts = [
    text(event.name, { x: 368, y: 574, width: 484, height: 72, size: 54, font: 'serif', align: 'center', color: INK_TITLE }),
    text(dateOnly(event.date), box(140, 680)),
    text(timeOnly(event.date), box(140, 746)),
    text(event.location, box(140, 811)),
    text(sale.nome, box(734, 680)),
    text(maskCpf(sale.cpf), box(734, 746)),
    text(formatCurrencyBRL(sale.valorUnitario), box(734, 811)),
    text(code, { x: 1226, y: 632, width: 278, height: 50, size: 24, align: 'center' })
  ];
  if (ticketCount > 1) texts.push(text(`Ingresso ${ticketIndex + 1} de ${ticketCount}`, { x: 1226, y: 520, width: 278, height: 30, size: 18, align: 'center', color: WINE }));
  return { kind: 'ticket', ...TEMPLATE_SIZES.ticket, texts, marks: [], qr: { value: code, x: 1240, y: 252, size: 250 } };
}

type ReceiptRow = { description: string; quantity: string; total: string };

/** A tabela do cupom tem duas linhas: a 2ª resume itens extras ou mostra desconto/taxa. */
export function receiptRows(sale: Sale): ReceiptRow[] {
  const items = getReceiptItems(sale);
  const rows: ReceiptRow[] = items.slice(0, 1).map((item) => ({ description: item.description, quantity: String(item.quantity), total: formatCurrencyBRL(item.total) }));
  if (items.length === 2) {
    rows.push({ description: items[1].description, quantity: String(items[1].quantity), total: formatCurrencyBRL(items[1].total) });
  } else if (items.length > 2) {
    const rest = items.slice(1);
    rows.push({
      description: `Mais ${rest.length} itens`,
      quantity: String(rest.reduce((sum, item) => sum + item.quantity, 0)),
      total: formatCurrencyBRL(rest.reduce((sum, item) => sum + item.total, 0))
    });
  } else {
    const { ajusteLabel, ajusteValor } = getReceiptTotals(sale);
    if (ajusteLabel) rows.push({ description: ajusteLabel, quantity: '', total: `${ajusteLabel === 'Desconto' ? '- ' : ''}${formatCurrencyBRL(ajusteValor)}` });
  }
  return rows;
}

function receiptTemplate(sale: Sale): TemplateDocument {
  const rows = receiptRows(sale);
  const texts = [
    text(sale.codigo, { x: 239, y: 548, width: 725, height: 36 }),
    text(formatDateTime(sale.createdAt), { x: 140, y: 596, width: 825, height: 36 }),
    text(sale.nome, { x: 239, y: 647, width: 725, height: 36 }),
    text(maskCpf(sale.cpf), { x: 136, y: 697, width: 830, height: 36 }),
    ...rows.flatMap((row, index) => {
      const y = 816 + index * 57;
      return [
        text(row.description, { x: 74, y, width: 480, height: 52, size: 22 }),
        ...(row.quantity ? [text(row.quantity, { x: 570, y, width: 160, height: 52, size: 22, align: 'center' })] : []),
        text(row.total, { x: 736, y, width: 220, height: 52, size: 22, align: 'right' })
      ];
    }),
    text(formatCurrencyBRL(sale.valorTotal), { x: 430, y: 958, width: 500, height: 44, size: 38, font: 'serif', color: INK_TITLE }),
    text(getReceiptPaymentMethodLabel(sale), { x: 332, y: 1038, width: 632, height: 36 }),
    text(authenticationCode(`${sale.codigo}${sale.id}receipt`), { x: 242, y: 1092, width: 722, height: 36, size: 22 })
  ];
  return { kind: 'receipt', ...TEMPLATE_SIZES.receipt, texts, marks: [], qr: { value: `${sale.codigo}|${sale.id}`, x: 81, y: 1171, size: 190 } };
}

export function buildTemplateDocument(kind: DocumentKind, sale: Sale, ticketIndex = 0, ticketCount = 1): TemplateDocument {
  if (kind === 'ticket') return ticketTemplate(sale, ticketIndex, ticketCount);
  if (kind === 'receipt') return receiptTemplate(sale);
  return registrationTemplate(sale);
}

export function ticketCountOf(sale: Sale) {
  return Math.max(sale.raw?.ingressos?.length ?? 0, sale.raw?.loteIngresso?.tickets?.length ?? 0, 1);
}
