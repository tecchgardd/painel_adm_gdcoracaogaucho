import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionMenu, AppModal, Button, ChoiceGroup, FloatingActionButton, FormField, FormRow, FormSection, Header, InfoList, InfoRow, ListCard, Screen, SearchBar, StatusBadge } from '@/shared/components/ui';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { createPedido, listPedidos, updatePedido } from '@/features/pedidos/services/pedidos.service';
import { createCustomer, findCustomerByCpf } from '@/features/clientes/services/customers.service';
import { listEventos } from '@/features/eventos/services/eventos.service';
import { colors, theme } from '@/theme/theme';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { formatCurrencyBRL, formatDateTime, parseCurrencyInput } from '@/shared/utils/format';
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
  const gridCell = gridCellStyle(numColumns);
  const queryPedidos = useCallback(() => listPedidos({ type: 'STORE' }), []);
  const { data: apiPedidos, loading, error, refetch } = useApiQuery(queryPedidos, { fallbackData: [] });
  const queryEventos = useCallback(() => listEventos(), []);
  const { data: eventos } = useApiQuery(queryEventos, { fallbackData: [] });
  const pedidos = (apiPedidos ?? []).filter((pedido: any) => (pedido.tipo ?? 'LOJA') === activeTab || (activeTab === 'LOJA' && !pedido.tipo));
  const filtered = pedidos.filter((pedido: any) =>
    `${pedido.id} ${pedido.cliente ?? ''} ${pedido.cpf ?? ''} ${pedido.status ?? ''} ${pedido.eventoNome ?? ''} ${pedido.data ?? ''}`.toLowerCase().includes(query.toLowerCase())
  );

  const title = activeTab === 'LOJA' ? 'Pedidos da loja' : 'Pedidos de eventos';
  const singular = activeTab === 'LOJA' ? 'pedido da loja' : 'pedido de evento';

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
    <Header title={title} right={<FloatingActionButton onPress={openNew} accessibilityLabel="Novo pedido" />} />
    <SearchBar value={query} onChangeText={setQuery} placeholder={`Filtrar por ${eventFilters.join(', ')}`} />
    {loading ? <LoadingState label="Carregando pedidos..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error && <View style={styles.grid}>
      {filtered.map((pedido: any) => <View key={pedido.id} style={gridCell}>
        <ListCard title={`${pedido.id ?? '-'} - ${pedido.cliente ?? 'Cliente não informado'}`} subtitle={`${formatDateTime(pedido.data)}\n${formatCurrencyBRL(pedido.total ?? 0)}${pedido.eventoNome ? ` - ${pedido.eventoNome}` : ''}`} status={pedido.status} onPress={() => setSelected(pedido)}
            actions={<ActionMenu variant="ghost" actions={[
          { label: 'Ver pedido', icon: 'receipt-text-outline', onPress: () => setSelected(pedido) },
          { label: 'Editar pedido', icon: 'pencil-outline', onPress: () => setEditing(pedido) },
          { label: 'Cancelar pedido', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...pedido, status: 'CANCELADO' }) }
        ]} />}
          />
      </View>)}
    </View>}
    {!loading && !error && !filtered.length ? <EmptyState title={`Nenhum ${singular} encontrado.`} /> : null}

    <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? `Pedido ${selected.id}` : 'Pedido'} subtitle={selected?.data ? formatDateTime(selected.data) : undefined}>
      {selected ? <>
        <View style={styles.sheetHeader}><StatusBadge status={selected.status} /></View>
        <InfoList>
          <InfoRow label="Tipo" value={(selected.tipo ?? 'LOJA') === 'EVENTO' ? 'Evento' : 'Loja'} />
          <InfoRow label="Cliente" value={selected.cliente} />
          <InfoRow label="CPF" value={selected.cpf} />
          {selected.eventoNome ? <InfoRow label="Evento" value={selected.eventoNome} /> : null}
          {selected.cortesia ? <InfoRow label="Cortesia" value={[selected.motivoCortesia, selected.responsavelCortesia].filter(Boolean).join(' · ')} /> : null}
          <InfoRow strong label="Total" value={formatCurrencyBRL(selected.total ?? 0)} />
        </InfoList>
      </> : null}
    </AppModal>

    <AppModal
      visible={!!editing}
      onClose={() => setEditing(null)}
      position="center"
      title={editing?.id ? `Editar ${singular}` : `Novo ${singular}`}
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setEditing(null)} /></View>
        <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" onPress={saving ? undefined : save} /></View>
      </View>}
    >
      {editing ? <>
        <FormSection first title="Cliente" description="Informe o CPF para buscar um cliente já cadastrado.">
          <FormField required label="CPF" value={editing.cpf ?? ''} onChangeText={lookupCustomer} keyboardType="numeric" placeholder="000.000.000-00" error={fieldErrors.cpf} />
          {customerMessage ? <Text style={styles.hint}>{customerMessage}</Text> : null}
          {customerMessage.includes('não encontrado') ? <View style={styles.quickButton}><Button title="Cadastro rápido" tone="dark" onPress={() => setQuickCustomer({ cpf: editing.cpf, nome: editing.cliente ?? '', telefone: editing.telefone ?? '' })} /></View> : null}
          <FormRow>
            <FormField label="Nome do cliente" value={editing.cliente ?? ''} onChangeText={(value) => patch('cliente', value)} />
            <FormField label="Telefone" value={editing.telefone ?? ''} onChangeText={(value) => patch('telefone', value)} keyboardType="phone-pad" placeholder="(51) 99999-9999" />
          </FormRow>
        </FormSection>
        {activeTab === 'LOJA' ? <>
          <FormSection title="Produtos">
            <FormField label="Produtos" value={editing.produtos ?? editing.itens?.[0]?.nome ?? ''} onChangeText={(value) => patch('produtos', value)} placeholder="Ex.: Camiseta oficial" />
            <FormRow>
              <FormField label="Quantidade" value={String(editing.quantidade ?? '')} onChangeText={(value) => patch('quantidade', value)} keyboardType="numeric" placeholder="1" />
              <FormField label="Valor unitário" value={String(editing.valorUnitario ?? '')} onChangeText={(value) => patch('valorUnitario', value)} keyboardType="decimal-pad" placeholder="0,00" />
            </FormRow>
          </FormSection>
          <FormSection title="Pagamento e entrega">
            <FormRow>
              <FormField label="Forma de pagamento" value={editing.formaPagamento ?? ''} onChangeText={(value) => patch('formaPagamento', value)} placeholder="Pix, dinheiro, cartão..." />
              <FormField label="Entrega/retirada" value={editing.entregaRetirada ?? ''} onChangeText={(value) => patch('entregaRetirada', value)} />
            </FormRow>
            <FormField label="Endereço de entrega" hint="Só se for entrega." value={editing.enderecoEntrega ?? ''} onChangeText={(value) => patch('enderecoEntrega', value)} multiline />
          </FormSection>
        </> : <>
          <FormSection title="Evento">
            <FormField label="Evento selecionado (ID)" value={String(editing.eventoId ?? '')} onChangeText={(value) => patch('eventoId', value)} placeholder="ID do evento" />
            <Text style={styles.choiceLabel}>Tipo do evento</Text>
            <ChoiceGroup
              options={[['BAILE', 'Baile'], ['CURSO', 'Curso'], ['EVENTO', 'Evento']].map(([value, label]) => ({ value, label }))}
              value={editing.eventoTipo ?? 'BAILE'}
              onChange={(value) => patch('eventoTipo', value)}
            />
            <FormField label="Ingressos/lotes" value={editing.lote ?? ''} onChangeText={(value) => patch('lote', value)} />
            <FormRow>
              <FormField label="Quantidade" value={String(editing.quantidade ?? '')} onChangeText={(value) => patch('quantidade', value)} keyboardType="numeric" placeholder="1" />
              <FormField label="Valor" value={String(editing.valor ?? '')} onChangeText={(value) => patch('valor', value)} keyboardType="decimal-pad" placeholder="0,00" />
            </FormRow>
          </FormSection>
          <FormSection title="Cortesia">
            <ChoiceGroup
              options={[{ value: 'NAO', label: 'Não' }, { value: 'SIM', label: 'Sim' }]}
              value={editing.cortesia ? 'SIM' : 'NAO'}
              onChange={(value) => patch('cortesia', value === 'SIM')}
            />
            {editing.cortesia ? <>
              <FormField label="Motivo da cortesia" value={editing.motivoCortesia ?? ''} onChangeText={(value) => patch('motivoCortesia', value)} multiline />
              <FormField label="Responsável pela cortesia" value={editing.responsavelCortesia ?? ''} onChangeText={(value) => patch('responsavelCortesia', value)} />
            </> : null}
          </FormSection>
        </>}
        <FormSection title="Status">
          <FormRow>
            {activeTab !== 'LOJA' ? <FormField label="Status do pagamento" value={editing.statusPagamento ?? ''} onChangeText={(value) => patch('statusPagamento', value)} /> : null}
            <FormField label="Status do pedido" value={editing.status ?? ''} onChangeText={(value) => patch('status', value)} />
          </FormRow>
        </FormSection>
        {Object.values(fieldErrors).length ? <Text style={styles.fieldError}>Revise os campos obrigatórios antes de salvar.</Text> : null}
      </> : null}
    </AppModal>

    <AppModal visible={!!quickCustomer} onClose={() => setQuickCustomer(null)} title="Cadastro rápido" subtitle="Cliente não encontrado: cadastre e continue o pedido." footer={<View style={styles.footer}>
      <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setQuickCustomer(null)} /></View>
      <View style={styles.footerItem}><Button title="Salvar cliente" tone="green" onPress={saveQuickCustomer} /></View>
    </View>}>
      {quickCustomer ? <>
        <FormSection first title="Dados pessoais">
          <FormField required label="Nome completo" value={quickCustomer.nome ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, nome: value })} />
          <FormRow>
            <FormField required label="CPF" value={quickCustomer.cpf ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, cpf: value })} keyboardType="numeric" placeholder="000.000.000-00" />
            <FormField label="Telefone" value={quickCustomer.telefone ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, telefone: value })} keyboardType="phone-pad" placeholder="(51) 99999-9999" />
          </FormRow>
        </FormSection>
        <FormSection title="Endereço">
          <FormField label="Rua" value={quickCustomer.rua ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, rua: value })} />
          <FormRow>
            <FormField label="Número" value={quickCustomer.numero ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, numero: value })} />
            <FormField label="Bairro" value={quickCustomer.bairro ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, bairro: value })} />
          </FormRow>
          <FormRow>
            <FormField label="Cidade" value={quickCustomer.cidade ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, cidade: value })} />
            <FormField label="Estado" value={quickCustomer.estado ?? ''} onChangeText={(value) => setQuickCustomer({ ...quickCustomer, estado: value })} placeholder="RS" />
          </FormRow>
        </FormSection>
      </> : null}
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  grid: gridContainer,
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  fieldError: { color: colors.red, fontSize: 12, fontFamily: theme.font.semiBold, marginTop: 5 },
  hint: { color: colors.muted, fontSize: 12, fontFamily: theme.font.regular, marginTop: 6 },
  quickButton: { marginTop: 8 },
  choiceLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, marginTop: 14, marginBottom: 8 }
});
