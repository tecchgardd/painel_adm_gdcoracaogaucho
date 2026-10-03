import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ActionMenu, AppModal, Button, ChoiceGroup, FilterBar, FormField, FormRow, Header, Pagination, Screen, StatCard, StatusBadge } from '@/shared/components/ui';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { PaymentOperationModal } from '@/features/pagamentos/components/PaymentOperationModal';
import { SaleDetailsModal } from '@/features/vendas/components/SaleDetailsModal';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { listEventos } from '@/features/eventos/services/eventos.service';
import { findPersonByCpf } from '@/features/pessoas/services/people.service';
import { getPagamento } from '@/features/pagamentos/services/pagamentos.service';
import { createSale, generateSalePaymentLink, getSale, listSales } from '@/features/vendas/services/sales.service';
import type { Pagamento, Sale } from '@/shared/types/entities';
import { colors, theme } from '@/theme/theme';
import { formatCurrencyBRL, formatDateTime, maskCpf, parseCurrencyInput } from '@/shared/utils/format';

type SaleType = 'EVENTO' | 'BAILE' | 'CURSO';
// Vender N ingressos de baile é 'BAILE' + quantidade N (o antigo tipo 'LOTE' saiu).
type OperationType = SaleType;
type SaleStatus = 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'CORTESIA' | 'ESTORNADO' | 'PARCIALMENTE_ESTORNADO';
type PaymentMethod = 'LINK_PAGAMENTO' | 'PIX_EXTERNO' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'CORTESIA';

const emptyForm = {
  cpf: '',
  tipo: 'EVENTO' as OperationType,
  eventoId: '',
  cursoId: '',
  inscricaoId: '',
  quantidade: '1',
  valorUnitario: '0',
  desconto: '0',
  formaPagamento: 'LINK_PAGAMENTO' as PaymentMethod,
  observacao: ''
};

const TIPO_OPTIONS = [['TODOS', 'Todos'], ['EVENTO', 'Eventos'], ['BAILE', 'Bailes'], ['CURSO', 'Cursos']].map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = [['TODOS', 'Todos'], ['PENDENTE', 'Pendentes'], ['PAGO', 'Pagas'], ['CANCELADO', 'Canceladas'], ['CORTESIA', 'Cortesias'], ['ESTORNADO', 'Reembolsadas'], ['PARCIALMENTE_ESTORNADO', 'Reembolso parcial']].map(([value, label]) => ({ value, label }));

/** Uma definição de colunas para cabeçalho e linhas: mesma proporção e alinhamento nos dois. */
type TableColumn = { key: string; label: string; flex: number; align?: 'left' | 'center' | 'right' };
const TABLE_COLUMNS: TableColumn[] = [
  { key: 'codigo', label: 'Venda', flex: 1.2 },
  { key: 'comprador', label: 'Comprador', flex: 1.7 },
  { key: 'evento', label: 'Evento / curso', flex: 1.7 },
  { key: 'qtd', label: 'Qtd.', flex: 0.5, align: 'center' },
  { key: 'valor', label: 'Valor', flex: 1, align: 'right' },
  { key: 'pagamento', label: 'Pagamento', flex: 1.1 },
  { key: 'status', label: 'Status', flex: 1 },
  { key: 'data', label: 'Data', flex: 1 }
];

function columnStyle(column: TableColumn) {
  return { flex: column.flex, minWidth: 0, alignItems: column.align === 'center' ? 'center' as const : column.align === 'right' ? 'flex-end' as const : 'flex-start' as const };
}

const PAYMENT_LABELS: Record<string, string> = { STRIPE: 'Stripe', LINK_PAGAMENTO: 'Link Stripe', PIX_EXTERNO: 'Pix', PIX: 'Pix', DINHEIRO: 'Dinheiro', CARTAO_CREDITO: 'Crédito', CARTAO_DEBITO: 'Débito', CARTAO_EXTERNO: 'Cartão externo', CORTESIA: 'Cortesia' };
function paymentLabel(value?: string) {
  if (!value) return '-';
  return PAYMENT_LABELS[value.toUpperCase()] ?? value;
}

export default function Vendas() {
  const params = useLocalSearchParams<{ tipo?: string; cpf?: string }>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'TODOS' | SaleType>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | SaleStatus>('TODOS');
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [person, setPerson] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [paymentLink, setPaymentLink] = useState<{ checkoutUrl: string; shareText: string; telefone?: string; nome?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Pagamento | null>(null);
  const [paymentMode, setPaymentMode] = useState<'edit' | 'external' | null>(null);
  const { isDesktop, numColumns } = useResponsive();

  // Busca com atraso: consulta a API quando a pessoa para de digitar, não a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next === search) return;
      setSearch(next);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, searchInput]);
  const gridCell = gridCellStyle(numColumns);

  const querySales = useCallback(() => listSales({
    page,
    limit: 20,
    search: search || undefined,
    tipo: typeFilter === 'TODOS' ? undefined : typeFilter,
    status: statusFilter === 'TODOS' ? undefined : statusFilter
  }), [page, search, typeFilter, statusFilter]);
  const { data, loading, error, refetch } = useApiQuery(querySales, { fallbackData: { data: [], total: 0, page: 1, limit: 20, summary: { totalVendido: 0, vendasPagas: 0, vendasPendentes: 0, cortesias: 0 } } });
  const queryEvents = useCallback(() => listEventos({ status: 'ATIVO' }), []);
  const { data: eventsData } = useApiQuery(queryEvents, { fallbackData: [] });

  const sales = data?.data ?? [];
  const summary = data?.summary ?? { totalVendido: 0, vendasPagas: 0, vendasPendentes: 0, cortesias: 0 };
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));
  const eventos = useMemo(() => (eventsData ?? []).filter((item: any) => item.tipo !== 'CURSO'), [eventsData]);
  const cursos = useMemo(() => (eventsData ?? []).filter((item: any) => item.tipo === 'CURSO'), [eventsData]);
  const selectedOptions = form.tipo === 'CURSO' ? cursos : eventos.filter((item: any) => item.tipo === form.tipo);

  useEffect(() => {
    if (params.tipo && ['EVENTO', 'BAILE', 'CURSO'].includes(params.tipo)) {
      setForm({ ...emptyForm, tipo: params.tipo as OperationType });
      setPerson(null);
      setMessage('');
      setModalOpen(true);
    }
  }, [params.tipo]);

  // Veio da ficha da pessoa ("Nova venda"): abre a venda com o comprador já buscado pelo CPF.
  useEffect(() => {
    const cpf = String(params.cpf ?? '').replace(/\D/g, '');
    if (cpf.length !== 11) return;
    let active = true;
    setForm({ ...emptyForm, cpf });
    setPerson(null);
    setMessage('');
    setModalOpen(true);
    findPersonByCpf(cpf).then((result) => {
      if (!active) return;
      if (result.success && result.data) setPerson(result.data);
      else setMessage(result.message ?? 'Pessoa não encontrada pelo CPF informado.');
    }).catch(() => undefined);
    router.setParams({ cpf: undefined });
    return () => { active = false; };
  }, [params.cpf]);

  function openNew() {
    const requested = ['EVENTO', 'BAILE', 'CURSO'].includes(String(params.tipo)) ? params.tipo as OperationType : 'EVENTO';
    setForm({ ...emptyForm, tipo: requested });
    setPerson(null);
    setMessage('');
    setModalOpen(true);
  }

  function patch(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function lookupCpf() {
    setMessage('');
    setPerson(null);
    try {
      const result = await findPersonByCpf(form.cpf);
      if (!result.success || !result.data) {
        setMessage(result.message ?? 'Pessoa não encontrada pelo CPF informado.');
        return;
      }
      setPerson(result.data);
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Pessoa não encontrada pelo CPF informado.');
    }
  }

  async function saveSale() {
    if (saving) return;
    setSaving(true);
    setMessage('');
    try {
      if (!person) throw new Error('Busque e confirme o aluno pelo CPF antes de continuar.');
      const created = await createSale({
        cpf: form.cpf,
        tipo: form.tipo as SaleType,
        eventoId: form.tipo === 'CURSO' ? undefined : form.eventoId,
        cursoId: form.tipo === 'CURSO' ? form.cursoId : undefined,
        inscricaoId: form.inscricaoId || undefined,
        quantidade: Number(form.quantidade || 1),
        valorUnitario: parseCurrencyInput(form.valorUnitario),
        desconto: parseCurrencyInput(form.desconto),
        formaPagamento: form.formaPagamento,
        observacao: form.observacao
      });
      if (form.formaPagamento === 'LINK_PAGAMENTO') {
        const response = await generateSalePaymentLink(created.id);
        setPaymentLink({ checkoutUrl: response.checkoutUrl, shareText: response.shareText, telefone: person?.telefone, nome: person?.nome });
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Não foi possível salvar a venda.');
    } finally {
      setSaving(false);
    }
  }

  async function openDetails(sale: Sale) {
    setDetailsLoading(true);
    setMessage('');
    setSelected(sale);
    try {
      setSelected(await getSale(sale.id));
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Não foi possível carregar os detalhes da venda.');
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openPaymentAction(kind: 'edit' | 'external' | 'refund', paymentId: string) {
    if (kind === 'refund') {
      setSelected(null);
      router.push({ pathname: '/pagamentos', params: { pagamentoId: paymentId, acao: 'refund' } });
      return;
    }
    try {
      setSelectedPayment(await getPagamento(paymentId));
      setSelected(null);
      setPaymentMode(kind);
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Não foi possível carregar o pagamento.');
    }
  }

  async function sendPaymentLink(sale: any) {
    setMessage('');
    if (sale.status === 'PAGO' || sale.status === 'CORTESIA' || sale.pagamentoAtivo || sale.activePaymentAttempt) {
      setMessage('Não é possível gerar link para cortesia, venda paga ou tentativa de pagamento ativa.');
      return;
    }
    try {
      const response = await generateSalePaymentLink(sale.id);
      setPaymentLink({
        checkoutUrl: response.checkoutUrl,
        shareText: response.shareText,
        telefone: sale.telefone,
        nome: sale.nome
      });
      refetch();
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Não foi possível gerar o link de pagamento.');
    }
  }

  async function copyPaymentLink() {
    if (!paymentLink) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(paymentLink.shareText);
      setMessage('Link de pagamento copiado.');
      return;
    }
    setMessage('Copie o link exibido antes de fechar.');
  }

  async function copyCheckoutUrl() {
    if (!paymentLink) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(paymentLink.checkoutUrl);
    setMessage('URL do checkout copiada.');
  }

  function openPaymentUrl() {
    if (paymentLink?.checkoutUrl) Linking.openURL(paymentLink.checkoutUrl);
  }

  function openWhatsapp() {
    if (!paymentLink) return;
    const phone = String(paymentLink.telefone ?? '').replace(/\D/g, '');
    const target = phone ? `55${phone.replace(/^55/, '')}` : '';
    Linking.openURL(`https://wa.me/${target}?text=${encodeURIComponent(paymentLink.shareText)}`);
  }

  return (
    <Screen variant="admin">
      <Header title="Vendas" subtitle="Gerencie todas as vendas, inscrições e ingressos." right={<TouchableOpacity onPress={openNew} style={[styles.plus, isDesktop && styles.newSaleButton]} accessibilityRole="button" accessibilityLabel="Nova venda"><MaterialCommunityIcons name="plus" color="#fff" size={20} />{isDesktop ? <Text style={styles.newSaleText}>Nova venda</Text> : null}</TouchableOpacity>} />
      
      <View style={styles.stats}>
        <StatCard title="Total vendido" value={formatCurrencyBRL(summary.totalVendido ?? 0)} tone="green" onPress={() => { setStatusFilter('TODOS'); setPage(1); }} />
        <StatCard title="Vendas pagas" value={String(summary.vendasPagas ?? 0)} tone="green" onPress={() => { setStatusFilter('PAGO'); setPage(1); }} />
        <StatCard title="Pendentes" value={String(summary.vendasPendentes ?? 0)} tone="yellow" onPress={() => { setStatusFilter('PENDENTE'); setPage(1); }} />
        <StatCard title="Cortesias" value={String(summary.cortesias ?? 0)} tone="red" onPress={() => { setStatusFilter('CORTESIA'); setPage(1); }} />
      </View>

      <FilterBar
        search={{ value: searchInput, onChange: setSearchInput, placeholder: 'Buscar por CPF, nome ou código' }}
        filters={[
          { key: 'tipo', label: 'Tipo', value: typeFilter, allValue: 'TODOS', options: TIPO_OPTIONS, onChange: (value) => { setTypeFilter(value as typeof typeFilter); setPage(1); } },
          { key: 'status', label: 'Status', value: statusFilter, allValue: 'TODOS', options: STATUS_OPTIONS, onChange: (value) => { setStatusFilter(value as typeof statusFilter); setPage(1); } }
        ]}
      />

      {loading ? <LoadingState label="Carregando vendas..." /> : null}
      {error ? <ErrorState message={error} onRetry={refetch} /> : null}
      {!loading && !error && !sales.length ? <EmptyState title="Não há vendas ainda" /> : null}

      {isDesktop ? (sales.length ? <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          {TABLE_COLUMNS.map((column) => <View key={column.key} style={columnStyle(column)}><Text numberOfLines={1} style={styles.tableHeadText}>{column.label}</Text></View>)}
        </View>
        {sales.map((sale) => <View key={sale.id} style={styles.tableRow}>
          {/* Área clicável e menu são irmãos: evita <button> dentro de <button> na web. */}
          <Pressable onPress={() => openDetails(sale)} accessibilityRole="button" accessibilityLabel={`Venda ${sale.codigo}`} style={(state) => [styles.tableMain, (state as { hovered?: boolean }).hovered && styles.tableRowHover]}>
            <View style={columnStyle(TABLE_COLUMNS[0])}><Text numberOfLines={1} style={styles.tableCode}>{sale.codigo}</Text></View>
            <View style={columnStyle(TABLE_COLUMNS[1])}><Text numberOfLines={1} style={styles.tableStrong}>{sale.nome}</Text><Text numberOfLines={1} style={styles.tableMuted}>{maskCpf(sale.cpf)}</Text></View>
            <View style={columnStyle(TABLE_COLUMNS[2])}><Text numberOfLines={2} style={styles.tableText}>{sale.eventoNome ?? '-'}</Text></View>
            <View style={columnStyle(TABLE_COLUMNS[3])}><Text style={styles.tableText}>{sale.quantidade}</Text></View>
            <View style={columnStyle(TABLE_COLUMNS[4])}><Text numberOfLines={1} style={styles.tableStrong}>{formatCurrencyBRL(sale.valorTotal)}</Text></View>
            <View style={columnStyle(TABLE_COLUMNS[5])}><Text numberOfLines={1} style={styles.tableText}>{paymentLabel(sale.formaPagamento)}</Text></View>
            <View style={columnStyle(TABLE_COLUMNS[6])}><StatusBadge status={sale.status} /></View>
            <View style={columnStyle(TABLE_COLUMNS[7])}><Text numberOfLines={1} style={styles.tableText}>{formatDateTime(sale.createdAt).split(' às ')[0]}</Text><Text numberOfLines={1} style={styles.tableMuted}>{formatDateTime(sale.createdAt).split(' às ')[1] ?? ''}</Text></View>
          </Pressable>
          <View style={styles.tableActions}><ActionMenu variant="ghost" actions={[
            { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => openDetails(sale) },
            ...(sale.pagamentoId ? [{ label: 'Alterar pagamento', icon: 'credit-card-edit-outline' as const, onPress: () => openPaymentAction('edit', sale.pagamentoId!) }] : []),
            ...(sale.pagamentoId && !['PAGO', 'CORTESIA', 'ESTORNADO'].includes(sale.status) ? [{ label: 'Substituir por pagamento externo', icon: 'swap-horizontal' as const, onPress: () => openPaymentAction('external', sale.pagamentoId!) }] : []),
            ...(!(sale.status === 'PAGO' || sale.status === 'CORTESIA' || sale.pagamentoId) ? [{ label: 'Gerar link Stripe', icon: 'link-variant' as const, onPress: () => sendPaymentLink(sale) }] : [])
          ]} /></View>
        </View>)}
      </View> : null) : <View style={styles.grid}>
        {sales.map((sale) => <View key={sale.id} style={gridCell}>
          <View style={styles.mobileSaleCard}>
            <TouchableOpacity style={styles.mobileSaleBody} onPress={() => openDetails(sale)} activeOpacity={0.86}>
              <View style={styles.mobileSaleHeader}><Text style={styles.tableMuted}>{sale.codigo}</Text><StatusBadge status={sale.status} /></View>
              <Text style={styles.mobileSaleName}>{sale.nome}</Text>
              <Text style={styles.tableMuted}>{sale.eventoNome ?? '-'}</Text>
              <Text style={styles.tableText}>{sale.quantidade} {sale.tipo === 'CURSO' ? 'inscrição(ões)' : 'ingresso(s)'} · {formatCurrencyBRL(sale.valorTotal)}</Text>
              <Text style={styles.tableMuted}>{paymentLabel(sale.formaPagamento)} · {formatDateTime(sale.createdAt)}</Text>
            </TouchableOpacity>
          <ActionMenu variant="ghost" actions={[
            { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => openDetails(sale) },
            ...(sale.pagamentoId ? [{ label: 'Pagamento', icon: 'credit-card-outline' as const, onPress: () => openDetails(sale) }] : []),
            ...(!(sale.status === 'PAGO' || sale.status === 'CORTESIA' || sale.pagamentoId) ? [{ label: 'Gerar link Stripe', icon: 'link-variant' as const, onPress: () => sendPaymentLink(sale) }] : [])
          ]} />
          </View>
        </View>)}
      </View>}
      {!loading && !error ? <Pagination page={page} totalPages={totalPages} total={data?.total ?? 0} onChange={setPage} /> : null}

      {detailsLoading ? <Text style={styles.state}>Atualizando detalhes...</Text> : null}
      <SaleDetailsModal sale={selected} onClose={() => setSelected(null)} onPaymentAction={openPaymentAction} />
      <PaymentOperationModal payment={selectedPayment} mode={paymentMode} onClose={() => { setSelectedPayment(null); setPaymentMode(null); }} onSuccess={async () => {
        await refetch();
      }} />

      <AppModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        position="center"
        title="Nova venda"
        footer={<View style={styles.footer}>
          <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setModalOpen(false)} /></View>
          <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : form.formaPagamento === 'LINK_PAGAMENTO' ? 'Gerar venda e link' : 'Confirmar recebimento'} tone="green" onPress={!saving && !!person && !!(form.tipo === 'CURSO' ? form.cursoId : form.eventoId) ? saveSale : undefined} /></View>
        </View>}
      >
        <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>1. O que você está vendendo?</Text>
        <View style={styles.filters}>
          <ChoiceGroup
            options={([['CURSO', 'Curso'], ['EVENTO', 'Evento'], ['BAILE', 'Baile']] as const).map(([value, label]) => ({ value, label }))}
            value={form.tipo}
            onChange={(item) => {
              setPerson(null);
              setForm((current) => ({ ...current, tipo: item as OperationType, eventoId: '', cursoId: '', valorUnitario: '0', cpf: '' }));
            }}
          />
        </View>

        <Text style={styles.sectionLabel}>2. {form.tipo === 'CURSO' ? 'Selecione o curso' : `Selecione o ${form.tipo.toLowerCase()}`}</Text>
        <View style={styles.optionList}>
          {!selectedOptions.length ? <Text style={styles.emptyOptions}>Nenhum {form.tipo === 'CURSO' ? 'curso' : 'evento'} disponível para venda no momento.</Text> : null}
          {selectedOptions.slice(0, 8).map((event: any) => {
            const selected = form.tipo === 'CURSO' ? form.cursoId === String(event.id) : form.eventoId === String(event.id);
            return <TouchableOpacity key={event.id} style={[styles.option, selected && styles.optionActive]} onPress={() => {
              if (form.tipo === 'CURSO') patch('cursoId', String(event.id));
              else patch('eventoId', String(event.id));
              patch('valorUnitario', String(event.preco ?? form.valorUnitario));
            }}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleActive]}>{event.nome}</Text>
              <Text style={styles.optionSubtitle}>{event.cidade ?? '-'} - {formatCurrencyBRL(event.preco ?? 0)}</Text>
            </TouchableOpacity>;
          })}
        </View>

        <Text style={styles.sectionLabel}>3. Identifique o aluno</Text>
        <View style={styles.inline}>
          <View style={styles.inlineItem}><FormField required label="CPF do aluno" value={form.cpf} onChangeText={(value) => { patch('cpf', value); setPerson(null); }} keyboardType="numeric" placeholder="000.000.000-00" /></View>
          <TouchableOpacity style={styles.lookupButton} onPress={lookupCpf}>
            <MaterialCommunityIcons name="account-search-outline" color="#fff" size={20} />
            <Text style={styles.lookupText}>Buscar</Text>
          </TouchableOpacity>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {person ? <View style={styles.personBox}>
          <View style={styles.personHeader}><Text style={styles.personName}>{person.nome}</Text><StatusBadge status="LOCALIZADO" /></View>
          <Info label="CPF" value={person.cpf} />
          <Info label="Telefone/WhatsApp" value={person.telefone} />
          <Info label="Cidade" value={person.cidade} />
        </View> : null}

        <FormRow>
          <FormField label="Quantidade" value={form.quantidade} onChangeText={(value) => patch('quantidade', value)} keyboardType="numeric" />
          <FormField label="Valor unitário" hint="Definido pelo evento" value={form.valorUnitario} onChangeText={() => undefined} editable={false} />
          <FormField label="Desconto" value={form.desconto} onChangeText={(value) => patch('desconto', value)} keyboardType="decimal-pad" placeholder="0,00" />
        </FormRow>
        <Text style={styles.sectionLabel}>4. Como o aluno vai pagar?</Text>
        <View style={styles.filters}>
          <ChoiceGroup
            options={([
              ['LINK_PAGAMENTO', 'Link Stripe'],
              ['PIX_EXTERNO', 'Pix'],
              ['DINHEIRO', 'Dinheiro'],
              ['CARTAO_CREDITO', 'Crédito'],
              ['CARTAO_DEBITO', 'Débito']
            ] as [PaymentMethod, string][]).map(([value, label]) => ({ value, label }))}
            value={form.formaPagamento}
            onChange={(value) => patch('formaPagamento', value as PaymentMethod)}
          />
        </View>
        <Text style={styles.message}>{form.formaPagamento === 'LINK_PAGAMENTO' ? 'O link será criado ao concluir e poderá ser enviado pelo WhatsApp.' : 'O recebimento será confirmado agora e registrado no histórico.'}</Text>
        <View style={styles.totalBox}><Text style={styles.totalLabel}>TOTAL DA VENDA</Text><Text style={styles.totalValue}>{formatCurrencyBRL(Math.max(0, Number(form.quantidade || 0) * parseCurrencyInput(form.valorUnitario) - parseCurrencyInput(form.desconto)))}</Text></View>
        <FormField label="Observação" value={form.observacao} onChangeText={(value) => patch('observacao', value)} multiline />
      </AppModal>

      <AppModal visible={!!paymentLink} onClose={() => setPaymentLink(null)} title="Link de pagamento" size="sm">
        {paymentLink ? <>
          <Text style={styles.message}>Checkout Stripe gerado pelo backend para {paymentLink.nome ?? 'cliente'} · origem PAINEL_ADMIN.</Text>
          <View style={styles.linkBox}><Text selectable style={styles.linkText}>{paymentLink.checkoutUrl}</Text></View>
          <View style={styles.footer}>
            <View style={styles.footerItem}><Button title="Copiar URL" tone="dark" onPress={copyCheckoutUrl} /></View>
            <View style={styles.footerItem}><Button title="Copiar texto" tone="dark" onPress={copyPaymentLink} /></View>
            <View style={styles.footerItem}><Button title="Abrir link" tone="green" onPress={openPaymentUrl} /></View>
            <View style={styles.footerItem}><Button title="WhatsApp" tone="green" onPress={openWhatsapp} /></View>
          </View>
        </> : null}
      </AppModal>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '-'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  plus: { backgroundColor: colors.red, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  newSaleButton: { width: 'auto', paddingHorizontal: 14, flexDirection: 'row', gap: 7 },
  newSaleText: { color: '#fff', fontFamily: theme.font.bold, fontSize: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  grid: gridContainer,
  table: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, overflow: 'hidden' },
  tableRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderSoft, paddingRight: 8 },
  tableHeader: { minHeight: 44, backgroundColor: colors.cardAlt, paddingLeft: 16, paddingRight: 52, gap: 16 },
  tableMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 16, alignSelf: 'stretch', paddingLeft: 16, ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : null) },
  tableRowHover: { backgroundColor: colors.cardAlt },
  tableActions: { width: 44, alignItems: 'flex-end' },
  tableHeadText: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.medium, letterSpacing: 0.4, textTransform: 'uppercase' },
  tableCode: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium },
  tableText: { color: colors.text, fontSize: 13, lineHeight: 18, fontFamily: theme.font.regular },
  tableStrong: { color: colors.text, fontSize: 13, fontFamily: theme.font.semiBold },
  tableMuted: { color: colors.subtle, fontSize: 12, lineHeight: 16, fontFamily: theme.font.regular },
  mobileSaleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, padding: 14, paddingRight: 8 },
  mobileSaleBody: { flex: 1, minWidth: 0 },
  mobileSaleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mobileSaleName: { color: colors.text, fontSize: 15, fontFamily: theme.font.bold, marginBottom: 3 },
  detailGrid: { gap: 2 },
  itemBox: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, fontFamily: theme.font.semiBold, marginTop: 8 },
  inline: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  inlineItem: { flex: 1 },
  lookupButton: { height: 46, borderRadius: 12, backgroundColor: colors.red, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  lookupText: { color: '#fff', fontFamily: theme.font.bold },
  message: { color: colors.muted, fontSize: 13, lineHeight: 19, fontFamily: theme.font.regular, marginTop: 10 },
  emptyOptions: { color: colors.subtle, fontSize: 13, fontFamily: theme.font.regular, paddingVertical: 6 },
  personBox: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, padding: 12, marginTop: 14, gap: 8 },
  personHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  personName: { color: colors.text, fontSize: 17, fontFamily: theme.font.bold, flex: 1 },
  infoRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  infoLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.semiBold },
  infoValue: { color: colors.text, fontSize: 14, fontFamily: theme.font.semiBold, marginTop: 2 },
  sectionLabel: { color: colors.text, fontSize: 14, fontFamily: theme.font.semiBold, marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.borderSoft, marginBottom: 10 },
  sectionLabelFirst: { marginTop: 0, paddingTop: 0, borderTopWidth: 0 },
  optionList: { gap: 8 },
  option: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, backgroundColor: colors.card },
  optionActive: { borderColor: colors.red, backgroundColor: colors.red + '22' },
  optionTitle: { color: colors.text, fontFamily: theme.font.bold },
  optionTitleActive: { color: '#fff' },
  optionSubtitle: { color: colors.muted, marginTop: 3, fontSize: 12 },
  linkBox: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginVertical: 12 },
  linkText: { color: colors.text, fontFamily: theme.font.semiBold, lineHeight: 20 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  footerItem: { flex: 1, minWidth: 130 }
  ,totalBox: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.green + '22', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  totalLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, letterSpacing: 0.6 },
  totalValue: { color: colors.green, fontSize: 22, fontFamily: theme.font.bold }
});
