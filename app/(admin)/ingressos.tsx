import { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActionMenu, AppModal, Button, FormField, Header, ListCard, Screen, SearchBar, StatCard, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { listEventos } from '@/services/eventos.service';
import { gerarLinkPagamentoLote, gerarLoteIngressos, listLotesIngressos, registrarPagamentoLote } from '@/services/ingressos.service';
import { findPersonByCpf } from '@/services/people.service';
import { colors } from '@/theme/colors';
import { formatCurrencyBRL, formatDateTime, parseCurrencyInput } from '@/utils/format';

type Origin = 'SEM_COBRANCA' | 'CORTESIA' | 'NOVA_VENDA' | 'VENDA_EXISTENTE' | 'PAGAMENTO_EXTERNO';
type ExternalMethod = 'PIX_EXTERNO' | 'DINHEIRO' | 'CARTAO_EXTERNO';

const origins: { value: Origin; label: string }[] = [
  { value: 'SEM_COBRANCA', label: 'Sem cobrança' },
  { value: 'CORTESIA', label: 'Cortesia' },
  { value: 'NOVA_VENDA', label: 'Nova venda' },
  { value: 'VENDA_EXISTENTE', label: 'Venda existente' },
  { value: 'PAGAMENTO_EXTERNO', label: 'Pagamento externo' }
];

function normalizeBatch(lote: any) {
  const customer = lote.customer ?? lote.inscricao?.customer ?? {};
  const evento = lote.evento ?? lote.inscricao?.evento ?? {};
  const tickets = lote.tickets ?? [];
  const used = tickets.filter((ticket: any) => ticket.status === 'UTILIZADO').length;
  const cancelled = tickets.filter((ticket: any) => ['CANCELADO', 'EXPIRADO'].includes(ticket.status)).length;
  return {
    ...lote,
    id: String(lote.id),
    customer,
    evento,
    tickets,
    used,
    available: Math.max(0, Number(lote.quantidade ?? tickets.length) - used - cancelled),
    statusOperacional: lote.statusOperacional ?? (used ? 'PARCIALMENTE_UTILIZADO' : 'ATIVO')
  };
}

export default function Ingressos() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [cpf, setCpf] = useState('');
  const [person, setPerson] = useState<any>(null);
  const [eventoId, setEventoId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [valorUnitario, setValorUnitario] = useState('0');
  const [origin, setOrigin] = useState<Origin>('SEM_COBRANCA');
  const [externalMethod, setExternalMethod] = useState<ExternalMethod>('PIX_EXTERNO');
  const [pedidoId, setPedidoId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentLink, setPaymentLink] = useState<{ checkoutUrl: string; shareText: string } | null>(null);
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryLotes = useCallback(() => listLotesIngressos(), []);
  const { data, loading, error, refetch } = useApiQuery(queryLotes, { fallbackData: [] });
  const queryEventos = useCallback(() => listEventos({ status: 'ATIVO' }), []);
  const { data: eventData } = useApiQuery(queryEventos, { fallbackData: [] });
  const events = useMemo(() => (eventData ?? []).filter((event: any) => event.tipo === 'EVENTO' || event.tipo === 'BAILE'), [eventData]);
  const batches = useMemo(() => (data ?? []).map(normalizeBatch), [data]);
  const filtered = batches.filter((batch) => `${batch.id} ${batch.customer.nome ?? ''} ${batch.customer.cpf ?? ''} ${batch.evento.nome ?? ''} ${batch.statusOperacional}`.toLowerCase().includes(search.toLowerCase()));
  const summary = batches.reduce((acc, batch) => {
    if (batch.statusOperacional === 'ATIVO' || batch.statusOperacional === 'PARCIALMENTE_UTILIZADO') acc.active += 1;
    acc.available += batch.available;
    acc.used += batch.used;
    if (batch.available === 0 && batch.tickets.length) acc.exhausted += 1;
    return acc;
  }, { active: 0, available: 0, used: 0, exhausted: 0 });

  function openNew() {
    setCpf(''); setPerson(null); setEventoId(''); setQuantidade('1'); setValorUnitario('0');
    setOrigin('SEM_COBRANCA'); setPedidoId(''); setObservacao(''); setMessage(''); setOpen(true);
  }

  async function findStudent() {
    setMessage(''); setPerson(null);
    try {
      const result = await findPersonByCpf(cpf);
      if (!result.success || !result.data) return setMessage(result.message ?? 'Aluno não encontrado.');
      setPerson(result.data);
    } catch (cause) {
      setMessage((cause as { message?: string }).message ?? 'Aluno não encontrado.');
    }
  }

  function selectEvent(id: string) {
    const event = events.find((item: any) => String(item.id) === id);
    setEventoId(id);
    setValorUnitario(String(event?.preco ?? 0));
  }

  async function generate() {
    if (!person || !eventoId || submitting) return;
    setSubmitting(true); setMessage('');
    try {
      await gerarLoteIngressos({
        customerId: person.id,
        cpf,
        eventoId,
        quantidade: Number(quantidade),
        origemFinanceira: origin,
        pedidoId: origin === 'VENDA_EXISTENTE' ? pedidoId : undefined,
        valorUnitario: parseCurrencyInput(valorUnitario),
        observacoes: observacao || undefined,
        formaPagamentoExterno: origin === 'PAGAMENTO_EXTERNO' ? externalMethod : undefined
      });
      setOpen(false);
      await refetch();
    } catch (cause) {
      setMessage((cause as { message?: string }).message ?? 'Não foi possível gerar o lote.');
    } finally {
      setSubmitting(false);
    }
  }

  async function markPaid(id: string) { await registrarPagamentoLote(id, { paymentStatus: 'PAGO', reason: 'Pagamento externo confirmado no painel' }); refetch(); }
  async function createLink(batch: any) {
    try {
      const result = await gerarLinkPagamentoLote(batch.id);
      setPaymentLink({ checkoutUrl: result.checkoutUrl, shareText: result.shareText });
    } catch (cause) { setMessage((cause as { message?: string }).message ?? 'Não foi possível gerar o link.'); }
  }
  async function copyLink() {
    if (paymentLink && Platform.OS === 'web' && navigator.clipboard) await navigator.clipboard.writeText(paymentLink.shareText);
  }

  return <Screen variant="admin">
    <Header title="Lotes de ingressos" right={<TouchableOpacity onPress={openNew} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />
    <View style={styles.stats}><StatCard title="Lotes ativos" value={String(summary.active)} tone="green" /><StatCard title="Disponíveis" value={String(summary.available)} tone="yellow" /><StatCard title="Utilizados" value={String(summary.used)} tone="green" /><StatCard title="Esgotados" value={String(summary.exhausted)} tone="red" /></View>
    <SearchBar value={search} onChangeText={setSearch} placeholder="Aluno, CPF, evento, baile ou lote" />
    {loading ? <Text style={styles.state}>Carregando lotes...</Text> : null}
    {error ? <TouchableOpacity onPress={refetch} style={styles.error}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
    {!loading && !error && !filtered.length ? <Text style={styles.state}>Nenhum lote de ingressos foi gerado para alunos.</Text> : null}
    <View style={styles.grid}>{filtered.map((batch) => <View key={batch.id} style={[styles.row, { width: itemWidth }]}>
      <View style={styles.rowCard}><ListCard title={`Lote ${batch.id} · ${batch.customer.nome ?? 'Aluno'}`} subtitle={`${batch.evento.nome ?? 'Evento'}\n${batch.available} disponíveis · ${batch.used} utilizados · ${formatDateTime(batch.createdAt)}`} status={batch.statusOperacional} /></View>
      <ActionMenu actions={[
        { label: 'Ver ingressos', icon: 'ticket-outline', onPress: () => setMessage(`${batch.tickets.length} ingresso(s) no lote ${batch.id}.`) },
        ...(batch.paymentStatus === 'PENDENTE' ? [{ label: 'Gerar link', icon: 'link-variant' as const, onPress: () => createLink(batch) }, { label: 'Dar baixa', icon: 'cash-check' as const, onPress: () => markPaid(batch.id) }] : [])
      ]} />
    </View>)}</View>

    <AppModal visible={open} onClose={() => setOpen(false)} position="center" title="Gerar lote de ingressos" footer={<View style={styles.footer}><View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setOpen(false)} /></View><View style={styles.footerItem}><Button title={submitting ? 'Gerando...' : 'Gerar lote'} tone="green" onPress={!submitting && person && eventoId ? generate : undefined} /></View></View>}>
      <Text style={styles.step}>1. Buscar aluno</Text>
      <View style={styles.inline}><View style={styles.inlineItem}><FormField label="CPF do aluno" value={cpf} onChangeText={setCpf} keyboardType="numeric" /></View><TouchableOpacity style={styles.lookup} onPress={findStudent}><MaterialCommunityIcons name="account-search-outline" color="#fff" size={20} /><Text style={styles.lookupText}>Buscar</Text></TouchableOpacity></View>
      {person ? <View style={styles.summary}><View style={styles.summaryHeader}><Text style={styles.summaryTitle}>{person.nome}</Text><StatusBadge status={person.tipo ?? 'ALUNO'} /></View><Text style={styles.meta}>CPF: {person.cpf}</Text><Text style={styles.meta}>Telefone: {person.telefone ?? '-'}</Text><Text style={styles.meta}>Situação cadastral: ativo</Text></View> : null}

      <Text style={styles.step}>2. Evento ou baile</Text>
      <View style={styles.options}>{events.map((event: any) => <TouchableOpacity key={event.id} onPress={() => selectEvent(String(event.id))} style={[styles.eventOption, eventoId === String(event.id) && styles.optionActive]}><Text style={styles.optionTitle}>{event.nome}</Text><Text style={styles.meta}>{event.tipo} · {formatDateTime(event.data)} · {event.local}</Text><Text style={styles.meta}>Capacidade: {event.capacidade ?? 'sem limite'} · {formatCurrencyBRL(event.preco ?? 0)}</Text></TouchableOpacity>)}</View>

      <Text style={styles.step}>3. Quantidade e origem financeira</Text>
      <View style={styles.inline}><View style={styles.inlineItem}><FormField label="Quantidade" value={quantidade} onChangeText={setQuantidade} keyboardType="numeric" /></View><View style={styles.inlineItem}><FormField label="Valor unitário" value={valorUnitario} onChangeText={setValorUnitario} keyboardType="decimal-pad" /></View></View>
      <View style={styles.chips}>{origins.map((item) => <TouchableOpacity key={item.value} onPress={() => setOrigin(item.value)} style={[styles.chip, origin === item.value && styles.chipActive]}><Text style={styles.chipText}>{item.label}</Text></TouchableOpacity>)}</View>
      {origin === 'VENDA_EXISTENTE' ? <FormField label="Código/ID da venda existente" value={pedidoId} onChangeText={setPedidoId} keyboardType="numeric" /> : null}
      {origin === 'PAGAMENTO_EXTERNO' ? <View style={styles.chips}>{(['PIX_EXTERNO', 'DINHEIRO', 'CARTAO_EXTERNO'] as ExternalMethod[]).map((method) => <TouchableOpacity key={method} onPress={() => setExternalMethod(method)} style={[styles.chip, externalMethod === method && styles.chipActive]}><Text style={styles.chipText}>{method.replaceAll('_', ' ')}</Text></TouchableOpacity>)}</View> : null}
      <FormField label={origin === 'CORTESIA' || origin === 'SEM_COBRANCA' ? 'Motivo/observação obrigatória' : 'Observação'} value={observacao} onChangeText={setObservacao} multiline />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </AppModal>

    <AppModal visible={!!paymentLink} onClose={() => setPaymentLink(null)} title="Link de pagamento">
      {paymentLink ? <><Text selectable style={styles.link}>{paymentLink.checkoutUrl}</Text><View style={styles.footer}><Button title="Copiar" tone="dark" onPress={copyLink} /><Button title="Abrir" tone="green" onPress={() => Linking.openURL(paymentLink.checkoutUrl)} /></View></> : null}
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  plus: { backgroundColor: colors.red, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, rowCard: { flex: 1 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 10 },
  error: { padding: 12, borderRadius: 12, backgroundColor: '#241414' }, errorText: { color: colors.text }, retry: { color: colors.red, fontWeight: '900', marginTop: 5 },
  step: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 18, marginBottom: 4 },
  inline: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' }, inlineItem: { flex: 1 },
  lookup: { height: 46, borderRadius: 12, backgroundColor: colors.red, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }, lookupText: { color: '#fff', fontWeight: '900' },
  summary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, borderRadius: 14, padding: 12, marginTop: 12 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, summaryTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 }, options: { gap: 8, marginTop: 8 },
  eventOption: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, padding: 11 }, optionActive: { borderColor: colors.green, backgroundColor: '#152A18' }, optionTitle: { color: colors.text, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.card }, chipActive: { borderColor: colors.red, backgroundColor: '#351616' }, chipText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  message: { color: colors.yellow, fontWeight: '800', marginTop: 10 }, footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, footerItem: { flex: 1, minWidth: 120 }, link: { color: colors.text, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 12 }
});
