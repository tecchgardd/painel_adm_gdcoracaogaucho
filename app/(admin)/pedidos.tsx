import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionMenu, AppModal, Button, ChoiceGroup, FloatingActionButton, FormField, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { EmptyState } from '@/components/crud/EmptyState';
import { ErrorState } from '@/components/crud/ErrorState';
import { LoadingState } from '@/components/crud/LoadingState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { createPedido, listPedidos, updatePedido } from '@/services/pedidos.service';
import { createCustomer, findCustomerByCpf } from '@/services/customers.service';
import { listEventos } from '@/services/eventos.service';
import { colors } from '@/theme/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { formatCurrencyBRL, formatDateTime, parseCurrencyInput } from '@/utils/format';
import { clienteSchema, pedidoEventoSchema, pedidoLojaSchema } from '@/validation/schemas';

type PedidoTab = 'LOJA' | 'EVENTO';

const emptyLoja = { tipo: 'LOJA', status: 'PENDENTE', formaPagamento: 'Pix', entregaRetirada: 'Retirada', quantidade: '1', valorUnitario: '0' };
const emptyEvento = { tipo: 'EVENTO', eventoTipo: 'BAILE', status: 'PENDENTE', statusPagamento: 'PENDENTE', quantidade: '1', valor: '0', cortesia: false };

export default function Pedidos() {
  const activeTab: PedidoTab = 'LOJA';
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [quickCustomer, setQuickCustomer] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryPedidos = useCallback(() => listPedidos({ type: 'STORE' }), []);
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

  const eventFilters = ['status', 'cliente', 'cpf', 'data'];

  return <Screen variant="admin">
    <Header title="Pedidos da loja" right={<FloatingActionButton onPress={openNew} accessibilityLabel="Novo pedido" />} />
    <SearchBar value={query} onChangeText={setQuery} placeholder={`Filtrar por ${eventFilters.join(', ')}`} />
    {loading ? <LoadingState label="Carregando pedidos..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
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
    {!loading && !error && !filtered.length ? <EmptyState title="Nenhum pedido da loja encontrado." /> : null}

    <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? `Pedido ${selected.id}` : 'Pedido'}>
      {selected ? <>
        <View style={styles.sheetHeader}><StatusBadge status={selected.status} /></View>
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
          <Text style={styles.choiceLabel}>Tipo do evento</Text>
          <ChoiceGroup
            options={['BAILE', 'CURSO', 'EVENTO'].map((option) => ({ value: option, label: option }))}
            value={editing.eventoTipo ?? 'BAILE'}
            onChange={(value) => patch('eventoTipo', value)}
          />
          <FormField label="Ingressos/lotes" value={editing.lote ?? ''} onChangeText={(value) => patch('lote', value)} />
          <View style={styles.inline}>
            <View style={styles.inlineItem}><FormField label="Quantidade" value={String(editing.quantidade ?? '')} onChangeText={(value) => patch('quantidade', value)} keyboardType="numeric" /></View>
            <View style={styles.inlineItem}><FormField label="Valor" value={String(editing.valor ?? '')} onChangeText={(value) => patch('valor', value)} keyboardType="decimal-pad" /></View>
          </View>
          <Text style={styles.choiceLabel}>Cortesia</Text>
          <ChoiceGroup
            options={[{ value: 'NAO', label: 'NAO' }, { value: 'SIM', label: 'SIM' }]}
            value={editing.cortesia ? 'SIM' : 'NAO'}
            onChange={(value) => patch('cortesia', value === 'SIM')}
          />
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

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  detail: { color: colors.text, marginTop: 8, lineHeight: 20 },
  total: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 18 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  inline: { flexDirection: 'row', gap: 10 },
  inlineItem: { flex: 1 },
  fieldError: { color: colors.red, fontSize: 12, fontWeight: '700', marginTop: 5 },
  hint: { color: colors.muted, fontWeight: '700', marginTop: 8 },
  choiceLabel: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 14, marginBottom: 8 }
});
