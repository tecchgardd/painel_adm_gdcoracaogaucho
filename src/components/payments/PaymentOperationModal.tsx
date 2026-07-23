import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppModal, Button, FormField } from '@/components/ui';
import { editarPagamento, EditPaymentPayload, ExternalPaymentMethod, ManualPaymentPayload, substituirPorPagamentoExterno } from '@/services/pagamentos.service';
import { colors } from '@/theme/colors';
import type { Pagamento } from '@/types/entities';
import { formatCurrencyBRL, parseCurrencyToCents } from '@/utils/format';

type Mode = 'edit' | 'external';
const methods: { value: ExternalPaymentMethod; label: string }[] = [
  { value: 'PIX_EXTERNO', label: 'PIX externo' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Cartão presencial' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de débito' }
];
const statuses: EditPaymentPayload['status'][] = ['PENDENTE', 'PROCESSANDO', 'PAGO', 'FALHOU', 'CANCELADO', 'EXPIRADO'];

export function PaymentOperationModal({
  payment,
  mode,
  onClose,
  onSuccess
}: {
  payment: Pagamento | null;
  mode: Mode | null;
  onClose: () => void;
  onSuccess: (payment: Pagamento) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<ExternalPaymentMethod>('PIX_EXTERNO');
  const [status, setStatus] = useState<EditPaymentPayload['status']>('PAGO');
  const [value, setValue] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [reference, setReference] = useState('');
  const [observation, setObservation] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!payment || !mode) return;
    setMethod((payment.method as ExternalPaymentMethod) || 'PIX_EXTERNO');
    setStatus((payment.status as EditPaymentPayload['status']) || 'PAGO');
    setValue(formatCurrencyBRL(Number(payment.amount ?? 0) / 100));
    setPaidAt(payment.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setReference(payment.externalReference ?? '');
    setObservation(payment.notes ?? '');
    setReason('');
    setConfirmed(false);
    setError('');
  }, [mode, payment]);

  async function submit() {
    if (!payment || !mode || busy) return;
    const amount = parseCurrencyToCents(value);
    if (amount <= 0 || reason.trim().length < 3 || (mode === 'external' && !confirmed)) {
      setError(mode === 'external' && !confirmed ? 'Confirme que o valor foi recebido.' : 'Preencha o valor e o motivo da alteração.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const common: ManualPaymentPayload = {
        method,
        amount,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        reference: reference || undefined,
        observation: observation || undefined,
        reason: reason.trim()
      };
      const result = mode === 'external'
        ? await substituirPorPagamentoExterno(payment.id, common)
        : await editarPagamento(payment.id, { ...common, status, amount });
      await onSuccess(result);
      onClose();
    } catch (cause) {
      setError((cause as { message?: string }).message ?? 'Não foi possível salvar a alteração.');
    } finally {
      setBusy(false);
    }
  }

  return <AppModal visible={!!payment && !!mode} onClose={() => !busy && onClose()} position="center" title={mode === 'external' ? 'Substituir por pagamento externo' : 'Editar pagamento'} footer={<View style={styles.footer}><View style={styles.footerButton}><Button title="Cancelar" tone="dark" onPress={!busy ? onClose : undefined} /></View><View style={styles.footerButton}><Button title={busy ? 'Salvando...' : mode === 'external' ? 'Confirmar substituição' : 'Salvar alterações'} tone="green" onPress={!busy ? submit : undefined} /></View></View>}>
    {mode === 'external' ? <View style={styles.warning}><Text style={styles.warningText}>Ao confirmar, a cobrança Stripe pendente será cancelada ou expirada e um novo pagamento externo será registrado como pago. O registro anterior será mantido no histórico.</Text></View> : null}
    <View style={styles.summary}><Text style={styles.summaryLabel}>PAGAMENTO</Text><Text style={styles.summaryValue}>#{payment?.id} · {payment?.nomeCustomer ?? payment?.customer?.nome ?? '-'}</Text><Text style={styles.summaryMeta}>{payment?.evento?.nome ?? '-'} · {formatCurrencyBRL(Number(payment?.amount ?? 0) / 100)}</Text></View>
    <Text style={styles.label}>Forma de pagamento</Text>
    <View style={styles.choices}>{methods.map((item) => <Choice key={item.value} label={item.label} active={method === item.value} onPress={() => setMethod(item.value)} />)}</View>
    {mode === 'edit' ? <><Text style={styles.label}>Status</Text><View style={styles.choices}>{statuses.map((item) => <Choice key={item} label={item.replaceAll('_', ' ')} active={status === item} onPress={() => setStatus(item)} />)}</View></> : null}
    <View style={styles.twoColumns}><View style={styles.column}><FormField label="Valor pago" value={value} onChangeText={setValue} keyboardType="decimal-pad" /></View><View style={styles.column}><FormField label="Data e hora do pagamento" value={paidAt} onChangeText={setPaidAt} placeholder="AAAA-MM-DDTHH:mm" /></View></View>
    <FormField label="Referência / Comprovante" value={reference} onChangeText={setReference} placeholder="Código, PIX ou comprovante" />
    <FormField label="Observação" value={observation} onChangeText={setObservation} multiline />
    <FormField label={mode === 'external' ? 'Motivo da substituição' : 'Motivo da alteração'} value={reason} onChangeText={setReason} multiline />
    {mode === 'external' ? <TouchableOpacity style={[styles.confirm, confirmed && styles.confirmActive]} onPress={() => setConfirmed(!confirmed)}><View style={[styles.checkbox, confirmed && styles.checkboxActive]}>{confirmed ? <Text style={styles.check}>✓</Text> : null}</View><Text style={styles.confirmText}>Confirmo que o valor informado foi recebido.</Text></TouchableOpacity> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </AppModal>;
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  warning:{borderWidth:1,borderColor:'#16738A',backgroundColor:'#102D34',borderRadius:12,padding:14,marginBottom:14},warningText:{color:'#C6F4FF',fontSize:13,lineHeight:20,textAlign:'center'},summary:{borderRadius:12,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,padding:14,marginBottom:14},summaryLabel:{color:colors.red,fontSize:10,fontWeight:'900',letterSpacing:1.5},summaryValue:{color:colors.text,fontSize:15,fontWeight:'900',marginTop:5},summaryMeta:{color:colors.muted,fontSize:12,marginTop:4},label:{color:colors.text,fontSize:12,fontWeight:'900',marginTop:12,marginBottom:8},choices:{flexDirection:'row',flexWrap:'wrap',gap:7},choice:{minHeight:38,borderWidth:1,borderColor:colors.border,borderRadius:10,paddingHorizontal:11,alignItems:'center',justifyContent:'center',backgroundColor:colors.card},choiceActive:{borderColor:colors.red,backgroundColor:'#451818'},choiceText:{color:colors.muted,fontSize:11,fontWeight:'800'},choiceTextActive:{color:'#fff'},twoColumns:{flexDirection:'row',flexWrap:'wrap',gap:12},column:{flex:1,minWidth:210},confirm:{minHeight:54,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,marginTop:16,padding:12,flexDirection:'row',alignItems:'center',gap:10},confirmActive:{borderColor:'#2E7D32',backgroundColor:'#15331B'},checkbox:{width:22,height:22,borderRadius:6,borderWidth:1,borderColor:colors.muted,alignItems:'center',justifyContent:'center'},checkboxActive:{backgroundColor:'#2E7D32',borderColor:'#55C467'},check:{color:'#fff',fontWeight:'900'},confirmText:{color:colors.text,fontWeight:'700',flex:1},error:{color:'#FF7B7B',fontWeight:'800',marginTop:12},footer:{flexDirection:'row',gap:10},footerButton:{flex:1,minWidth:130}
});
