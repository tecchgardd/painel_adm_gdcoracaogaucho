import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppModal, StatusBadge } from '@/components/ui';
import { colors } from '@/theme/colors';
import { useResponsive } from '@/hooks/useResponsive';
import { getSaleHistory } from '@/services/sales.service';
import type { Pagamento, PaymentHistory, Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import type { DocumentKind } from '@/components/documents/DocumentPreviewModal';
import { getEventInfo } from '@/components/documents/documentUtils';

type Tab = 'RESUMO' | 'ITENS' | 'PAGAMENTO' | 'DOCUMENTOS' | 'HISTORICO';

export function SaleDetailsModal({
  sale,
  onClose,
  onPaymentAction
}: {
  sale: Sale | null;
  onClose: () => void;
  onPaymentAction: (kind: 'edit' | 'external' | 'refund', paymentId: string) => void;
}) {
  const { isMobile } = useResponsive();
  const [tab, setTab] = useState<Tab>('RESUMO');
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [previewKind, setPreviewKind] = useState<DocumentKind | null>(null);
  const payment = sale?.raw?.pagamentos?.find((item) => item.status === 'PAGO') ?? sale?.raw?.pagamentos?.[0];
  const refundable = payment?.allowedActions?.refund ?? ['PAGO', 'PARCIALMENTE_ESTORNADO'].includes(String(payment?.status));
  const replaceable = payment?.allowedActions?.replaceWithExternal ?? (payment?.provider === 'STRIPE' && ['PENDENTE', 'PROCESSANDO', 'FALHOU', 'EXPIRADO'].includes(String(payment?.status)));
  const eventInfo = sale ? getEventInfo(sale) : null;

  useEffect(() => {
    setTab('RESUMO');
    setHistory([]);
    setHistoryError('');
  }, [sale?.id]);

  useEffect(() => {
    if (!sale || tab !== 'HISTORICO' || history.length) return;
    getSaleHistory(sale.id).then(setHistory).catch((error: { message?: string }) => setHistoryError(error.message ?? 'Não foi possível carregar o histórico.'));
  }, [history.length, sale, tab]);

  if (!sale || !eventInfo) return null;

  return (
    <AppModal visible={!!sale} onClose={onClose} position="center" title={`Venda ${sale.codigo}`}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.eyebrow}>GESTÃO DA VENDA</Text>
          <Text style={styles.title}>{sale.eventoNome ?? 'Venda'}</Text>
        </View>
        <StatusBadge status={sale.status} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(['RESUMO', 'ITENS', 'PAGAMENTO', 'DOCUMENTOS', 'HISTORICO'] as Tab[]).map((item) => (
          <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'DOCUMENTOS' ? 'Docs' : item === 'HISTORICO' ? 'Histórico' : item[0] + item.slice(1).toLowerCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'RESUMO' ? (
        <View style={styles.panel}>
          <Info icon="account-outline" label="Comprador" value={sale.nome} secondary={maskCpf(sale.cpf)} />
          <Info icon="calendar-blank-outline" label="Evento/Curso" value={sale.eventoNome} />
          <Info icon="ticket-confirmation-outline" label="Quantidade" value={`${sale.quantidade} ${sale.tipo === 'CURSO' ? 'inscrições' : 'ingressos'}`} />
          <Info icon="cash-multiple" label="Valor total" value={formatCurrencyBRL(sale.valorTotal)} />
          <Info icon="credit-card-outline" label="Forma de pagamento" value={sale.formaPagamento ?? '-'} />
          <Info icon="calendar-clock-outline" label="Data da venda" value={formatDateTime(sale.createdAt)} />
          <Info icon="check-circle-outline" label="Pago em" value={formatDateTime(sale.pagoEm ?? payment?.paidAt)} />
          <Info icon="store-outline" label="Origem" value={sale.origem ?? sale.raw?.origin ?? '-'} />
          {sale.observacao ? <Info icon="text-box-outline" label="Observações" value={sale.observacao} /> : null}
        </View>
      ) : null}

      {tab === 'ITENS' ? (
        <View style={styles.stack}>
          {(sale.raw?.items ?? []).map((item, index) => (
            <View style={styles.panel} key={String(item.id ?? index)}>
              <Text style={styles.cardTitle}>{item.description ?? item.nome ?? 'Item'}</Text>
              <Info icon="counter" label="Quantidade" value={String(item.quantity ?? item.quantidade ?? 1)} />
              <Info icon="cash" label="Valor unitário" value={formatCurrencyBRL(item.unitPrice ?? item.valorUnitario ?? 0)} />
              <Info icon="sale-outline" label="Desconto da venda" value={formatCurrencyBRL(sale.desconto)} />
              <Info icon="equal" label="Subtotal" value={formatCurrencyBRL(item.total ?? 0)} />
            </View>
          ))}
          {!sale.raw?.items?.length ? <Empty text="Nenhum item retornado pelo backend." /> : null}
        </View>
      ) : null}

      {tab === 'PAGAMENTO' ? (
        payment ? (
          <View style={styles.stack}>
            <View style={styles.panel}>
              <Info icon="check-circle-outline" label="Status do pagamento" value={String(payment.status ?? '-')} />
              <Info icon="credit-card-outline" label="Forma de pagamento" value={payment.method ?? sale.formaPagamento ?? '-'} />
              <Info icon="cash-check" label="Valor pago" value={formatCurrencyBRL(Number(payment.amount ?? 0) / 100)} />
              <Info icon="calendar-check-outline" label="Data do pagamento" value={formatDateTime(payment.paidAt)} />
              <Info icon="identifier" label="Referência / Comprovante" value={payment.externalReference ?? '-'} />
              <Info icon="text-box-outline" label="Observação" value={payment.notes ?? '-'} />
            </View>
            <View style={[styles.actionGrid, isMobile && styles.actionGridMobile]}>
              {payment.allowedActions?.edit !== false && payment.provider !== 'STRIPE' ? <Action title="Editar pagamento" icon="pencil-outline" onPress={() => onPaymentAction('edit', payment.id)} /> : null}
              {replaceable ? <Action title="Substituir por pagamento externo" icon="swap-horizontal" tone="danger" onPress={() => onPaymentAction('external', payment.id)} /> : null}
              {refundable ? <Action title="Reembolsar" icon="cash-refund" tone="danger" onPress={() => onPaymentAction('refund', payment.id)} /> : null}
            </View>
            <Technical payment={payment} />
          </View>
        ) : (
          <Empty text="Nenhum pagamento relacionado foi retornado." />
        )
      ) : null}

      {tab === 'DOCUMENTOS' ? (
        <View style={styles.stack}>
          {!['PAGO', 'CORTESIA', 'PARCIALMENTE_ESTORNADO'].includes(sale.status) ? (
            <Empty text="Documentos ficam disponíveis após a confirmação do pagamento." />
          ) : (
            <View style={styles.docLinks}>
              {sale.tipo === 'CURSO' ? (
                <DocLink icon="file-check-outline" title="Comprovante de inscrição" onPress={() => setPreviewKind('registration')} />
              ) : (
                <DocLink icon="ticket-confirmation-outline" title="Ingresso" onPress={() => setPreviewKind('ticket')} />
              )}
              <DocLink icon="receipt-text-outline" title="Cupom / comprovante de pagamento" onPress={() => setPreviewKind('receipt')} />
            </View>
          )}
        </View>
      ) : null}

      <DocumentPreviewModal visible={!!previewKind} onClose={() => setPreviewKind(null)} sale={sale} kind={previewKind ?? 'receipt'} />

      {tab === 'HISTORICO' ? (
        <View style={styles.timeline}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyDot} />
              <View style={styles.historyBody}>
                <Text style={styles.cardTitle}>{humanAction(item.action)}</Text>
                <Text style={styles.muted}>{formatDateTime(item.createdAt)} · {item.userName ?? 'Sistema'}</Text>
                {item.fromStatus || item.toStatus ? <Text style={styles.historyStatus}>{item.fromStatus ?? '-'} → {item.toStatus ?? '-'}</Text> : null}
                {item.reason ? <Text style={styles.muted}>{item.reason}</Text> : null}
              </View>
            </View>
          ))}
          {historyError ? <Empty text={historyError} /> : null}
          {!history.length && !historyError ? <Empty text="Carregando histórico..." /> : null}
        </View>
      ) : null}
    </AppModal>
  );
}

function humanAction(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function Info({ icon, label, value, secondary }: { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value?: string; secondary?: string }) {
  return (
    <View style={styles.info}>
      <MaterialCommunityIcons name={icon} size={21} color={colors.text} />
      <View style={styles.infoBody}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
        {secondary ? <Text style={styles.muted}>{secondary}</Text> : null}
      </View>
    </View>
  );
}

function Action({ title, icon, onPress, tone }: { title: string; icon: ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; tone?: 'default' | 'danger' }) {
  return (
    <TouchableOpacity style={[styles.action, tone === 'danger' && styles.actionDanger]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={21} color={tone === 'danger' ? colors.red : colors.text} />
      <Text style={[styles.actionText, tone === 'danger' && { color: colors.red }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="information-outline" size={22} color={colors.muted} />
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

function DocLink({ icon, title, onPress }: { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.docLink} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      <Text style={styles.docLinkText}>{title}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
    </TouchableOpacity>
  );
}

function Technical({ payment }: { payment: Pagamento }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.panel}>
      <TouchableOpacity style={styles.technicalHeader} onPress={() => setOpen(!open)}>
        <Text style={styles.cardTitle}>Dados técnicos</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
      </TouchableOpacity>
      {open ? (
        <View>
          <Text style={styles.muted}>Checkout Session: {payment.stripeCheckoutSessionId ?? '-'}</Text>
          <Text style={styles.muted}>PaymentIntent: {payment.stripePaymentIntentId ?? '-'}</Text>
          <Text style={styles.muted}>Charge: {payment.stripeChargeId ?? '-'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 },
  eyebrow: { color: colors.red, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 },
  tabs: { gap: 6, paddingBottom: 14 },
  tab: { minHeight: 38, paddingHorizontal: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.red },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: '#fff' },
  stack: { gap: 12 },
  panel: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
  info: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoBody: { flex: 1, paddingVertical: 10 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  infoValue: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 3 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  empty: { minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionGridMobile: { flexDirection: 'column' },
  action: { flex: 1, minWidth: 150, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 },
  actionDanger: { borderColor: colors.red, backgroundColor: '#261313' },
  actionText: { color: colors.text, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  technicalHeader: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docLinks: { gap: 10 },
  docLink: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14 },
  docLinkText: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 14 },
  timeline: { gap: 0 },
  historyItem: { flexDirection: 'row', gap: 12, minHeight: 76 },
  historyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.red, marginTop: 5 },
  historyBody: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14, paddingBottom: 18 },
  historyStatus: { color: colors.yellow, fontSize: 12, fontWeight: '800', marginTop: 4 }
});
