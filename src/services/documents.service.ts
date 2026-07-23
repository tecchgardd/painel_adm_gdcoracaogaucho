import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, maskCpf } from '@/utils/format';

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function dateParts(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: '-', time: '-' };
  return {
    date: date.toLocaleDateString('pt-BR'),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
}

export function ticketHtml(sale: Sale, ticketIndex = 0) {
  const event = sale.raw?.evento;
  const ticket = sale.raw?.ingressos?.[ticketIndex] ?? sale.raw?.loteIngresso?.tickets?.[ticketIndex];
  const when = dateParts(event?.data ?? event?.date);
  const code = 'qrcode' in (ticket ?? {}) ? ticket?.qrcode : undefined;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial;color:#161616}.ticket{border:2px solid #711c1c;border-radius:18px;overflow:hidden}.head{background:linear-gradient(135deg,#4d1111,#891f1f);color:#fff;padding:28px;text-align:center}.brand{color:#e7b340;letter-spacing:4px;font-weight:800}.body{padding:28px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.label{font-size:11px;color:#666;text-transform:uppercase}.value{font-size:16px;font-weight:700;margin-top:4px}.qr{margin:26px auto;width:190px;height:190px;border:12px solid #111;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:800;word-break:break-all}.foot{background:#611717;color:#fff;padding:18px;text-align:center;font-size:12px}
  </style></head><body><main class="ticket"><div class="head"><div class="brand">CORAÇÃO GAÚCHO</div><h1>${escapeHtml(sale.eventoNome)}</h1><div>${sale.tipo === 'CURSO' ? 'INSCRIÇÃO CONFIRMADA' : 'INGRESSO CONFIRMADO'}</div></div><div class="body"><div class="grid">
  <div><div class="label">Participante</div><div class="value">${escapeHtml(sale.nome)}</div></div><div><div class="label">CPF</div><div class="value">${escapeHtml(maskCpf(sale.cpf))}</div></div>
  <div><div class="label">Data</div><div class="value">${when.date}</div></div><div><div class="label">Horário</div><div class="value">${when.time}</div></div>
  <div><div class="label">Local</div><div class="value">${escapeHtml(event?.local ?? event?.location ?? '-')}</div></div><div><div class="label">Cidade</div><div class="value">${escapeHtml(event?.cidade ?? sale.cidade ?? '-')}</div></div>
  <div><div class="label">Código</div><div class="value">${escapeHtml(code ?? sale.codigo)}</div></div><div><div class="label">Status</div><div class="value">${escapeHtml(ticket?.status ?? sale.status)}</div></div>
  </div><div class="qr">QR CODE<br>${escapeHtml(code ?? sale.codigo)}</div></div><div class="foot">Apresente este documento na entrada. Ingresso pessoal, intransferível e de uso único.</div></main></body></html>`;
}

export function receiptHtml(sale: Sale) {
  const payment = sale.raw?.pagamentos?.[0];
  const items = sale.raw?.items ?? [];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:80mm auto;margin:5mm}body{font:12px monospace;color:#111}.center{text-align:center}.rule{border-top:1px dashed #333;margin:12px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 0}td:last-child,th:last-child{text-align:right}.total{font-size:18px;font-weight:bold}.notice{font-weight:bold}
  </style></head><body><div class="center"><h2>CORAÇÃO GAÚCHO</h2><div>CUPOM DA COMPRA</div><div class="notice">NÃO É DOCUMENTO FISCAL</div></div><div class="rule"></div>
  <div>Venda: ${escapeHtml(sale.codigo)}</div><div>Data: ${escapeHtml(new Date(sale.createdAt).toLocaleString('pt-BR'))}</div><div>Comprador: ${escapeHtml(sale.nome)}</div><div>CPF: ${escapeHtml(maskCpf(sale.cpf))}</div><div class="rule"></div>
  <table><thead><tr><th>Item</th><th>Qtd.</th><th>Total</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.description ?? item.nome ?? 'Item')}</td><td>${item.quantity ?? item.quantidade ?? 1}</td><td>${formatCurrencyBRL(item.total ?? 0)}</td></tr>`).join('')}</tbody></table>
  <div class="rule"></div><div>Desconto: ${formatCurrencyBRL(sale.desconto)}</div><div class="total">TOTAL: ${formatCurrencyBRL(sale.valorTotal)}</div><div>Forma: ${escapeHtml(payment?.method ?? sale.formaPagamento ?? '-')}</div><div>Pago: ${formatCurrencyBRL((payment?.amount ?? 0) / 100)}</div><div>Referência: ${escapeHtml(payment?.externalReference ?? '-')}</div>
  <div class="rule"></div><div class="center">Obrigado pela confiança!<br>Volte sempre.</div></body></html>`;
}

async function makePdf(html: string) {
  return Print.printToFileAsync({ html });
}

export async function viewOrPrintDocument(html: string) {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const file = await makePdf(html);
  await Linking.openURL(file.uri);
}

export async function shareDocument(html: string, dialogTitle: string) {
  const file = await makePdf(html);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle });
  else await Linking.openURL(file.uri);
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
