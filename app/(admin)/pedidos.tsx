import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActionMenu, AppModal, Button, FormField, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { createPedido, listPedidos, updatePedido } from '@/services/pedidos.service';
import { createCustomer, findCustomerByCpf } from '@/services/customers.service';
import { listEventos } from '@/services/eventos.service';
import { colors } from '@/theme/colors';
import { useResponsive } from '@/hooks/useResponsive';
import { formatCurrencyBRL, formatDateTime, parseCurrencyInput } from '@/utils/format';
import { clienteSchema, pedidoEventoSchema, pedidoLojaSchema } from '@/validation/schemas';

type PedidoTab = 'LOJA' | 'EVENTO';

const emptyLoja = { tipo: 'LOJA', status: 'PENDENTE', formaPagamento: 'Pix', entregaRetirada: 'Retirada', quantidade: '1', valorUnitario: '0' };
const emptyEvento = { tipo: 'EVENTO', eventoTipo: 'BAILE', status: 'PENDENTE', statusPagamento: 'PENDENTE', quantidade: '1', valor: '0', cortesia: false };

export default function Pedidos() {
  const [activeTab, setActiveTab] = useState<PedidoTab>('LOJA');
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [quickCustomer, setQuickCustomer] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryPedidos = useCallback(() => listPedidos({ type: activeTab === 'LOJA' ? 'STORE' : 'EVENT' }), [activeTab]);
  const { data: apiPedidos, loading, error, refetch } = useApiQuery(queryPedidos, { fallbackData: [] });
  const queryEventos = useCallback(() => listEventos(), []);
  const { data: eventos } = useApiQuery(queryEventos, { fallbackData: [] });
  const pedidos = (apiPedidos ?? []).filter((pedido: any) => (pedido.tipo ?? 'LOJA') === activeTab || (activeTab === 'LOJA' && !pedido.tipo));
  const filtered = pedidos.filter((pedido: any) =>
    `${pedido.id} ${pedido.cliente ?? ''} ${pedido.cpf ?? ''} ${pedido.status ?? ''} ${pedido.eventoNome ?? ''} ${pedido.data ?? ''}`.toLowerCase().includes(query.toLowerCase())
  );

  const title = activeTab === 'LOJA' ? 'Pedidos da loja' : 'Pedidos de eventos';

  function openNew() {
    setEditing(activeTab === 'LOJA' ? emptyLoja : emptyEvento);
    setFieldErrors({});
    setCustomerMessage('');
  }

  function patch(key: string, value: any) {
    setEditing((current: any) => ({ ...current, [key]: value }));
  }

  async function lookupCustomer(cpf: string) {
    patch('cpf', cpf);
    setCustomerMessage('');
    if (cpf.replace(/\D/g, '').length !== 11) return;
    try {
      const customer = await findCustomerByCpf(cpf);
      if (customer) {
        setEditing((current: any) => ({ ...current, cliente: customer.nome ?? customer.name ?? current.cliente, telefone: customer.telefone ?? customer.phone ?? current.telefone, customerId: customer.id }));
        setCustomerMessage('Cliente encontrado pelo CPF.');
      } else {
        setCustomerMessage('Cliente não encontrado. Use cadastro rápido.');
      }
    } catch {
      setCustomerMessage('Não foi possível buscar o cliente agora.');
    }
  }

  function buildPayload() {
    if (activeTab === 'EVENTO') {
      const event = eventos?.find((item: any) => String(item.id) === String(editing.eventoId));
      return {
        ...editing,
        tipo: 'EVENTO',
        eventoNome: event?.nome,
        valor: editing.cortesia ? '0' : editing.valor,
        total: editing.cortesia ? 0 : parseCurrencyInput(editing.valor || '0') * Number(editing.quantidade || 1),
        itens: [{ nome: editing.lote || 'Ingresso', lote: editing.lote, qtd: Number(editing.quantidade || 1), valor: editing.cortesia ? 0 : parseCurrencyInput(editing.valor || '0') }]
      };
    }
    return {
      ...editing,
      tipo: 'LOJA',
      total: parseCurrencyInput(editing.valorUnitario || '0') * Number(editing.quantidade || 1),
      itens: [{ nome: editing.produtos, qtd: Number(editing.quantidade || 1), valor: parseCurrencyInput(editing.valorUnitario || '0') }]
    };
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setFieldErrors({});
    const payload = buildPayload();
    const validation = activeTab === 'EVENTO' ? pedidoEventoSchema.safeParse(payload) : pedidoLojaSchema.safeParse(payload);
    if (!validation.success) {
      const next: Record<string, string> = {};
      validation.error.issues.forEach((issue) => { next[String(issue.path[0] ?? 'form')] = issue.message; });
      setFieldErrors(next);
      setSaving(false);
      return;
    }
    try {
      if (editing.id) await updatePedido(String(editing.id), payload);
      else await createPedido(payload);
      setEditing(null);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function saveQuickCustomer() {
    const validation = clienteSchema.safeParse({ ...quickCustomer, status: 'ATIVO' });
    if (!validation.success) return;
    const customer = await createCustomer(validation.data);
    setEditing((current: any) => ({ ...current, cliente: customer.nome ?? validation.data.nome, telefone: customer.telefone ?? validation.data.telefone, customerId: customer.id }));
    setQuickCustomer(null);
    setCustomerMessage('Cliente cadastrado e vinculado.');
  }

  const eventFilters = useMemo(() => activeTab === 'EVENTO' ? ['eventoId', 'status', 'cliente', 'cpf', 'data'] : ['status', 'cliente', 'cpf', 'data'], [activeTab]);

  return <Screen variant="admin">
    <Header title="Pedidos" right={<TouchableOpacity onPress={openNew} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />
    <View style={styles.tabs}>
      {(['LOJA', 'EVENTO'] as PedidoTab[]).map((tab) => <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => { setActiveTab(tab); setQuery(''); }}>
        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'LOJA' ? 'Pedidos da loja' : 'Pedidos de eventos'}</Text>
      </TouchableOpacity>)}
    </View>
    <SearchBar value={query} onChangeText={setQuery} placeholder={`Filtrar por ${eventFilters.join(', ')}`} />
    {loading ? <Text style={styles.state}>Carregando pedidos...</Text> : null}
    {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
    {!error && <View style={styles.grid}>
      {filtered.map((pedido: any) => <View key={pedido.id} style={[styles.row, { width: itemWidth }]}>
        <View style={styles.rowCard}>
          <ListCard title={`${pedido.id ?? '-'} - ${pedido.cliente ?? 'Cliente não informado'}`} subtitle={`${formatDateTime(pedido.data)}\n${formatCurrencyBRL(pedido.total ?? 0)}${pedido.eventoNome ? ` - ${pedido.eventoNome}` : ''}`} status={pedido.status} onPress={() => setSelected(pedido)} />
        </View>
        <ActionMenu actions={[
          { label: 'Ver pedido', icon: 'receipt-text-outline', onPress: () => setSelected(pedido) },
          { label: 'Editar pedido', icon: 'pencil-outline', onPress: () => setEditing(pedido) },
          { label: 'Cancelar pedido', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...pedido, status: 'CANCELADO' }) }
        ]} />
      </View>)}
    </View>}
    {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}

    <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? `Pedido ${selected.id}` : 'Pedido'}>
      {selected ? <>
        <View style={styles.sheetHeader}><Text style={styles.title}>Pedido {selected.id}</Text><StatusBadge status={selected.status} /></View>
        <Text style={styles.detail}>Tipo: {(selected.tipo ?? 'LOJA') === 'EVENTO' ? 'Evento' : 'Loja'}</Text>
        <Text style={styles.detail}>Cliente: {selected.cliente}</Text>
        <Text style={styles.detail}>CPF: {selected.cpf ?? '-'}</Text>
        {selected.eventoNome ? <Text style={styles.detail}>Evento: {selected.eventoNome}</Text> : null}
        {selected.cortesia ? <Text style={styles.detail}>Cortesia: {selected.motivoCortesia} - {selected.responsavelCortesia}</Text> : null}
        <Text style={styles.total}>Total: {formatCurrencyBRL(selected.total ?? 0)}</Text>
      </> : null}
    </AppModal>

    <AppModal
      visible={!!editing}
      onClose={() => setEditing(null)}
      position="center"
      title={editing?.id ? `Editar ${title.toLowerCase()}` : `Novo ${title.toLowerCase()}`}
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setEditing(null)} /></View>
        <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" onPress={saving ? undefined : save} /></View>
      </View>}
    >
      {editing ? <>
        <FormField label="CPF" value={editing.cpf ?? ''} onChangeText={lookupCustomer} keyboardType="numeric" placeholder="000.000.000-00" />
        {fieldErrors.cpf ? <Text style={styles.fieldError}>{fieldErrors.cpf}</Text> : null}
        {customerMessage ? <Text style={styles.hint}>{customerMessage}</Text> : null}
        {customerMessage.includes('não encontrado') ? <Button title="Cadastro rápido" tone="dark" onPress={() => setQuickCustomer({ cpf: editing.cpf, nome: editing.cliente ?? '', telefone: editing.telefone ?? '' })} /> : null}
        <FormField label="Cliente" value={editing.cliente ?? ''} onChangeText={(value) => patch('cliente', value)} />
        <FormField label="Telefone" value={editing.telefone ?? ''} onChangeText={(value) => patch('telefone', value)} keyboardType="phone-pad" />
        {activeTab === 'LOJA' ? <>
          <FormField label="Produtos" value={editing.produtos ?? editing.itens?.[0]?.nome ?? ''} onChangeText={(value) => patch('produtos', value)} />
          <View style={styles.inline}>
            <View style={styles.inlineItem}><FormField label="Quantidade" value={String(editing.quantidade ?? '')} onChangeText={(value) => patch('quantidade', value)} keyboardType="numeric" /></View>
            <View style={styles.inlineItem}><FormField label="Valor unitario" value={String(editing.valorUnitario ?? '')} onChangeText={(value) => patch('valorUnitario', value)} keyboardType="decimal-pad" /></View>
          </View>
          <FormField label="Forma de pagamento" value={editing.formaPagamento ?? ''} onChangeText={(value) => patch('formaPagamento', value)} />
          <FormField label="Entrega/retirada" value={editing.entregaRetirada ?? ''} onChangeText={(value) => patch('entregaRetirada', value)} />
          <FormField label="Endereco, se entrega" value={editing.enderecoEntrega ?? ''} onChangeText={(value) => patch('enderecoEntrega', value)} multiline />
        </> : <>
          <FormField label="Evento selecionado (ID)" value={String(editing.eventoId ?? '')} onChangeText={(value) => patch('eventoId', value)} placeholder="ID do evento" />
          <Segment label="Tipo do evento" value={editing.eventoTipo ?? 'BAILE'} options={['BAILE', 'CURSO', 'EVENTO']} onChange={(value) => patch('eventoTipo', value)} />
          <FormField label="Ingressos/lotes" value={editing.lote ?? ''} onChangeText={(value) => patch('lote', value)} />
          <View style={styles.inline}>
            <View style={styles.inlineItem}><FormField label="Quantidade" value={String(editing.quantidade ?? '')} onChangeText={(value) => patch('quantidade', value)} keyboardType="numeric" /></View>
            <View style={styles.inlineItem}><FormField label="Valor" value={String(editing.valor ?? '')} onChangeText={(value) => patch('valor', value)} keyboardType="decimal-pad" /></View>
          </View>
          <Segment label="Cortesia" value={editing.cortesia ? 'SIM' : 'NAO'} options={['NAO', 'SIM']} onChange={(value) => patch('cortesia', value === 'SIM')} />
          {editing.cortesia ? <>
            <FormField label="Motivo da cortesia" value={editing.motivoCortesia ?? ''} onChangeText={(value) => patch('motivoCortesia', value)} multiline />
            <FormField label="Responsavel pela cortesia" value={editing.responsavelCortesia ?? ''} onChangeText={(value) => patch('responsavelCortesia', value)} />
          </> : null}
          <FormField label="Status do pagamento" value={editing.statusPagamento ?? ''} onChangeText={(value) => patch('statusPagamento', value)} />
        </>}
        <FormField label="Status do pedido" value={editing.status ?? ''} onChangeText={(value) => patch('status', value)} />
        {Object.values(fieldErrors).length ? <Text style={styles.fieldError}>Revise os campos obrigatorios antes de salvar.</Text> : null}
      </> : null}
    </AppModal>

    <AppModal visible={!!quickCustomer} onClose={() => setQuickCustomer(null)} title="Cadastro rapido" footer={<View style={styles.footer}>
      <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setQuickCustomer(null)} /></View>
      <View style={styles.footerItem}><Button title="Salvar cliente" tone="green" onPress={saveQuickCustomer} /></View>
    </View>}>
      {quickCustomer ? <>
        <FormField label="Nome completo" value={quickCustomer.nome ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, nome: value })} />
        <FormField label="CPF" value={quickCustomer.cpf ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, cpf: value })} keyboardType="numeric" />
        <FormField label="Telefone" value={quickCustomer.telefone ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, telefone: value })} keyboardType="phone-pad" />
        <FormField label="Rua" value={quickCustomer.rua ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, rua: value })} />
        <FormField label="Numero" value={quickCustomer.numero ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, numero: value })} />
        <FormField label="Bairro" value={quickCustomer.bairro ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, bairro: value })} />
        <FormField label="Cidade" value={quickCustomer.cidade ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, cidade: value })} />
        <FormField label="Estado" value={quickCustomer.estado ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, estado: value })} />
      </> : null}
    </AppModal>
  </Screen>;
}

function Segment({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <View style={styles.segmentBlock}>
    <Text style={styles.segmentLabel}>{label}</Text>
    <View style={styles.segmentRow}>{options.map((option) => <TouchableOpacity key={option} style={[styles.segment, value === option && styles.segmentActive]} onPress={() => onChange(option)}>
      <Text style={[styles.segmentText, value === option && styles.segmentTextActive]}>{option}</Text>
    </TouchableOpacity>)}</View>
  </View>;
}

const styles = StyleSheet.create({
  plus: { backgroundColor: colors.red, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tab: { minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  tabActive: { backgroundColor: colors.red, borderColor: colors.red },
  tabText: { color: colors.muted, fontWeight: '900' },
  tabTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', flexShrink: 1 },
  detail: { color: colors.text, marginTop: 8, lineHeight: 20 },
  total: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 18 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  inline: { flexDirection: 'row', gap: 10 },
  inlineItem: { flex: 1 },
  fieldError: { color: colors.red, fontSize: 12, fontWeight: '700', marginTop: 5 },
  hint: { color: colors.muted, fontWeight: '700', marginTop: 8 },
  segmentBlock: { marginTop: 14 },
  segmentLabel: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  segmentActive: { backgroundColor: colors.red, borderColor: colors.red },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  segmentTextActive: { color: '#fff' }
});
