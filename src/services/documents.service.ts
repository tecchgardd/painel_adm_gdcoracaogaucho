import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { PDFImage, PDFPage } from 'pdf-lib';
// @ts-expect-error entrada ESM usada para evitar problemas do Metro Web
import { PDFDocument, StandardFonts, clip, closePath, endPath, lineTo, moveTo, popGraphicsState, pushGraphicsState, rgb } from 'pdf-lib/dist/pdf-lib.esm.js';
import QRCode from 'qrcode';
import { Linking, Platform } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { getDocumentCode, getEventInfo, getReceiptItems, getReceiptPaymentMethodLabel, getReceiptTotals, getRegistrationFields } from '@/components/documents/documentUtils';
import { encodeCode128B } from '@/utils/barcode';

export type SaleDocumentKind = 'ticket' | 'receipt' | 'registration';

function cleanFilePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function dateParts(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: '-', time: '-' };
  return { date: date.toLocaleDateString('pt-BR'), time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
}

function fitText(value: unknown, max = 46) {
  const text = String(value ?? '-');
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function hashOf(seed: string) {
  const clean = seed.replace(/[^A-Z0-9]/gi, '').padEnd(16, '0').slice(0, 16).toUpperCase();
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
}

async function embedQr(pdf: PDFDocument, value: string) {
  const dataUrl = await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: 480 });
  return pdf.embedPng(dataUrl);
}

function drawCoverImage(page: PDFPage, image: PDFImage, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x - (drawWidth - width) / 2;
  const drawY = y - (drawHeight - height) / 2;

  page.pushOperators(pushGraphicsState());
  page.pushOperators(moveTo(x, y), lineTo(x + width, y), lineTo(x + width, y + height), lineTo(x, y + height), closePath(), clip(), endPath());
  page.drawImage(image, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
  page.pushOperators(popGraphicsState());
}

function drawBarcode(page: PDFPage, value: string, x: number, y: number, unitWidth: number, height: number, color = rgb(0.04, 0.04, 0.04)) {
  let cursor = x;
  encodeCode128B(value).forEach((bar) => {
    if (bar.isBar) page.drawRectangle({ x: cursor, y, width: bar.width * unitWidth, height, color });
    cursor += bar.width * unitWidth;
  });
}

async function createTicketPdf(sale: Sale, ticketIndex: number) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([720, 380]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const event = getEventInfo(sale);
  const codigo = getDocumentCode(sale, ticketIndex);
  const qr = await embedQr(pdf, codigo);
  const black = rgb(0.04, 0.04, 0.04);
  const white = rgb(1, 1, 1);
  const gold = rgb(0.831, 0.651, 0.165);
  const muted = rgb(0.6, 0.6, 0.6);

  page.drawRectangle({ x: 0, y: 0, width: 720, height: 380, color: black });

  if (event.banner) {
    try {
      const response = await fetch(event.banner);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const flyer = event.banner.toLowerCase().includes('.png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      drawCoverImage(page, flyer, 0, 180, 560, 200);
    } catch {
      page.drawText(fitText(event.name, 40), { x: 40, y: 280, size: 22, font: bold, color: white });
    }
  } else {
    page.drawText(fitText(event.name, 40), { x: 40, y: 280, size: 22, font: bold, color: white });
  }

  const dp = dateParts(event.date);
  const infoRows: [string, string][] = [['DATA', dp.date], ['INÍCIO', dp.time], ['LOCAL', fitText(event.location, 30)]];
  infoRows.forEach(([label, value], index) => {
    const x = 20 + index * 180;
    page.drawText(label, { x, y: 160, size: 7.5, font: bold, color: muted });
    page.drawText(value, { x, y: 146, size: 11.5, font: bold, color: white });
  });

  page.drawText('PORTADOR', { x: 20, y: 116, size: 7.5, font: bold, color: muted });
  page.drawText(fitText(sale.nome, 30), { x: 20, y: 102, size: 11.5, font: bold, color: white });
  page.drawText('CPF', { x: 300, y: 116, size: 7.5, font: bold, color: muted });
  page.drawText(maskCpf(sale.cpf), { x: 300, y: 102, size: 11.5, font: bold, color: white });

  page.drawText('VALOR', { x: 20, y: 72, size: 7.5, font: bold, color: muted });
  page.drawText(formatCurrencyBRL(sale.valorUnitario), { x: 20, y: 58, size: 11.5, font: bold, color: white });
  page.drawText('CÓDIGO DO INGRESSO', { x: 300, y: 72, size: 7.5, font: bold, color: muted });
  page.drawText(codigo, { x: 300, y: 58, size: 11.5, font: bold, color: white });

  page.drawImage(qr, { x: 20, y: 8, width: 40, height: 40 });
  page.drawRectangle({ x: 76, y: 8, width: 460, height: 40, color: gold });
  page.drawText('APRESENTE NA ENTRADA', { x: 88, y: 32, size: 10, font: bold, color: black });
  page.drawText('Este QR Code é único e pessoal. Não compartilhe.', { x: 88, y: 18, size: 7.5, font: regular, color: black });

  drawBarcode(page, codigo, 610, 60, 1.4, 260, black);
  page.drawText(codigo, { x: 690, y: 60, size: 8, font: bold, color: white });

  return pdf.saveAsBase64();
}

async function createReceiptPdf(sale: Sale) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 620]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const black = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.42, 0.42, 0.42);
  const items = getReceiptItems(sale);
  const { subtotal, ajusteLabel, ajusteValor } = getReceiptTotals(sale);
  const metodo = getReceiptPaymentMethodLabel(sale);
  const codigo = getDocumentCode(sale);
  const qr = await embedQr(pdf, `${sale.codigo}|${sale.id}`);

  page.drawRectangle({ x: 0, y: 0, width: 300, height: 620, color: rgb(1, 1, 1) });
  page.drawText('GRUPO DE DANÇAS', { x: 80, y: 592, size: 10, font: bold, color: black });
  page.drawText('CORAÇÃO GAÚCHO', { x: 80, y: 580, size: 10, font: bold, color: black });

  page.drawText('CUPOM', { x: 118, y: 546, size: 16, font: bold, color: black });
  page.drawText('COMPROVANTE DE PAGAMENTO', { x: 62, y: 530, size: 8.5, font: bold, color: black });

  const dataRows: [string, string][] = [
    ['Nº do cupom', sale.codigo],
    ['Data', formatDateTime(sale.createdAt)],
    ['Código do ingresso', codigo],
    ['Forma de pagamento', metodo]
  ];
  let y = 505;
  dataRows.forEach(([label, value]) => {
    page.drawText(label, { x: 20, y, size: 8, font: regular, color: muted });
    page.drawText(fitText(value, 22), { x: 150, y, size: 8, font: bold, color: black });
    y -= 14;
  });

  y -= 6;
  page.drawText('DADOS DO PARTICIPANTE', { x: 20, y, size: 8.5, font: bold, color: black });
  y -= 14;
  page.drawText('Nome', { x: 20, y, size: 8, font: regular, color: muted });
  page.drawText(fitText(sale.nome, 22), { x: 150, y, size: 8, font: bold, color: black });
  y -= 14;
  page.drawText('CPF', { x: 20, y, size: 8, font: regular, color: muted });
  page.drawText(maskCpf(sale.cpf), { x: 150, y, size: 8, font: bold, color: black });

  y -= 22;
  items.forEach((item) => {
    page.drawText(fitText(item.description, 26), { x: 20, y, size: 8, font: regular, color: black });
    page.drawText(`${item.quantity}x ${formatCurrencyBRL(item.unitPrice)}`, { x: 190, y, size: 7.5, font: regular, color: muted });
    y -= 12;
    page.drawText(formatCurrencyBRL(item.total), { x: 230, y: y + 12, size: 8, font: bold, color: black });
  });

  y -= 8;
  page.drawText('SUBTOTAL', { x: 20, y, size: 9, font: regular, color: black });
  page.drawText(formatCurrencyBRL(subtotal), { x: 220, y, size: 9, font: regular, color: black });
  y -= 14;
  if (ajusteLabel) {
    page.drawText(ajusteLabel.toUpperCase(), { x: 20, y, size: 9, font: regular, color: black });
    page.drawText(formatCurrencyBRL(ajusteValor), { x: 220, y, size: 9, font: regular, color: black });
    y -= 14;
  }
  page.drawText('TOTAL', { x: 20, y, size: 13, font: bold, color: black });
  page.drawText(formatCurrencyBRL(sale.valorTotal), { x: 210, y, size: 13, font: bold, color: black });
  y -= 24;
  page.drawText(`Valor pago via ${metodo}`, { x: 20, y, size: 8.5, font: regular, color: black });
  page.drawText(formatCurrencyBRL(sale.valorTotal), { x: 220, y, size: 8.5, font: regular, color: black });
  y -= 14;
  page.drawText('Troco', { x: 20, y, size: 8.5, font: regular, color: black });
  page.drawText(formatCurrencyBRL(0), { x: 220, y, size: 8.5, font: regular, color: black });

  y -= 26;
  page.drawText(`Autenticação: ${hashOf(`${sale.codigo}${sale.id}receipt`)}`, { x: 20, y, size: 7.5, font: bold, color: black });
  y -= 30;
  page.drawImage(qr, { x: 20, y: y - 70, width: 70, height: 70 });
  page.drawText('Obrigado por prestigiar', { x: 100, y, size: 8.5, font: bold, color: black });
  page.drawText('a cultura gaúcha!', { x: 100, y: y - 12, size: 8.5, font: bold, color: black });
  page.drawText('Coração que dança,', { x: 100, y: y - 28, size: 8, font: regular, color: muted });
  page.drawText('tradição que encanta!', { x: 100, y: y - 40, size: 8, font: regular, color: muted });

  return pdf.saveAsBase64();
}

async function createRegistrationPdf(sale: Sale) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 700]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const black = rgb(0.04, 0.04, 0.04);
  const white = rgb(1, 1, 1);
  const green = rgb(0.18, 0.49, 0.196);
  const muted = rgb(0.35, 0.35, 0.35);
  const event = getEventInfo(sale);
  const fields = getRegistrationFields(sale);
  const qr = await embedQr(pdf, getDocumentCode(sale));

  page.drawRectangle({ x: 0, y: 0, width: 420, height: 700, color: white });
  page.drawText('COMPROVANTE DE INSCRIÇÃO', { x: 40, y: 650, size: 16, font: bold, color: black });
  page.drawText('CURSO DE DANÇAS GAÚCHAS', { x: 40, y: 630, size: 10, font: bold, color: green });

  page.drawRectangle({ x: 0, y: 560, width: 420, height: 34, color: green });
  page.drawText('INSCRIÇÃO CONFIRMADA', { x: 40, y: 572, size: 12, font: bold, color: white });

  const rows: [string, string][] = [
    ['ALUNO(A)', sale.nome],
    ['CPF', maskCpf(sale.cpf)],
    ['CURSO', event.name],
    ['LOCAL', event.location],
    ...(event.date ? [['INÍCIO DAS AULAS', formatDateTime(event.date)] as [string, string]] : []),
    ['TEM PAR', fields.temPar ? 'SIM' : 'NÃO'],
    ...(fields.temPar && fields.parNome ? [['PAR', fields.parNome] as [string, string]] : [])
  ];
  let y = 530;
  rows.forEach(([label, value]) => {
    page.drawText(label, { x: 40, y, size: 8, font: bold, color: muted });
    page.drawText(fitText(value, 40), { x: 40, y: y - 13, size: 11.5, font: bold, color: black });
    y -= 40;
  });

  if (event.observacao) {
    page.drawText('INFORMAÇÕES IMPORTANTES', { x: 40, y: y - 4, size: 9, font: bold, color: green });
    page.drawText(fitText(event.observacao, 90), { x: 40, y: y - 18, size: 8.5, font: regular, color: black, maxWidth: 340, lineHeight: 11 });
  }

  page.drawImage(qr, { x: 300, y: 60, width: 80, height: 80 });
  page.drawRectangle({ x: 0, y: 0, width: 420, height: 40, color: rgb(0.071, 0.29, 0.098) });
  page.drawText('Coração que dança, tradição que encanta!', { x: 60, y: 15, size: 10, font: regular, color: white });

  return pdf.saveAsBase64();
}

async function buildDocument(sale: Sale, kind: SaleDocumentKind, ticketIndex = 0) {
  const base = cleanFilePart(sale.codigo || sale.id);
  const base64 = kind === 'ticket' ? await createTicketPdf(sale, ticketIndex) : kind === 'receipt' ? await createReceiptPdf(sale) : await createRegistrationPdf(sale);
  const suffix = kind === 'ticket' && ticketIndex ? `-${ticketIndex + 1}` : '';
  return { base64, filename: `${kind}-${base}${suffix}.pdf` };
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
  const text = `${label} da venda ${sale.codigo} - ${sale.eventoNome ?? 'Coração Gaúcho'}.`;
  await Linking.openURL(`https://wa.me/${target}?text=${encodeURIComponent(text)}`);
}

export async function sendDocumentByEmail(sale: Sale, label: string) {
  await Linking.openURL(`mailto:${sale.email ?? ''}?subject=${encodeURIComponent(`${label} - ${sale.codigo}`)}&body=${encodeURIComponent(`Segue ${label.toLowerCase()} da venda ${sale.codigo}.`)}`);
}
