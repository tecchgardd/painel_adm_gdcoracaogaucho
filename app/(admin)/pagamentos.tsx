import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ActionMenu, AppModal, Button, ChoiceGroup, FilterBar, FormField, Header, InfoList, InfoRow, Pagination, Screen, StatusBadge } from '@/shared/components/ui';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { PaymentOperationModal } from '@/features/pagamentos/components/PaymentOperationModal';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { cancelarPagamento, getPagamento, listPagamentos, PagamentoStatus, reembolsarPagamento, StripeRefundReason } from '@/features/pagamentos/services/pagamentos.service';
import { usePode } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';
import type { Pagamento } from '@/shared/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf, parseCurrencyToCents } from '@/shared/utils/format';

const statuses: PagamentoStatus[] = ['PENDENTE', 'PROCESSANDO', 'PAGO', 'FALHOU', 'CANCELADO', 'EXPIRADO', 'ESTORNADO', 'PARCIALMENTE_ESTORNADO', 'CONTESTADO', 'CONTESTACAO_PERDIDA'];
const noCancel = new Set(['PAGO', 'PARCIALMENTE_ESTORNADO', 'ESTORNADO', 'CONTESTADO', 'CONTESTACAO_PERDIDA']);
const canRefund = new Set(['PAGO', 'PARCIALMENTE_ESTORNADO']);
const amount = (p?: Pagamento | null) => Number(p?.valor ?? p?.amount ?? 0);
const refunded = (p?: Pagamento | null) => Number(p?.valorReembolsado ?? p?.refundedAmount ?? 0);
const customer = (p?: Pagamento | null) => p?.cliente ?? p?.customer;
const safeError = (error: unknown, fallback: string) => {
  const value = error as { status?: number; message?: string };
  if (value.status === 403) return 'Somente administradores podem realizar esta operação.';
  if (value.status === 409) return 'O pagamento não permite esta operação. Se já foi confirmado, use o fluxo de reembolso.';
  if (value.status === 422) return 'O valor informado é inválido para este pagamento.';
  if (value.status === 503) return 'A Stripe está temporariamente indisponível. Tente novamente mais tarde.';
  return value.message && !/prisma|stripe.*(key|secret)|stack|sql/i.test(value.message) ? value.message : fallback;
};

const paymentStatusLabels: Record<string, string> = {
  CONTESTACAO_PERDIDA: 'Contestação perdida',
  PARCIALMENTE_ESTORNADO: 'Estorno parcial'
};

export default function Pagamentos() {
  const params = useLocalSearchParams<{ pagamentoId?: string; acao?: string }>();
  const podeEditar = usePode('pagamentos.editar');
  const podeReembolsar = usePode('pagamentos.reembolsar');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PagamentoStatus | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [customerId, setCustomerId] = useState('');

  // Busca com atraso: consulta a API quando a pessoa para de digitar.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next === customerId) return;
      setCustomerId(next);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [customerId, searchInput]);
  const [selected, setSelected] = useState<Pagamento | null>(null);
  const [operation, setOperation] = useState<'cancel' | 'refund' | null>(null);
  const [formPayment, setFormPayment] = useState<Pagamento | null>(null);
  const [formMode, setFormMode] = useState<'edit' | 'external' | null>(null);
  const [reason, setReason] = useState('');
  const [refundType, setRefundType] = useState<'total' | 'partial'>('total');
  const [refundValue, setRefundValue] = useState('');
  const [stripeReason, setStripeReason] = useState<StripeRefundReason>('requested_by_customer');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const query = useCallback(() => listPagamentos({ page, limit: 20, status, search: customerId.trim() || undefined }), [page, status, customerId]);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: { data: [], total: 0, page: 1, limit: 20 } });
  const payments = data?.data ?? [];
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));
  const balance = useMemo(() => Math.max(0, amount(selected) - refunded(selected)), [selected]);

  async function openDetails(payment: Pagamento) {
    setNotice('');
    try { setSelected(await getPagamento(payment.id)); }
    catch (e) { setNotice(safeError(e, 'Não foi possível carregar os detalhes.')); }
  }
  function begin(kind: 'cancel' | 'refund') { setOperation(kind); setReason(''); setRefundValue(''); setRefundType('total'); setStripeReason('requested_by_customer'); }
  async function openForm(payment: Pagamento, mode: 'edit' | 'external') {
    try {
      setFormPayment(await getPagamento(payment.id));
      setSelected(null);
      setFormMode(mode);
    } catch (e) {
      setNotice(safeError(e, 'Não foi possível carregar o pagamento.'));
    }
  }
  async function refreshSelected() { if (selected) setSelected(await getPagamento(selected.id)); await refetch(); }
  async function submitCancel() {
    if (!selected || reason.trim().length < 3 || busy) return;
    setBusy(true); setNotice('');
    try { await cancelarPagamento(selected.id, reason.trim()); await refreshSelected(); setOperation(null); setNotice('Pagamento cancelado e dados atualizados.'); }
    catch (e) { setNotice(safeError(e, 'Não foi possível cancelar o pagamento.')); }
    finally { setBusy(false); }
  }
  async function submitRefund() {
    if (!selected || busy || reason.trim().length < 3) return;
    const cents = refundType === 'partial' ? parseCurrencyToCents(refundValue) : balance;
    if (cents <= 0 || cents > balance) { setNotice('Informe um valor maior que zero e não superior ao saldo reembolsável.'); return; }
    setBusy(true); setNotice('');
    try {
      await reembolsarPagamento(selected.id, { ...(refundType === 'partial' ? { amount: cents } : {}), reason: reason.trim(), stripeReason });
      await refreshSelected(); setOperation(null); setNotice('Solicitação enviada. O status definitivo será atualizado pelo backend.');
    } catch (e) { setNotice(safeError(e, 'Não foi possível solicitar o reembolso.')); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!params.pagamentoId) return;
    getPagamento(params.pagamentoId).then((payment) => {
      setSelected(payment);
      if (params.acao === 'refund') begin('refund');
    }).catch((e) => setNotice(safeError(e, 'Não foi possível carregar o pagamento solicitado.')));
  }, [params.acao, params.pagamentoId]);

  return <Screen variant="admin">
    <Header title="Pagamentos" subtitle="Cobranças de cursos, ingressos, lotes, painel e WhatsApp em um só lugar." />
    <FilterBar
      search={{ value: searchInput, onChange: setSearchInput, placeholder: 'Buscar por CPF, nome, venda, curso ou evento' }}
      filters={[{
        key: 'status',
        label: 'Status',
        value: status ?? 'TODOS',
        allValue: 'TODOS',
        options: [{ value: 'TODOS', label: 'Todos' }, ...statuses.map((item) => ({ value: item, label: paymentStatusLabels[item] ?? item.charAt(0) + item.slice(1).toLowerCase().replaceAll('_', ' ') }))],
        onChange: (value) => { setStatus(value === 'TODOS' ? undefined : value as PagamentoStatus); setPage(1); }
      }]}
    />
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {loading ? <LoadingState label="Carregando pagamentos..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    <View style={styles.list}>{payments.map((payment) => {
      const person = customer(payment);
      const actions: { label: string; icon: any; onPress: () => void }[] = [{ label: 'Ver detalhes', icon: 'eye-outline', onPress: () => openDetails(payment) }];
      if (podeEditar && !noCancel.has(String(payment.status))) actions.push({ label: 'Cancelar', icon: 'close-circle-outline' as const, onPress: async () => { await openDetails(payment); setOperation('cancel'); } });
      if (podeEditar && payment.allowedActions?.edit) actions.push({ label: 'Editar pagamento', icon: 'pencil-outline' as const, onPress: () => openForm(payment, 'edit') });
      if (podeEditar && (payment.allowedActions?.manualSettlement || payment.allowedActions?.replaceWithExternal || !noCancel.has(String(payment.status)))) actions.unshift({ label: payment.provider === 'STRIPE' ? 'Substituir por pagamento externo' : 'Dar baixa manual', icon: 'cash-check' as const, onPress: () => openForm(payment, 'external') });
      if (podeReembolsar && canRefund.has(String(payment.status))) actions.push({ label: 'Reembolsar', icon: 'cash-refund' as const, onPress: async () => { await openDetails(payment); setOperation('refund'); } });
      return <View key={payment.id} style={styles.row}>
        <TouchableOpacity style={styles.cardBody} onPress={() => openDetails(payment)} accessibilityRole="button">
          <View style={styles.cardHeader}><Text style={styles.title}>{person?.nome ?? person?.name ?? `Pagamento ${payment.id}`}</Text><StatusBadge status={String(payment.status ?? 'PENDENTE')} /></View>
          <Text style={styles.meta}>Venda {String(payment.pedido?.code ?? payment.pedido?.id ?? '-')} · CPF: {maskCpf(person?.cpf ?? payment.cpfCustomer)}</Text>
          <Text style={styles.meta}>{(payment.evento ?? payment.curso)?.nome ?? 'Evento/curso não informado'} · Pedido {String(payment.pedido?.id ?? '-')}</Text>
          <Text style={styles.value}>{formatCurrencyBRL(amount(payment) / 100)} <Text style={styles.meta}>· reembolsado {formatCurrencyBRL(refunded(payment) / 100)}</Text></Text>
          <Text style={styles.meta}>{payment.origem ?? '-'} · criado {formatDateTime(payment.createdAt)} · pago {formatDateTime(payment.paidAt)} · reembolso {formatDateTime(payment.refundedAt)}</Text>
          {payment.disputeStatus ? <Text style={styles.dispute}>Contestação: {payment.disputeStatus}</Text> : null}
        </TouchableOpacity>
        <ActionMenu variant="ghost" actions={actions} />
      </View>;
    })}</View>
    {!loading && !error && !payments.length ? <EmptyState title="Nenhum pagamento encontrado." /> : null}
    {!loading && !error ? <Pagination page={page} totalPages={totalPages} total={data?.total} onChange={setPage} /> : null}

    <AppModal visible={!!selected && !operation} onClose={() => setSelected(null)} position="center" title="Detalhes do pagamento">
      {selected ? <Details payment={selected} balance={balance} /> : null}
      <View style={styles.footer}>
        {podeEditar && selected?.allowedActions?.edit ? <Button title="Editar pagamento" tone="dark" onPress={() => openForm(selected, 'edit')} /> : null}
        {podeEditar && (selected?.allowedActions?.manualSettlement || selected?.allowedActions?.replaceWithExternal) ? <Button title={selected.provider === 'STRIPE' ? 'Substituir por pagamento externo' : 'Dar baixa manual'} tone="green" onPress={() => openForm(selected, 'external')} /> : null}
        {podeEditar && !noCancel.has(String(selected?.status)) ? <Button title="Cancelar pagamento" tone="red" onPress={() => begin('cancel')} /> : null}
        {podeReembolsar && canRefund.has(String(selected?.status)) ? <Button title="Solicitar reembolso" tone="green" onPress={() => begin('refund')} /> : null}
      </View>
    </AppModal>
    <PaymentOperationModal payment={formPayment} mode={formMode} onClose={() => { setFormPayment(null); setFormMode(null); }} onSuccess={async (updated) => {
      setSelected(updated);
      await refetch();
      setNotice('Pagamento e venda relacionada foram atualizados.');
    }} />
    <AppModal visible={operation === 'cancel'} onClose={() => !busy && setOperation(null)} position="center" size="sm" title="Confirmar cancelamento">
      <Text style={styles.warning}>Esta ação pode cancelar a Checkout Session ou o PaymentIntent. Use reembolso se o pagamento já foi confirmado.</Text>
      <FormField label="Motivo administrativo (mínimo 3 caracteres)" value={reason} onChangeText={setReason} multiline />
      <Button title={busy ? 'Cancelando...' : 'Confirmar cancelamento'} tone="red" onPress={!busy && reason.trim().length >= 3 ? submitCancel : undefined} />
    </AppModal>
    <AppModal visible={operation === 'refund'} onClose={() => !busy && setOperation(null)} position="center" title="Confirmar reembolso Stripe">
      <Text style={styles.warning}>A solicitação será enviada à Stripe pelo backend. Aguarde a confirmação definitiva do status.</Text>
      <Text style={styles.value}>Original: {formatCurrencyBRL(amount(selected) / 100)} · já reembolsado: {formatCurrencyBRL(refunded(selected) / 100)} · saldo: {formatCurrencyBRL(balance / 100)}</Text>
      <View style={styles.filters}>
        <ChoiceGroup
          options={[{ value: 'total', label: 'Total restante' }, { value: 'partial', label: 'Parcial' }]}
          value={refundType}
          onChange={(value) => setRefundType(value as 'total' | 'partial')}
        />
      </View>
      {refundType === 'partial' ? <FormField label="Valor parcial em reais" value={refundValue} onChangeText={setRefundValue} keyboardType="decimal-pad" placeholder="0,00" /> : null}
      <Text style={styles.label}>Motivo Stripe</Text>
      <View style={styles.filters}>
        <ChoiceGroup
          options={(['requested_by_customer', 'duplicate', 'fraudulent'] as const).map((v) => ({ value: v, label: { requested_by_customer: 'Pedido do cliente', duplicate: 'Cobrança duplicada', fraudulent: 'Fraude' }[v] }))}
          value={stripeReason}
          onChange={(value) => setStripeReason(value as StripeRefundReason)}
        />
      </View>
      <FormField label="Justificativa administrativa" value={reason} onChangeText={setReason} multiline />
      <Button title={busy ? 'Enviando...' : 'Confirmar reembolso'} tone="green" onPress={!busy && reason.trim().length >= 3 ? submitRefund : undefined} />
    </AppModal>
  </Screen>;
}

function Detail({ label, value }: { label: string; value?: unknown }) { return <InfoRow label={label} value={value == null || value === '' || value === '-' ? undefined : String(value)} />; }
function Details({ payment, balance }: { payment: Pagamento; balance: number }) {
  const person = customer(payment); const disputed = ['CONTESTADO', 'CONTESTACAO_PERDIDA'].includes(String(payment.status));
  return <View style={styles.details}>
    {disputed ? <View style={[styles.alert, payment.status === 'CONTESTACAO_PERDIDA' && styles.alertLost]}><Text style={styles.alertTitle}>{payment.status === 'CONTESTACAO_PERDIDA' ? 'Contestação perdida' : 'Situação financeira sob análise'}</Text><Text style={styles.meta}>O ingresso não é excluído automaticamente. Status anterior: {payment.statusBeforeDispute ?? '-'}</Text></View> : null}
    <Text style={styles.groupTitle}>Venda</Text>
    <InfoList><Detail label="Pedido" value={payment.pedido?.code ?? payment.pedido?.id} /><Detail label="Cliente" value={`${person?.nome ?? person?.name ?? payment.nomeCustomer ?? '-'} · ${maskCpf(person?.cpf ?? payment.cpfCustomer)}`} /><Detail label="Evento/curso" value={(payment.evento ?? payment.curso)?.nome} /></InfoList>
    <Text style={styles.groupTitle}>Valores</Text>
    <InfoList><Detail label="Valor original" value={formatCurrencyBRL(amount(payment) / 100)} /><Detail label="Valor reembolsado" value={formatCurrencyBRL(refunded(payment) / 100)} /><Detail label="Saldo reembolsável" value={formatCurrencyBRL(balance / 100)} /></InfoList>
    <Text style={styles.groupTitle}>Situação</Text>
    <InfoList><Detail label="Moeda" value={payment.moeda ?? 'BRL'} /><Detail label="Status" value={payment.status} /><Detail label="Origem" value={payment.origem} /></InfoList>
    <Text style={styles.groupTitle}>Datas</Text>
    <InfoList><Detail label="Checkout criado em" value={formatDateTime(payment.checkoutCreatedAt ?? payment.createdAt)} /><Detail label="Expiração" value={formatDateTime(payment.expiresAt)} /><Detail label="Confirmado em" value={formatDateTime(payment.paidAt)} /><Detail label="Reembolso em" value={formatDateTime(payment.refundedAt)} /></InfoList>
    <Text style={styles.groupTitle}>Stripe</Text>
    <InfoList><Detail label="Checkout Session" value={payment.stripeCheckoutSessionId} /><Detail label="PaymentIntent" value={payment.stripePaymentIntentId} /><Detail label="Charge" value={payment.stripeChargeId} /><Detail label="Refund" value={payment.stripeRefundId} /><Detail label="Dispute" value={payment.stripeDisputeId} /></InfoList>
    <Text style={styles.groupTitle}>Contestação</Text>
    <InfoList><Detail label="Status da contestação" value={payment.disputeStatus} /><Detail label="Valor contestado" value={payment.disputedAmount == null ? '-' : formatCurrencyBRL(payment.disputedAmount / 100)} /></InfoList>
  </View>;
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 10 },
  list: { gap: 10, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, borderRadius: theme.radius.lg, padding: 14, paddingRight: 8 },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontSize: 15, fontFamily: theme.font.semiBold, flex: 1 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  value: { color: colors.text, fontSize: 16, fontFamily: theme.font.semiBold, marginTop: 6 },
  dispute: { color: '#FF8A50', fontFamily: theme.font.bold, marginTop: 5 },
  notice: { color: colors.yellow, fontFamily: theme.font.semiBold, marginTop: 10 },
  footer: { gap: 10, marginTop: 18 },
  warning: { color: colors.yellow, lineHeight: 20, marginBottom: 6 },
  label: { color: colors.muted, fontSize: 11, fontFamily: theme.font.semiBold },
  details: { gap: 8 },
  groupTitle: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.medium, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 10 },
  alert: { padding: 12, borderRadius: 12, backgroundColor: '#3A2512', borderWidth: 1, borderColor: '#D84B20' },
  alertLost: { backgroundColor: '#351010', borderColor: '#8B1010' },
  alertTitle: { color: colors.text, fontFamily: theme.font.bold, marginBottom: 4 }
});
