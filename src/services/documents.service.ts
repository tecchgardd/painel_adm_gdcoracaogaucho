import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import QRCode from 'qrcode';
import { Linking, Platform } from 'react-native';
import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, maskCpf } from '@/utils/format';

export type SaleDocumentKind = 'ticket' | 'receipt';
const burgundy = rgb(0.39, 0.08, 0.08);
const gold = rgb(0.88, 0.63, 0.18);
const ink = rgb(0.08, 0.08, 0.08);
const muted = rgb(0.38, 0.38, 0.38);
const paper = rgb(0.985, 0.975, 0.955);

function dateParts(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: '-', time: '-' };
  return { date: date.toLocaleDateString('pt-BR'), time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
}

function cleanFilePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function fitText(value: unknown, max = 44) {
  const text = String(value ?? '-');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function ticketData(sale: Sale, ticketIndex: number) {
  const event = sale.raw?.evento;
  const ticket = sale.raw?.ingressos?.[ticketIndex] ?? sale.raw?.loteIngresso?.tickets?.[ticketIndex];
  const code = ('qrcode' in (ticket ?? {}) ? ticket?.qrcode : undefined) ?? sale.codigo;
  return { event, ticket, code: String(code), when: dateParts(event?.data ?? event?.date) };
}

function drawLabel(page: PDFPage, font: PDFFont, value: string, x: number, y: number) {
  page.drawText(value.toUpperCase(), { x, y, size: 7.5, font, color: muted });
}

async function embedQr(pdf: PDFDocument, value: string) {
  const dataUrl = await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: 480 });
  return pdf.embedPng(dataUrl);
}

async function createTicketPdf(sale: Sale, ticketIndex: number) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { event, ticket, code, when } = ticketData(sale, ticketIndex);
  const qr = await embedQr(pdf, code);

  page.drawRectangle({ x: 38, y: 72, width: 519, height: 698, color: paper, borderColor: burgundy, borderWidth: 1.5 });
  page.drawRectangle({ x: 38, y: 605, width: 519, height: 165, color: burgundy });
  page.drawRectangle({ x: 38, y: 72, width: 519, height: 55, color: burgundy });
  page.drawText('CORAÇÃO GAÚCHO', { x: 205, y: 738, size: 12, font: bold, color: gold });
  page.drawText(fitText(sale.eventoNome, 33), { x: 72, y: 687, size: 25, font: bold, color: rgb(1, 1, 1) });
  page.drawText(sale.tipo === 'CURSO' ? 'INSCRIÇÃO CONFIRMADA' : 'INGRESSO CONFIRMADO', { x: 72, y: 651, size: 11, font: bold, color: rgb(1, 1, 1) });

  drawLabel(page, bold, 'Participante', 72, 565);
  page.drawText(fitText(sale.nome, 38), { x: 72, y: 544, size: 14, font: bold, color: ink });
  drawLabel(page, bold, 'CPF', 335, 565);
  page.drawText(maskCpf(sale.cpf), { x: 335, y: 544, size: 12, font: bold, color: ink });
  drawLabel(page, bold, sale.tipo === 'CURSO' ? 'Curso' : 'Evento', 72, 500);
  page.drawText(fitText(sale.eventoNome, 45), { x: 72, y: 479, size: 13, font: bold, color: ink });
  drawLabel(page, bold, 'Data', 72, 432);
  page.drawText(when.date, { x: 72, y: 411, size: 13, font: bold, color: ink });
  drawLabel(page, bold, 'Horário', 210, 432);
  page.drawText(when.time, { x: 210, y: 411, size: 13, font: bold, color: ink });
  drawLabel(page, bold, 'Local', 72, 365);
  page.drawText(fitText(event?.local ?? event?.location ?? '-', 38), { x: 72, y: 344, size: 12, font: bold, color: ink });
  page.drawText(fitText(event?.cidade ?? sale.cidade ?? '-', 38), { x: 72, y: 327, size: 10, font: regular, color: muted });
  drawLabel(page, bold, 'Ingresso', 72, 280);
  page.drawText(`${sale.codigo}${ticketIndex ? `-${ticketIndex + 1}` : ''}`, { x: 72, y: 259, size: 12, font: bold, color: ink });
  drawLabel(page, bold, 'Status', 72, 222);
  page.drawText(String(ticket?.status ?? sale.status), { x: 72, y: 201, size: 11, font: bold, color: burgundy });
  page.drawImage(qr, { x: 335, y: 267, width: 160, height: 160 });
  page.drawText('Apresente este QR Code no check-in', { x: 342, y: 248, size: 8, font: regular, color: muted });
  page.drawText('Apresente este ingresso na entrada. Documento pessoal, intransferível e de uso único.', { x: 79, y: 97, size: 8, font: regular, color: rgb(1, 1, 1) });
  return pdf.saveAsBase64();
}

async function createReceiptPdf(sale: Sale) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([340, 720]);
  const regular = await pdf.embedFont(StandardFonts.Courier);
  const bold = await pdf.embedFont(StandardFonts.CourierBold);
  const payment = sale.raw?.pagamentos?.find((item) => item.status === 'PAGO') ?? sale.raw?.pagamentos?.[0];
  const items = sale.raw?.items ?? [];
  const qr = await embedQr(pdf, sale.codigo);
  const created = new Date(sale.createdAt);
  const createdAt = Number.isNaN(created.getTime()) ? '-' : created.toLocaleString('pt-BR');

  page.drawRectangle({ x: 18, y: 18, width: 304, height: 684, color: rgb(1, 1, 1), borderColor: muted, borderWidth: 0.8, borderDashArray: [4, 3] });
  page.drawText('CORAÇÃO GAÚCHO', { x: 94, y: 669, size: 15, font: bold, color: burgundy });
  page.drawText('CUPOM DA COMPRA', { x: 103, y: 641, size: 13, font: bold, color: ink });
  page.drawText('NÃO É DOCUMENTO FISCAL', { x: 91, y: 622, size: 9, font: bold, color: ink });
  page.drawLine({ start: { x: 32, y: 602 }, end: { x: 308, y: 602 }, thickness: 0.7, color: muted, dashArray: [3, 3] });

  let y = 580;
  const line = (label: string, value: unknown, strong = false) => {
    page.drawText(`${label}:`, { x: 32, y, size: 8, font: bold, color: ink });
    page.drawText(fitText(value, 40), { x: 112, y, size: 8, font: strong ? bold : regular, color: ink });
    y -= 18;
  };
  line('Venda', sale.codigo, true);
  line('Data', createdAt);
  line('Comprador', sale.nome, true);
  line('CPF', maskCpf(sale.cpf));
  y -= 3;
  page.drawLine({ start: { x: 32, y }, end: { x: 308, y }, thickness: 0.7, color: muted, dashArray: [3, 3] });
  y -= 21;
  page.drawText('ITEM', { x: 32, y, size: 8, font: bold, color: ink });
  page.drawText('QTD', { x: 205, y, size: 8, font: bold, color: ink });
  page.drawText('TOTAL', { x: 262, y, size: 8, font: bold, color: ink });
  y -= 18;
  for (const item of items.slice(0, 8)) {
    const quantity = Number(item.quantity ?? item.quantidade ?? 1);
    const total = Number(item.total ?? (item.unitPrice ?? item.valorUnitario ?? 0) * quantity);
    page.drawText(fitText(item.description ?? item.nome ?? 'Item', 25), { x: 32, y, size: 7.5, font: regular, color: ink });
    page.drawText(String(quantity), { x: 211, y, size: 7.5, font: regular, color: ink });
    page.drawText(formatCurrencyBRL(total), { x: 252, y, size: 7.5, font: regular, color: ink });
    y -= 17;
  }
  if (!items.length) {
    page.drawText(fitText(sale.eventoNome ?? 'Venda', 25), { x: 32, y, size: 7.5, font: regular, color: ink });
    page.drawText(String(sale.quantidade), { x: 211, y, size: 7.5, font: regular, color: ink });
    page.drawText(formatCurrencyBRL(sale.valorTotal), { x: 252, y, size: 7.5, font: regular, color: ink });
    y -= 17;
  }
  y -= 4;
  page.drawLine({ start: { x: 32, y }, end: { x: 308, y }, thickness: 0.7, color: muted, dashArray: [3, 3] });
  y -= 22;
  page.drawText('Desconto', { x: 32, y, size: 8, font: regular, color: ink });
  page.drawText(formatCurrencyBRL(sale.desconto), { x: 252, y, size: 8, font: regular, color: ink });
  y -= 23;
  page.drawText('TOTAL', { x: 32, y, size: 14, font: bold, color: ink });
  page.drawText(formatCurrencyBRL(sale.valorTotal), { x: 222, y, size: 13, font: bold, color: ink });
  y -= 28;
  line('Pagamento', payment?.method ?? sale.formaPagamento ?? '-');
  line('Valor pago', formatCurrencyBRL(Number(payment?.amount ?? 0) / 100));
  line('Referência', payment?.externalReference ?? '-');
  const qrY = Math.max(72, y - 128);
  page.drawImage(qr, { x: 118, y: qrY, width: 104, height: 104 });
  page.drawText('Obrigado pela confiança!', { x: 99, y: qrY - 19, size: 9, font: bold, color: ink });
  page.drawText('Volte sempre.', { x: 132, y: qrY - 34, size: 8, font: regular, color: ink });
  return pdf.saveAsBase64();
}

async function buildDocument(sale: Sale, kind: SaleDocumentKind, ticketIndex = 0) {
  const base = cleanFilePart(sale.codigo || sale.id);
  return {
    base64: kind === 'ticket' ? await createTicketPdf(sale, ticketIndex) : await createReceiptPdf(sale),
    filename: `${kind === 'ticket' ? 'ingresso' : 'cupom'}-${base}${kind === 'ticket' && ticketIndex ? `-${ticketIndex + 1}` : ''}.pdf`
  };
}

function base64ToBlob(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: 'application/pdf' });
}

async function saveNativeFile(base64: string, filename: string) {
  const uri = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

export async function downloadSaleDocument(sale: Sale, kind: SaleDocumentKind, ticketIndex = 0) {
  const document = await buildDocument(sale, kind, ticketIndex);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(base64ToBlob(document.base64));
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document.filename;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const uri = await saveNativeFile(document.base64, document.filename);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Salvar PDF' });
  else await Linking.openURL(uri);
}

export async function viewSaleDocument(sale: Sale, kind: SaleDocumentKind, ticketIndex = 0) {
  const document = await buildDocument(sale, kind, ticketIndex);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(base64ToBlob(document.base64));
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  await Linking.openURL(await saveNativeFile(document.base64, document.filename));
}

export async function shareSaleDocument(sale: Sale, kind: SaleDocumentKind, ticketIndex = 0) {
  const document = await buildDocument(sale, kind, ticketIndex);
  if (Platform.OS === 'web') {
    const file = new File([base64ToBlob(document.base64)], document.filename, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: document.filename });
      return;
    }
    await downloadSaleDocument(sale, kind, ticketIndex);
    return;
  }
  const uri = await saveNativeFile(document.base64, document.filename);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar PDF' });
  else await Linking.openURL(uri);
}

export async function sendDocumentByWhatsApp(sale: Sale, label: string) {
  const phone = String(sale.telefone ?? '').replace(/\D/g, '');
  const target = phone ? `55${phone.replace(/^55/, '')}` : '';
  const text = `${label} da venda ${sale.codigo} — ${sale.eventoNome ?? 'Coração Gaúcho'}.`;
  await Linking.openURL(`https://wa.me/${target}?text=${encodeURIComponent(text)}`);
}

export async function sendDocumentByEmail(sale: Sale, label: string) {
  await Linking.openURL(`mailto:${sale.email ?? ''}?subject=${encodeURIComponent(`${label} — ${sale.codigo}`)}&body=${encodeURIComponent(`Segue ${label.toLowerCase()} da venda ${sale.codigo}.`)}`);
}
