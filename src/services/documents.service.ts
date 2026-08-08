import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { PDFPage, PDFFont } from 'pdf-lib';
// @ts-expect-error entrada ESM usada para evitar problemas do Metro Web
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib/dist/pdf-lib.esm.js';
import QRCode from 'qrcode';
import { Linking, Platform } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { getDocumentCode, getEventInfo, getReceiptItems, getReceiptStatusLabel, getRegistrationFields } from '@/components/documents/documentUtils';

export type SaleDocumentKind = 'ticket' | 'receipt' | 'registration';

const burgundy = rgb(0.48, 0.12, 0.12);
const gold = rgb(0.88, 0.63, 0.18);
const ink = rgb(0.12, 0.12, 0.12);
const muted = rgb(0.42, 0.42, 0.42);
const white = rgb(1, 1, 1);
const paper = rgb(0.985, 0.98, 0.97);
const mist = rgb(0.92, 0.88, 0.86);

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

function header(page: PDFPage, bold: PDFFont, regular: PDFFont, title: string, subtitle: string, kicker: string) {
  page.drawRectangle({ x: 32, y: 724, width: 531, height: 87, color: burgundy });
  page.drawRectangle({ x: 32, y: 778, width: 531, height: 33, color: rgb(0.28, 0.07, 0.07) });
  page.drawText('CORAÇÃO GAÚCHO', { x: 48, y: 789, size: 10, font: bold, color: gold });
  page.drawText(kicker, { x: 48, y: 775, size: 8.2, font: regular, color: white });
  page.drawText(title, { x: 48, y: 748, size: 18, font: bold, color: white });
  page.drawText(subtitle, { x: 48, y: 731, size: 9.5, font: bold, color: white });
  page.drawText('SISTEMA PROFISSIONAL DE EVENTOS', { x: 401, y: 789, size: 7.5, font: bold, color: gold });
}

function footer(page: PDFPage, regular: PDFFont, bold: PDFFont, docNumber: string, hash: string, date: string) {
  page.drawRectangle({ x: 32, y: 34, width: 531, height: 58, color: burgundy });
  page.drawText('Sistema Coração Gaúcho', { x: 48, y: 63, size: 9, font: bold, color: gold });
  page.drawText(`Data de emissão: ${date}`, { x: 48, y: 48, size: 7.5, font: regular, color: white });
  page.drawText(`Documento: ${docNumber}`, { x: 278, y: 63, size: 7.5, font: regular, color: white });
  page.drawText(`Hash: ${hash}`, { x: 278, y: 48, size: 7.5, font: regular, color: white });
}

async function createTicketPdf(sale: Sale, ticketIndex: number) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const event = getEventInfo(sale);
  const qr = await embedQr(pdf, getDocumentCode(sale, ticketIndex));
  const emitted = dateParts(sale.createdAt);
  const hash = hashOf(`${sale.codigo}${sale.id}${ticketIndex}`);
  const status = sale.status === 'PAGO' || sale.status === 'CORTESIA' ? 'INGRESSO VÁLIDO' : 'INSCRIÇÃO CONFIRMADA';
  const rows: [string, string][] = [
    ['Nome', fitText(sale.nome, 34)],
    ['CPF', maskCpf(sale.cpf)],
    ['Evento', fitText(event.name, 34)],
    ['Categoria', event.category],
    ['Lote', event.lot],
    ['Data', formatDateTime(event.date)],
    ['Horário', dateParts(event.date).time],
    ['Local', fitText(event.location, 32)],
    ['Número do ingresso', `${sale.codigo}${ticketIndex ? `-${ticketIndex + 1}` : ''}`]
  ];

  page.drawRectangle({ x: 32, y: 120, width: 531, height: 590, color: paper, borderColor: burgundy, borderWidth: 1.2 });
  header(page, bold, regular, event.name, status, 'INGRESSO PREMIUM');
  page.drawRectangle({ x: 54, y: 420, width: 278, height: 292, color: white, borderColor: mist, borderWidth: 0.8 });
  let y = 680;
  rows.forEach(([label, value], index) => {
    const gap = index === 0 ? 44 : 31;
    page.drawText(label, { x: 66, y, size: 7.4, font: bold, color: muted });
    page.drawText(value, { x: 66, y: y - 14, size: index === 0 ? 13.2 : 11.3, font: bold, color: ink });
    y -= gap;
  });
  page.drawImage(qr, { x: 334, y: 344, width: 176, height: 176 });
  page.drawText('QR Code de validação', { x: 364, y: 324, size: 8, font: regular, color: muted });
  page.drawText(fitText(getDocumentCode(sale, ticketIndex), 34), { x: 346, y: 312, size: 8.5, font: bold, color: burgundy });
  page.drawText(`Emissão: ${emitted.date} às ${emitted.time}`, { x: 54, y: 146, size: 7.5, font: regular, color: muted });
  page.drawText('Documento pessoal e intransferível.', { x: 54, y: 133, size: 8.5, font: bold, color: ink });
  page.drawText('Apresente este ingresso na entrada do evento.', { x: 54, y: 121, size: 8, font: regular, color: ink });
  footer(page, regular, bold, `${sale.codigo}${ticketIndex ? `-${ticketIndex + 1}` : ''}`, hash, emitted.date);
  return pdf.saveAsBase64();
}

async function createReceiptPdf(sale: Sale) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const items = getReceiptItems(sale);
  const payment = sale.raw?.pagamentos?.find((item) => item.status === 'PAGO') ?? sale.raw?.pagamentos?.[0];
  const event = getEventInfo(sale);
  const qr = await embedQr(pdf, `${sale.codigo}|${sale.id}`);
  const emitted = dateParts(sale.createdAt);
  const hash = hashOf(`${sale.codigo}${sale.id}receipt`);
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const top: [string, string][] = [
    ['Código interno', sale.codigo],
    ['Número do recibo', `#${sale.codigo}`],
    ['Data', formatDateTime(sale.createdAt)],
    ['Pedido', String(sale.raw?.id ?? sale.id)],
    ['Cliente', fitText(sale.nome, 28)],
    ['CPF', maskCpf(sale.cpf)]
  ];

  page.drawRectangle({ x: 32, y: 28, width: 531, height: 786, color: white, borderColor: burgundy, borderWidth: 1.1 });
  header(page, bold, regular, 'RECIBO DE PAGAMENTO', 'Documento financeiro e comprovante de operação', 'RECIBO FINANCEIRO');
  top.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? 54 : 282;
    const row = Math.floor(index / 2);
    const y = 676 - row * 40;
    page.drawText(label, { x, y, size: 7.3, font: bold, color: muted });
    page.drawText(value, { x, y: y - 14, size: 11.5, font: bold, color: ink });
  });

  page.drawText('Itens', { x: 54, y: 548, size: 9, font: bold, color: burgundy });
  page.drawRectangle({ x: 54, y: 408, width: 487, height: 126, color: paper, borderColor: burgundy, borderWidth: 0.8 });
  page.drawText('Descrição', { x: 66, y: 516, size: 8, font: bold, color: muted });
  page.drawText('Qtd.', { x: 286, y: 516, size: 8, font: bold, color: muted });
  page.drawText('Unit.', { x: 342, y: 516, size: 8, font: bold, color: muted });
  page.drawText('Total', { x: 458, y: 516, size: 8, font: bold, color: muted });
  let y = 494;
  for (const item of items.slice(0, 4)) {
    page.drawText(fitText(item.description, 30), { x: 66, y, size: 8.4, font: regular, color: ink });
    page.drawText(String(item.quantity), { x: 292, y, size: 8.4, font: regular, color: ink });
    page.drawText(formatCurrencyBRL(item.unitPrice), { x: 336, y, size: 8.4, font: regular, color: ink });
    page.drawText(formatCurrencyBRL(item.total), { x: 448, y, size: 8.4, font: bold, color: ink });
    y -= 24;
  }

  page.drawText('Resumo financeiro', { x: 54, y: 388, size: 9, font: bold, color: burgundy });
  page.drawRectangle({ x: 54, y: 214, width: 487, height: 156, color: paper, borderColor: burgundy, borderWidth: 0.8 });
  page.drawText(`Subtotal: ${formatCurrencyBRL(subtotal)}`, { x: 66, y: 348, size: 9, font: regular, color: ink });
  page.drawText(`Desconto: ${formatCurrencyBRL(sale.desconto)}`, { x: 66, y: 328, size: 9, font: regular, color: ink });
  page.drawText(`Total: ${formatCurrencyBRL(sale.valorTotal)}`, { x: 66, y: 307, size: 14, font: bold, color: burgundy });
  page.drawText(`Forma de pagamento: ${sale.formaPagamento ?? payment?.method ?? '-'}`, { x: 66, y: 284, size: 9, font: bold, color: ink });
  page.drawText(`Status: ${getReceiptStatusLabel(sale.status)}`, { x: 66, y: 265, size: 9, font: bold, color: burgundy });
  page.drawText(`ID da transação: ${payment?.id ?? sale.pagamentoId ?? '-'}`, { x: 66, y: 246, size: 8.5, font: regular, color: ink });
  page.drawText(`Data do pagamento: ${formatDateTime(payment?.paidAt)}`, { x: 270, y: 246, size: 8.5, font: regular, color: ink });
  page.drawText(`Gateway: ${payment?.provider ?? 'PAGAMENTO EXTERNO'}`, { x: 270, y: 266, size: 8.5, font: regular, color: ink });
  page.drawText(`Responsável: ${payment?.notes ?? 'Sistema Coração Gaúcho'}`, { x: 270, y: 286, size: 8.5, font: regular, color: ink });
  page.drawImage(qr, { x: 419, y: 94, width: 100, height: 100 });
  page.drawText('Autenticidade digital', { x: 434, y: 80, size: 8, font: bold, color: burgundy });
  page.drawText(hash, { x: 403, y: 68, size: 8.5, font: bold, color: ink });
  page.drawText(`Emitido para ${event.name}`, { x: 54, y: 194, size: 8, font: regular, color: muted });
  page.drawText('Emitido eletronicamente pelo sistema Coração Gaúcho.', { x: 54, y: 177, size: 8.4, font: bold, color: ink });
  page.drawText('Documento válido mediante autenticação digital.', { x: 54, y: 163, size: 8.4, font: regular, color: ink });
  page.drawText('Site: coracaogaucho.com | Instagram: @coracaogaucho | Facebook: Coração Gaúcho', { x: 54, y: 145, size: 7.3, font: regular, color: muted });
  footer(page, regular, bold, sale.codigo, hash, emitted.date);
  return pdf.saveAsBase64();
}

async function createRegistrationPdf(sale: Sale) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fields = getRegistrationFields(sale);
  const emitted = dateParts(sale.createdAt);
  const hash = hashOf(`${sale.codigo}${sale.id}registration`);
  const qr = await embedQr(pdf, `${sale.codigo}|registration`);
  const left = [
    ['Nome', fields.name],
    ['CPF', fields.cpf],
    ['Telefone', fields.phone],
    ['Email', fields.email],
    ['Nascimento', fields.birth],
    ['Cidade', fields.city],
    ['Estado', fields.state],
    ['Curso', fields.course]
  ] as [string, string][];
  const right = [
    ['Turma', fields.class],
    ['Categoria', fields.category],
    ['Professor', fields.professor],
    ['Data de início', fields.startDate],
    ['Horário', fields.time],
    ['Local', fields.location],
    ['Responsável', fields.responsible]
  ] as [string, string][];

  page.drawRectangle({ x: 32, y: 28, width: 531, height: 786, color: paper, borderColor: burgundy, borderWidth: 1.1 });
  header(page, bold, regular, 'FICHA DE INSCRIÇÃO', 'Documento administrativo', 'REGISTRO DE INSCRIÇÃO');
  page.drawRectangle({ x: 54, y: 480, width: 487, height: 192, color: white, borderColor: mist, borderWidth: 0.8 });
  left.forEach(([label, value], index) => {
    const y = 646 - index * 23;
    page.drawText(label, { x: 66, y, size: 7.3, font: bold, color: muted });
    page.drawText(fitText(value, 28), { x: 66, y: y - 12, size: 10.8, font: bold, color: ink });
  });
  right.forEach(([label, value], index) => {
    const y = 646 - index * 26;
    page.drawText(label, { x: 292, y, size: 7.3, font: bold, color: muted });
    page.drawText(fitText(value, 28), { x: 292, y: y - 12, size: 10.8, font: bold, color: ink });
  });

  page.drawRectangle({ x: 54, y: 214, width: 332, height: 150, color: paper, borderColor: burgundy, borderWidth: 0.8 });
  page.drawText('Termo de ciência', { x: 66, y: 344, size: 9, font: bold, color: burgundy });
  page.drawText(fitText(fields.consent, 210), { x: 66, y: 327, size: 8.1, font: regular, color: ink, lineHeight: 10.5 });
  page.drawText('Assinatura digital', { x: 404, y: 344, size: 9, font: bold, color: burgundy });
  page.drawRectangle({ x: 404, y: 294, width: 123, height: 44, color: white, borderColor: burgundy, borderWidth: 0.8 });
  page.drawText(fields.signature ?? 'Linha para assinatura', { x: 416, y: 311, size: 8.2, font: regular, color: muted });
  page.drawImage(qr, { x: 420, y: 218, width: 90, height: 90 });
  page.drawText(`Data de emissão: ${emitted.date} às ${emitted.time}`, { x: 54, y: 194, size: 8, font: regular, color: muted });
  page.drawText(hash, { x: 398, y: 204, size: 8.5, font: bold, color: ink });
  footer(page, regular, bold, sale.codigo, hash, emitted.date);
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
