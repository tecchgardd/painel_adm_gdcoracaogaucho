import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { PDFFont, PDFPage } from 'pdf-lib';
// @ts-expect-error entrada ESM usada para evitar problemas do Metro Web
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib/dist/pdf-lib.esm.js';
import QRCode from 'qrcode';
import { Linking, Platform } from 'react-native';

import type { Sale } from '@/shared/types/entities';
import { buildTemplateDocument, ticketCountOf, type TemplateDocument, type TemplateText } from '@/features/documentos/templates/documentTemplates';
import { TEMPLATE_IMAGES } from '@/features/documentos/templates/templateAssets';

export type SaleDocumentKind = 'ticket' | 'receipt' | 'registration';

/** pt por pixel da arte: 1024 px viram 512 pt (~18 cm), boa nitidez para impressão e celular. */
const PDF_SCALE = 0.5;

function cleanFilePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return rgb(parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255);
}

/** As fontes padrão do PDF só codificam WinAnsi; troca o que não couber (ex.: emoji) para não quebrar a geração. */
function encodable(font: PDFFont, value: string) {
  const supported = new Set(font.getCharacterSet());
  return Array.from(value).map((char) => (supported.has(char.codePointAt(0) ?? 0) ? char : '?')).join('');
}

async function loadTemplateImage(kind: TemplateDocument['kind']) {
  const asset = Asset.fromModule(TEMPLATE_IMAGES[kind]);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (Platform.OS === 'web') return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function drawTemplateText(page: PDFPage, item: TemplateText, font: PDFFont, pageHeight: number) {
  const value = encodable(font, item.text);
  const maxWidth = item.width * PDF_SCALE;
  let size = item.size * PDF_SCALE;
  // A prévia usa uma estimativa de largura; aqui a medida é exata, então só reduz se ainda não couber.
  while (size > 6 && font.widthOfTextAtSize(value, size) > maxWidth) size -= 0.25;
  const textWidth = font.widthOfTextAtSize(value, size);
  const left = item.x * PDF_SCALE;
  const x = item.align === 'center' ? left + (maxWidth - textWidth) / 2 : item.align === 'right' ? left + maxWidth - textWidth : left;
  const centerY = pageHeight - (item.y + item.height / 2) * PDF_SCALE;
  page.drawText(value, { x, y: centerY - size * 0.35, size, font, color: hexToRgb(item.color) });
}

async function createTemplatePdf(document: TemplateDocument) {
  const pdf = await PDFDocument.create();
  const width = document.width * PDF_SCALE;
  const height = document.height * PDF_SCALE;
  const page = pdf.addPage([width, height]);
  const fonts = {
    sans: await pdf.embedFont(StandardFonts.HelveticaBold),
    serif: await pdf.embedFont(StandardFonts.TimesRomanBold)
  };

  const background = await pdf.embedJpg(await loadTemplateImage(document.kind));
  page.drawImage(background, { x: 0, y: 0, width, height });

  document.texts.forEach((item) => drawTemplateText(page, item, fonts[item.font], height));

  document.marks.forEach((mark) => {
    const inset = mark.size * 0.22;
    const x0 = (mark.x + inset) * PDF_SCALE;
    const x1 = (mark.x + mark.size - inset) * PDF_SCALE;
    const y0 = height - (mark.y + inset) * PDF_SCALE;
    const y1 = height - (mark.y + mark.size - inset) * PDF_SCALE;
    const color = hexToRgb(mark.color);
    page.drawLine({ start: { x: x0, y: y0 }, end: { x: x1, y: y1 }, thickness: 2.2, color });
    page.drawLine({ start: { x: x0, y: y1 }, end: { x: x1, y: y0 }, thickness: 2.2, color });
  });

  const qrDataUrl = await QRCode.toDataURL(document.qr.value, { errorCorrectionLevel: 'M', margin: 1, width: 600 });
  const qr = await pdf.embedPng(qrDataUrl);
  const qrSize = document.qr.size * PDF_SCALE;
  page.drawImage(qr, { x: document.qr.x * PDF_SCALE, y: height - document.qr.y * PDF_SCALE - qrSize, width: qrSize, height: qrSize });

  return pdf.saveAsBase64();
}

async function buildDocument(sale: Sale, kind: SaleDocumentKind, ticketIndex = 0) {
  const base = cleanFilePart(sale.codigo || sale.id);
  const base64 = await createTemplatePdf(buildTemplateDocument(kind, sale, ticketIndex, ticketCountOf(sale)));
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
