import type { Sale, SaleStatus } from '@/types/entities';
import { formatCurrencyBRL, maskCpf } from '@/utils/format';

export type ReceiptItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type EventInfo = {
  name: string;
  category: string;
  lot: string;
  date?: string;
  location: string;
  banner?: string | null;
};

export type RegistrationFields = {
  name?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  birth?: string;
  city?: string;
  state?: string;
  course?: string;
  class?: string;
  category?: string;
  professor?: string;
  startDate?: string;
  time?: string;
  location?: string;
  responsible?: string;
  consent: string;
  signature?: string;
};

export function formatMoney(value?: number | string | null) {
  return formatCurrencyBRL(value);
}

export function getDocumentCode(sale: Sale, ticketIndex = 0) {
  const ticket = sale.raw?.ingressos?.[ticketIndex] ?? sale.raw?.loteIngresso?.tickets?.[ticketIndex];
  const code = ticket && 'qrcode' in ticket ? ticket.qrcode : undefined;
  const alt = ticket && 'codigo' in ticket ? ticket.codigo : undefined;
  return code ?? alt ?? `${sale.codigo}${ticketIndex ? `-${ticketIndex + 1}` : ''}`;
}

export function getEventInfo(sale: Sale): EventInfo {
  const evento = sale.raw?.evento;
  const firstItem = sale.raw?.items?.[0];
  return {
    name: sale.eventoNome ?? evento?.nome ?? evento?.name ?? 'Evento',
    category: firstItem?.description ?? (sale.tipo === 'CURSO' ? 'Curso' : sale.tipo === 'BAILE' ? 'Baile' : 'Evento'),
    lot: firstItem?.lote ?? (sale.raw?.loteIngresso?.id ? `Lote ${sale.raw.loteIngresso.id}` : '-'),
    date: evento?.data ?? evento?.date ?? sale.createdAt,
    location: evento?.local ?? evento?.location ?? evento?.cidade ?? sale.cidade ?? '-',
    banner: evento?.banner ?? evento?.imagemUrl ?? null
  };
}

export function getReceiptItems(sale: Sale): ReceiptItem[] {
  const items = sale.raw?.items ?? [];
  if (!items.length) {
    return [{ description: sale.eventoNome ?? 'Item', quantity: sale.quantidade, unitPrice: sale.valorUnitario, total: sale.valorTotal }];
  }
  return items.map((item) => {
    const quantity = item.quantity ?? item.quantidade ?? 1;
    const unitPrice = item.unitPrice ?? item.valorUnitario ?? 0;
    return { description: item.description ?? item.nome ?? 'Item', quantity, unitPrice, total: item.total ?? unitPrice * quantity };
  });
}

export function getReceiptPaymentMethodLabel(sale: Sale) {
  const payment = sale.raw?.pagamentos?.find((item) => item.status === 'PAGO') ?? sale.raw?.pagamentos?.[0];
  if (sale.formaPagamento) return sale.formaPagamento;
  if (payment?.method) return payment.method;
  if (payment?.provider === 'STRIPE') return 'Cartão de crédito';
  if (payment?.provider === 'CORTESIA') return 'Cortesia';
  if (payment?.provider === 'EXTERNO') return 'Pagamento externo';
  return '-';
}

const STATUS_LABELS: Partial<Record<SaleStatus, string>> = {
  PENDENTE: 'Pendente',
  PROCESSANDO: 'Processando',
  PAGO: 'Pago',
  FALHOU: 'Falhou',
  CANCELADO: 'Cancelado',
  EXPIRADO: 'Expirado',
  ESTORNADO: 'Estornado',
  PARCIALMENTE_ESTORNADO: 'Parcialmente estornado',
  CONTESTADO: 'Contestado',
  CONTESTACAO_PERDIDA: 'Contestação perdida',
  CORTESIA: 'Cortesia'
};

export function getReceiptStatusLabel(status: SaleStatus | string) {
  return STATUS_LABELS[status as SaleStatus] ?? String(status).replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function getRegistrationFields(sale: Sale): RegistrationFields {
  const evento = sale.raw?.evento;
  const customer = sale.raw?.customer;
  const info = getEventInfo(sale);
  const startDate = evento?.data ?? evento?.date;
  const time = startDate ? new Date(startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined;
  return {
    name: sale.nome,
    cpf: maskCpf(sale.cpf),
    phone: sale.telefone,
    email: sale.email,
    city: sale.cidade ?? customer?.cidade,
    state: customer?.estado,
    course: info.name,
    category: info.category,
    professor: evento?.professor,
    startDate,
    time,
    location: info.location,
    responsible: customer?.nome ?? sale.nome,
    consent:
      'Declaro que as informações prestadas são verídicas e autorizo o uso de imagem para fins promocionais do evento/curso, conforme regulamento do Coração Gaúcho.'
  };
}
