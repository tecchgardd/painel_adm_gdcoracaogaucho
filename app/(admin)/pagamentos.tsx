import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionMenu, AppModal, Button, FormField, Header, Screen, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { cancelarPagamento, darBaixaExterna, ExternalPaymentMethod, getPagamento, listPagamentos, PagamentoStatus, reembolsarPagamento, StripeRefundReason } from '@/services/pagamentos.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { Pagamento } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf, parseCurrencyToCents } from '@/utils/format';

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

export default function Pagamentos() {
  const role = useAuthStore((state) => state.role);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PagamentoStatus | undefined>();
  const [customerId, setCustomerId] = useState('');
  const [selected, setSelected] = useState<Pagamento | null>(null);
  const [operation, setOperation] = useState<'cancel' | 'refund' | 'external' | null>(null);
  const [externalMethod, setExternalMethod] = useState<ExternalPaymentMethod>('PIX_EXTERNO');
  const [reason, setReason] = useState('');
  const [refundType, setRefundType] = useState<'total' | 'partial'>('total');
  const [refundValue, setRefundValue] = useState('');
  const [stripeReason, setStripeReason] = useState<StripeRefundReason>('requested_by_customer');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const query = useCallback(() => listPagamentos({ page, limit: 20, status, customerId: customerId.trim() || undefined }), [page, status, customerId]);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: { data: [], total: 0, page: 1, limit: 20 } });
  const payments = data?.data ?? [];
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));
  const balance = useMemo(() => Math.max(0, amount(selected) - refunded(selected)), [selected]);

  async function openDetails(payment: Pagamento) {
    setNotice('');
    try { setSelected(await getPagamento(payment.id)); }
    catch (e) { setNotice(safeError(e, 'Não foi possível carregar os detalhes.')); }
  }
  function begin(kind: 'cancel' | 'refund' | 'external') { setOperation(kind); setReason(''); setRefundValue(''); setRefundType('total'); setStripeReason('requested_by_customer'); }
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
  async function submitExternal() {
    if (!selected || busy || reason.trim().length < 3) return;
    setBusy(true); setNotice('');
    try { await darBaixaExterna(selected.id, { method: externalMethod, reason: reason.trim() }); await refetch(); setSelected(null); setOperation(null); setNotice('Cobrança Stripe encerrada e pagamento externo confirmado.'); }
    catch (e) { setNotice(safeError(e, 'Não foi possível registrar o pagamento externo.')); }
    finally { setBusy(false); }
  }

  return <Screen variant="admin">
    <Header title="Pagamentos" />
    <Text style={styles.meta}>Cobranças de cursos, ingressos, lotes, painel e WhatsApp em um só lugar.</Text>
    <View style={styles.filters}>
      <TouchableOpacity onPress={() => { setStatus(undefined); setPage(1); }} style={[styles.chip, !status && styles.chipActive]}><Text style={styles.chipText}>TODOS</Text></TouchableOpacity>
      {statuses.map((item) => <TouchableOpacity key={item} onPress={() => { setStatus(item); setPage(1); }} style={[styles.chip, status === item && styles.chipActive]}><Text style={styles.chipText}>{item.replaceAll('_', ' ')}</Text></TouchableOpacity>)}
    </View>
    <FormField label="Filtrar por ID do cliente" value={customerId} onChangeText={(v) => { setCustomerId(v); setPage(1); }} placeholder="customerId" />
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {loading ? <Text style={styles.state}>Carregando pagamentos...</Text> : null}
    {error ? <TouchableOpacity onPress={refetch} style={styles.error}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
    <View style={styles.list}>{payments.map((payment) => {
      const person = customer(payment);
      const actions: { label: string; icon: any; onPress: () => void }[] = [{ label: 'Ver detalhes', icon: 'eye-outline', onPress: () => openDetails(payment) }];
      if (role !== 'CHECKIN' && !noCancel.has(String(payment.status))) actions.push({ label: 'Cancelar', icon: 'close-circle-outline' as const, onPress: async () => { await openDetails(payment); setOperation('cancel'); } });
      if (role !== 'CHECKIN' && !noCancel.has(String(payment.status))) actions.unshift({ label: 'Dar baixa externa', icon: 'cash-check' as const, onPress: async () => { await openDetails(payment); setOperation('external'); } });
      if (role === 'ADMIN' && canRefund.has(String(payment.status))) actions.push({ label: 'Reembolsar', icon: 'cash-refund' as const, onPress: async () => { await openDetails(payment); setOperation('refund'); } });
      return <View key={payment.id} style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => openDetails(payment)}>
          <View style={styles.cardHeader}><Text style={styles.title}>{person?.nome ?? person?.name ?? `Pagamento ${payment.id}`}</Text><StatusBadge status={String(payment.status ?? 'PENDENTE')} /></View>
          <Text style={styles.meta}>ID: {payment.id} · CPF: {maskCpf(person?.cpf)}</Text>
          <Text style={styles.meta}>{(payment.evento ?? payment.curso)?.nome ?? 'Evento/curso não informado'} · Pedido {String((payment.pedido as any)?.id ?? '-')}</Text>
          <Text style={styles.value}>{formatCurrencyBRL(amount(payment) / 100)} <Text style={styles.meta}>· reembolsado {formatCurrencyBRL(refunded(payment) / 100)}</Text></Text>
          <Text style={styles.meta}>{payment.origem ?? '-'} · criado {formatDateTime(payment.createdAt)} · pago {formatDateTime(payment.paidAt)} · reembolso {formatDateTime(payment.refundedAt)}</Text>
          {payment.disputeStatus ? <Text style={styles.dispute}>Contestação: {payment.disputeStatus}</Text> : null}
        </TouchableOpacity><ActionMenu actions={actions} />
      </View>;
    })}</View>
    {!loading && !error && !payments.length ? <Text style={styles.state}>Nenhum pagamento encontrado.</Text> : null}
    <View style={styles.pagination}><Button title="Anterior" tone="dark" onPress={page > 1 ? () => setPage(page - 1) : undefined} /><Text style={styles.page}>Página {page} de {totalPages}</Text><Button title="Próxima" tone="dark" onPress={page < totalPages ? () => setPage(page + 1) : undefined} /></View>

    <AppModal visible={!!selected && !operation} onClose={() => setSelected(null)} position="center" title="Detalhes do pagamento">
      {selected ? <Details payment={selected} balance={balance} /> : null}
      <View style={styles.footer}>
        {role !== 'CHECKIN' && !noCancel.has(String(selected?.status)) ? <Button title="Receber pagamento externo" tone="green" onPress={() => begin('external')} /> : null}
        {role !== 'CHECKIN' && !noCancel.has(String(selected?.status)) ? <Button title="Cancelar pagamento" tone="red" onPress={() => begin('cancel')} /> : null}
        {role === 'ADMIN' && canRefund.has(String(selected?.status)) ? <Button title="Solicitar reembolso" tone="green" onPress={() => begin('refund')} /> : null}
      </View>
    </AppModal>
    <AppModal visible={operation === 'external'} onClose={() => !busy && setOperation(null)} position="center" title="Dar baixa externa">
      <Text style={styles.warning}>A cobrança Stripe pendente será encerrada e substituída por este recebimento, mantendo todo o histórico.</Text>
      <Text style={styles.label}>Forma recebida</Text>
      <View style={styles.filters}>{([
        ['PIX_EXTERNO', 'Pix'],
        ['DINHEIRO', 'Dinheiro'],
        ['CARTAO_CREDITO', 'Crédito'],
        ['CARTAO_DEBITO', 'Débito']
      ] as [ExternalPaymentMethod, string][]).map(([value, label]) => <Choice key={value} label={label} active={externalMethod === value} onPress={() => setExternalMethod(value)} />)}</View>
      <FormField label="Justificativa/observação" value={reason} onChangeText={setReason} multiline placeholder="Ex.: aluno pagou presencialmente na aula" />
      <Button title={busy ? 'Confirmando...' : 'Confirmar recebimento'} tone="green" onPress={!busy && reason.trim().length >= 3 ? submitExternal : undefined} />
    </AppModal>
    <AppModal visible={operation === 'cancel'} onClose={() => !busy && setOperation(null)} position="center" title="Confirmar cancelamento">
      <Text style={styles.warning}>Esta ação pode cancelar a Checkout Session ou o PaymentIntent. Use reembolso se o pagamento já foi confirmado.</Text>
      <FormField label="Motivo administrativo (mínimo 3 caracteres)" value={reason} onChangeText={setReason} multiline />
      <Button title={busy ? 'Cancelando...' : 'Confirmar cancelamento'} tone="red" onPress={!busy && reason.trim().length >= 3 ? submitCancel : undefined} />
    </AppModal>
    <AppModal visible={operation === 'refund'} onClose={() => !busy && setOperation(null)} position="center" title="Confirmar reembolso Stripe">
      <Text style={styles.warning}>A solicitação será enviada à Stripe pelo backend. Aguarde a confirmação definitiva do status.</Text>
      <Text style={styles.value}>Original: {formatCurrencyBRL(amount(selected) / 100)} · já reembolsado: {formatCurrencyBRL(refunded(selected) / 100)} · saldo: {formatCurrencyBRL(balance / 100)}</Text>
      <View style={styles.filters}><Choice label="Total restante" active={refundType === 'total'} onPress={() => setRefundType('total')} /><Choice label="Parcial" active={refundType === 'partial'} onPress={() => setRefundType('partial')} /></View>
      {refundType === 'partial' ? <FormField label="Valor parcial em reais" value={refundValue} onChangeText={setRefundValue} keyboardType="decimal-pad" placeholder="0,00" /> : null}
      <Text style={styles.label}>Motivo Stripe</Text><View style={styles.filters}>{(['requested_by_customer', 'duplicate', 'fraudulent'] as const).map((v) => <Choice key={v} label={v} active={stripeReason === v} onPress={() => setStripeReason(v)} />)}</View>
      <FormField label="Justificativa administrativa" value={reason} onChangeText={setReason} multiline />
      <Button title={busy ? 'Enviando...' : 'Confirmar reembolso'} tone="green" onPress={!busy && reason.trim().length >= 3 ? submitRefund : undefined} />
    </AppModal>
  </Screen>;
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={styles.chipText}>{label}</Text></TouchableOpacity>; }
function Detail({ label, value }: { label: string; value?: unknown }) { return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text selectable style={styles.detailValue}>{value == null || value === '' ? '-' : String(value)}</Text></View>; }
function Details({ payment, balance }: { payment: Pagamento; balance: number }) {
  const person = customer(payment); const disputed = ['CONTESTADO', 'CONTESTACAO_PERDIDA'].includes(String(payment.status));
  return <View style={styles.details}>
    {disputed ? <View style={[styles.alert, payment.status === 'CONTESTACAO_PERDIDA' && styles.alertLost]}><Text style={styles.alertTitle}>{payment.status === 'CONTESTACAO_PERDIDA' ? 'Contestação perdida' : 'Situação financeira sob análise'}</Text><Text style={styles.meta}>O ingresso não é excluído automaticamente. Status anterior: {payment.statusBeforeDispute ?? '-'}</Text></View> : null}
    <Detail label="Pedido" value={(payment.pedido as any)?.id} /><Detail label="Cliente" value={`${person?.nome ?? person?.name ?? '-'} · ${maskCpf(person?.cpf)}`} /><Detail label="Evento/curso" value={(payment.evento ?? payment.curso)?.nome} />
    <Detail label="Valor original" value={formatCurrencyBRL(amount(payment) / 100)} /><Detail label="Valor reembolsado" value={formatCurrencyBRL(refunded(payment) / 100)} /><Detail label="Saldo reembolsável" value={formatCurrencyBRL(balance / 100)} />
    <Detail label="Moeda" value={payment.moeda ?? 'BRL'} /><Detail label="Status" value={payment.status} /><Detail label="Origem" value={payment.origem} />
    <Detail label="Checkout criado em" value={formatDateTime(payment.checkoutCreatedAt ?? payment.createdAt)} /><Detail label="Expiração" value={formatDateTime(payment.expiresAt)} /><Detail label="Confirmado em" value={formatDateTime(payment.paidAt)} /><Detail label="Reembolso em" value={formatDateTime(payment.refundedAt)} />
    <Detail label="Checkout Session" value={payment.stripeCheckoutSessionId} /><Detail label="PaymentIntent" value={payment.stripePaymentIntentId} /><Detail label="Charge" value={payment.stripeChargeId} /><Detail label="Refund" value={payment.stripeRefundId} /><Detail label="Dispute" value={payment.stripeDisputeId} />
    <Detail label="Status da contestação" value={payment.disputeStatus} /><Detail label="Valor contestado" value={payment.disputedAmount == null ? '-' : formatCurrencyBRL(payment.disputedAmount / 100)} />
  </View>;
}

const styles = StyleSheet.create({
  filters:{flexDirection:'row',flexWrap:'wrap',gap:7,marginVertical:10},chip:{borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,borderRadius:10,paddingHorizontal:9,paddingVertical:7},chipActive:{borderColor:colors.red,backgroundColor:'#3B1717'},chipText:{color:colors.text,fontSize:10,fontWeight:'800'},list:{gap:10,marginTop:12},row:{flexDirection:'row',alignItems:'flex-start',gap:8},card:{flex:1,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,borderRadius:14,padding:13},cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},title:{color:colors.text,fontSize:15,fontWeight:'900',flex:1},meta:{color:colors.muted,fontSize:12,lineHeight:18},value:{color:colors.text,fontWeight:'900',marginTop:5},dispute:{color:'#FF8A50',fontWeight:'900',marginTop:5},state:{color:colors.muted,fontWeight:'800',marginTop:12},error:{padding:12,backgroundColor:'#241414',borderRadius:12,marginTop:10},errorText:{color:colors.text},retry:{color:colors.red,fontWeight:'900',marginTop:6},notice:{color:colors.yellow,fontWeight:'800',marginTop:10},pagination:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12,marginVertical:18},page:{color:colors.muted,fontWeight:'800'},footer:{gap:10,marginTop:18},warning:{color:colors.yellow,lineHeight:20,marginBottom:6},label:{color:colors.muted,fontSize:11,fontWeight:'800'},details:{gap:8},detail:{borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:7},detailValue:{color:colors.text,fontWeight:'700',marginTop:3},alert:{padding:12,borderRadius:12,backgroundColor:'#3A2512',borderWidth:1,borderColor:'#D84B20'},alertLost:{backgroundColor:'#351010',borderColor:'#8B1010'},alertTitle:{color:colors.text,fontWeight:'900',marginBottom:4}
});
