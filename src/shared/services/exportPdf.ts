import type { PDFFont, PDFPage } from 'pdf-lib';
// @ts-expect-error entrada ESM usada para evitar problemas do Metro Web
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib/dist/pdf-lib.esm.js';

import { textoDaCelula, type ExportColumn } from '@/shared/utils/exportacao';

/**
 * Relatório em tabela (A4 paisagem): título, filtros aplicados, cabeçalho repetido em cada página,
 * quebra de texto nas células e rodapé com paginação. Carregado só na hora de exportar (pdf-lib é pesado).
 */
const PAGE = { width: 842, height: 595, margin: 32 };
const FONT_SIZE = 8;
const LINE = 10.5;
const MAX_LINES = 4;
const INK = rgb(0.09, 0.23, 0.17);
const MUTED = rgb(0.4, 0.4, 0.4);
const HEADER_BG = rgb(0.09, 0.23, 0.17);
const ZEBRA = rgb(0.96, 0.95, 0.92);

function encodable(font: PDFFont, value: string) {
  const supported = new Set(font.getCharacterSet());
  return Array.from(value).map((char) => (supported.has(char.codePointAt(0) ?? 0) ? char : '?')).join('');
}

/** Quebra o texto em linhas que cabem na largura; corta com "…" além de MAX_LINES. */
function quebrar(font: PDFFont, text: string, width: number) {
  const words = encodable(font, text).split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, FONT_SIZE) <= width) { current = candidate; continue; }
    if (current) lines.push(current);
    // Palavra maior que a coluna (e-mail, código): corta por caracteres.
    let rest = word;
    while (font.widthOfTextAtSize(rest, FONT_SIZE) > width && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), FONT_SIZE) > width) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  }
  if (current) lines.push(current);
  if (lines.length > MAX_LINES) {
    const kept = lines.slice(0, MAX_LINES);
    kept[MAX_LINES - 1] = `${kept[MAX_LINES - 1].slice(0, -1)}…`;
    return kept;
  }
  return lines.length ? lines : [''];
}

export async function gerarPdfTabela<T>({ titulo, subtitulo, columns, rows }: { titulo: string; subtitulo?: string; columns: ExportColumn<T>[]; rows: T[] }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const usable = PAGE.width - PAGE.margin * 2;
  const totalPeso = columns.reduce((sum, column) => sum + (column.peso ?? 1), 0);
  const widths = columns.map((column) => (usable * (column.peso ?? 1)) / totalPeso);
  const pages: PDFPage[] = [];
  let page: PDFPage;
  let y = 0;

  function header() {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    pages.push(page);
    y = PAGE.height - PAGE.margin;
    if (pages.length === 1) {
      page.drawText(encodable(bold, titulo), { x: PAGE.margin, y: y - 14, size: 16, font: bold, color: INK });
      y -= 22;
      if (subtitulo) {
        page.drawText(encodable(regular, subtitulo), { x: PAGE.margin, y: y - 10, size: 9, font: regular, color: MUTED, maxWidth: usable });
        y -= 16;
      }
      y -= 8;
    }
    const headLines = columns.map((column, index) => quebrar(bold, column.label, widths[index] - 8));
    const headHeight = Math.max(...headLines.map((lines) => lines.length)) * LINE + 8;
    page.drawRectangle({ x: PAGE.margin, y: y - headHeight, width: usable, height: headHeight, color: HEADER_BG });
    let x = PAGE.margin;
    headLines.forEach((lines, index) => {
      lines.forEach((line, lineIndex) => page.drawText(line, { x: x + 4, y: y - 11 - lineIndex * LINE, size: FONT_SIZE, font: bold, color: rgb(1, 1, 1) }));
      x += widths[index];
    });
    y -= headHeight;
  }

  header();
  rows.forEach((row, rowIndex) => {
    const cells = columns.map((column, index) => quebrar(regular, textoDaCelula(column.value(row)), widths[index] - 8));
    const height = Math.max(...cells.map((lines) => lines.length)) * LINE + 6;
    if (y - height < PAGE.margin + 18) header();
    if (rowIndex % 2 === 1) page.drawRectangle({ x: PAGE.margin, y: y - height, width: usable, height, color: ZEBRA });
    let x = PAGE.margin;
    cells.forEach((lines, index) => {
      lines.forEach((line, lineIndex) => page.drawText(line, { x: x + 4, y: y - 10 - lineIndex * LINE, size: FONT_SIZE, font: regular, color: rgb(0.1, 0.1, 0.1) }));
      x += widths[index];
    });
    y -= height;
  });

  if (!rows.length) page!.drawText('Nenhum registro com os filtros aplicados.', { x: PAGE.margin, y: y - 16, size: 10, font: regular, color: MUTED });

  const geradoEm = new Date().toLocaleString('pt-BR');
  pages.forEach((current, index) => {
    current.drawText(encodable(regular, `Coração Gaúcho · ${titulo} · gerado em ${geradoEm}`), { x: PAGE.margin, y: 16, size: 7, font: regular, color: MUTED });
    const label = `Página ${index + 1} de ${pages.length}`;
    current.drawText(encodable(regular, label), { x: PAGE.width - PAGE.margin - regular.widthOfTextAtSize(label, 7), y: 16, size: 7, font: regular, color: MUTED });
  });

  return pdf.saveAsBase64();
}
