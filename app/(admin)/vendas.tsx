import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActionMenu, AppModal, Button, FormField, Header, Screen, SearchBar, StatCard, StatusBadge } from '@/components/ui';
import { PaymentOperationModal } from '@/components/payments/PaymentOperationModal';
import { SaleDetailsModal } from '@/components/sales/SaleDetailsModal';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { listEventos } from '@/services/eventos.service';
import { findPersonByCpf } from '@/services/people.service';
import { gerarLinkPagamentoLote, gerarLoteIngressos } from '@/services/ingressos.service';
import { getPagamento } from '@/services/pagamentos.service';
import { createSale, generateSalePaymentLink, getSale, listSales } from '@/services/sales.service';
import type { Pagamento, Sale } from '@/types/entities';
import { colors } from '@/theme/colors';
import { formatCurrencyBRL, formatDateTime, maskCpf, parseCurrencyInput } from '@/utils/format';

type SaleType = 'EVENTO' | 'BAILE' | 'CURSO';
type OperationType = SaleType | 'LOTE';
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

export default function Vendas() {
  const params = useLocalSearchParams<{ tipo?: string }>();
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
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';

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
  const selectedOptions = form.tipo === 'CURSO'
    ? cursos
    : form.tipo === 'LOTE'
      ? eventos.filter((item: any) => item.tipo === 'BAILE')
      : eventos.filter((item: any) => item.tipo === form.tipo);

  useEffect(() => {
    if (params.tipo && ['EVENTO', 'BAILE', 'CURSO', 'LOTE'].includes(params.tipo)) {
      setForm({ ...emptyForm, tipo: params.tipo as OperationType });
      setPerson(null);
      setMessage('');
      setModalOpen(true);
    }
  }, [params.tipo]);

  function openNew() {
    const requested = ['EVENTO', 'BAILE', 'CURSO', 'LOTE'].includes(String(params.tipo)) ? params.tipo as OperationType : 'EVENTO';
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
      if (form.tipo === 'LOTE') {
        const external = form.formaPagamento !== 'LINK_PAGAMENTO';
        const lote = await gerarLoteIngressos({
          customerId: person.id,
          cpf: form.cpf,
          eventoId: form.eventoId,
          quantidade: Number(form.quantidade || 1),
          valorUnitario: parseCurrencyInput(form.valorUnitario),
          origemFinanceira: external ? 'PAGAMENTO_EXTERNO' : 'NOVA_VENDA',
          formaPagamentoExterno: external
            ? form.formaPagamento === 'PIX_EXTERNO' ? 'PIX_EXTERNO'
              : form.formaPagamento === 'DINHEIRO' ? 'DINHEIRO'
                : 'CARTAO_EXTERNO'
            : undefined,
          observacoes: form.observacao || undefined
        });
        if (!external) {
          const response = await gerarLinkPagamentoLote(String(lote.id));
          setPaymentLink({ checkoutUrl: response.checkoutUrl, shareText: response.shareText, telefone: person.telefone, nome: person.nome });
        }
        setModalOpen(false);
        await refetch();
        return;
      }
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
      <Header title="Vendas" right={<TouchableOpacity onPress={openNew} style={[styles.plus, isDesktop && styles.newSaleButton]}><MaterialCommunityIcons name="plus" color="#fff" size={20} />{isDesktop ? <Text style={styles.newSaleText}>Nova venda</Text> : null}</TouchableOpacity>} />
      <Text style={styles.lead}>Gerencie todas as vendas, inscrições e ingressos.</Text>

      <View style={styles.stats}>
        <StatCard title="Total vendido" value={formatCurrencyBRL(summary.totalVendido ?? 0)} tone="green" onPress={() => { setStatusFilter('TODOS'); setPage(1); }} />
        <StatCard title="Vendas pagas" value={String(summary.vendasPagas ?? 0)} tone="green" onPress={() => { setStatusFilter('PAGO'); setPage(1); }} />
        <StatCard title="Pendentes" value={String(summary.vendasPendentes ?? 0)} tone="yellow" onPress={() => { setStatusFilter('PENDENTE'); setPage(1); }} />
        <StatCard title="Cortesias" value={String(summary.cortesias ?? 0)} tone="red" onPress={() => { setStatusFilter('CORTESIA'); setPage(1); }} />
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Pesquisar por CPF, nome ou código" />
      <View style={styles.filters}>
        <FilterChip label="Todos" active={typeFilter === 'TODOS'} onPress={() => { setTypeFilter('TODOS'); setPage(1); }} />
        {(['EVENTO', 'BAILE', 'CURSO'] as const).map((item) => <FilterChip key={item} label={item} active={typeFilter === item} onPress={() => { setTypeFilter(item); setPage(1); }} />)}
      </View>
      <View style={styles.filters}>
        <FilterChip label="Todos" active={statusFilter === 'TODOS'} onPress={() => { setStatusFilter('TODOS'); setPage(1); }} />
        {(['PENDENTE', 'PAGO', 'CANCELADO', 'CORTESIA', 'ESTORNADO', 'PARCIALMENTE_ESTORNADO'] as const).map((item) => <FilterChip key={item} label={item === 'ESTORNADO' || item === 'PARCIALMENTE_ESTORNADO' ? 'REEMBOLSADOS' : item} active={statusFilter === item} onPress={() => { setStatusFilter(item); setPage(1); }} />)}
      </View>

      {loading ? <Text style={styles.state}>Carregando vendas...</Text> : null}
      {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
      {!loading && !error && !sales.length ? <Text style={styles.state}>Não há vendas ainda</Text> : null}

      {isDesktop ? <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          {['Venda', 'Comprador', 'Evento/Curso', 'Qtd.', 'Valor', 'Pagamento', 'Status', 'Data da venda', 'Ações'].map((label, index) => <Text key={label} style={[styles.tableHeadText, index === 8 && styles.actionsCell]}>{label}</Text>)}
        </View>
        {sales.map((sale) => <TouchableOpacity key={sale.id} activeOpacity={0.88} onPress={() => openDetails(sale)} style={styles.tableRow}>
          <Text style={styles.tableText}>{sale.codigo}</Text>
          <View style={styles.tableCell}><Text numberOfLines={1} style={styles.tableStrong}>{sale.nome}</Text><Text style={styles.tableMuted}>{maskCpf(sale.cpf)}</Text></View>
          <Text numberOfLines={2} style={styles.tableText}>{sale.eventoNome ?? '-'}</Text>
          <Text style={styles.tableText}>{sale.quantidade}</Text>
          <Text style={styles.tableStrong}>{formatCurrencyBRL(sale.valorTotal)}</Text>
          <Text numberOfLines={2} style={styles.tableText}>{sale.formaPagamento ?? '-'}</Text>
          <View style={styles.tableCell}><StatusBadge status={sale.status} /></View>
          <Text style={styles.tableText}>{formatDateTime(sale.createdAt)}</Text>
          <View style={[styles.tableCell, styles.actionsCell]}><ActionMenu actions={[
            { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => openDetails(sale) },
            ...(sale.pagamentoId ? [{ label: 'Alterar pagamento', icon: 'credit-card-edit-outline' as const, onPress: () => openPaymentAction('edit', sale.pagamentoId!) }] : []),
            ...(sale.pagamentoId && !['PAGO', 'CORTESIA', 'ESTORNADO'].includes(sale.status) ? [{ label: 'Substituir por pagamento externo', icon: 'swap-horizontal' as const, onPress: () => openPaymentAction('external', sale.pagamentoId!) }] : []),
            ...(!(sale.status === 'PAGO' || sale.status === 'CORTESIA' || sale.pagamentoId) ? [{ label: 'Gerar link Stripe', icon: 'link-variant' as const, onPress: () => sendPaymentLink(sale) }] : [])
          ]} /></View>
        </TouchableOpacity>)}
      </View> : <View style={styles.grid}>
        {sales.map((sale) => <View key={sale.id} style={[styles.row, { width: itemWidth }]}>
          <View style={styles.mobileSaleCard}>
            <TouchableOpacity onPress={() => openDetails(sale)} activeOpacity={0.86}>
              <View style={styles.mobileSaleHeader}><Text style={styles.tableMuted}>{sale.codigo}</Text><StatusBadge status={sale.status} /></View>
              <Text style={styles.mobileSaleName}>{sale.nome}</Text>
              <Text style={styles.tableMuted}>{sale.eventoNome ?? '-'}</Text>
              <Text style={styles.tableText}>{sale.quantidade} item(ns) · {formatCurrencyBRL(sale.valorTotal)}</Text>
              <Text style={styles.tableMuted}>{sale.formaPagamento ?? '-'} · {formatDateTime(sale.createdAt)}</Text>
            </TouchableOpacity>
          </View>
          <ActionMenu actions={[
            { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => openDetails(sale) },
            ...(sale.pagamentoId ? [{ label: 'Pagamento', icon: 'credit-card-outline' as const, onPress: () => openDetails(sale) }] : []),
            ...(!(sale.status === 'PAGO' || sale.status === 'CORTESIA' || sale.pagamentoId) ? [{ label: 'Gerar link Stripe', icon: 'link-variant' as const, onPress: () => sendPaymentLink(sale) }] : [])
          ]} />
        </View>)}
      </View>}
      {!loading && !error && (data?.total ?? 0) > 0 ? <View style={styles.pagination}>
        <Button title="Anterior" tone="dark" onPress={page > 1 ? () => setPage(page - 1) : undefined} />
        <Text style={styles.state}>Página {page} de {totalPages} · {data?.total ?? 0} resultado(s)</Text>
        <Button title="Próxima" tone="dark" onPress={page < totalPages ? () => setPage(page + 1) : undefined} />
      </View> : null}

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
        <Text style={styles.sectionLabel}>1. O que você está vendendo?</Text>
        <View style={styles.filters}>
          {(['CURSO', 'EVENTO', 'BAILE', 'LOTE'] as const).map((item) => <FilterChip key={item} label={item === 'LOTE' ? 'LOTE PARA BAILE' : item} active={form.tipo === item} onPress={() => {
            setPerson(null);
            setForm((current) => ({ ...current, tipo: item, eventoId: '', cursoId: '', valorUnitario: '0', cpf: '' }));
          }} />)}
        </View>

        <Text style={styles.sectionLabel}>2. {form.tipo === 'CURSO' ? 'Selecione o curso' : form.tipo === 'LOTE' ? 'Selecione o baile do lote' : `Selecione o ${form.tipo.toLowerCase()}`}</Text>
        <View style={styles.optionList}>
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
          <View style={styles.inlineItem}><FormField label="CPF obrigatório" value={form.cpf} onChangeText={(value) => { patch('cpf', value); setPerson(null); }} keyboardType="numeric" placeholder="000.000.000-00" /></View>
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

        <View style={styles.inline}>
          <View style={styles.inlineItem}><FormField label="Quantidade" value={form.quantidade} onChangeText={(value) => patch('quantidade', value)} keyboardType="numeric" /></View>
          <View style={styles.inlineItem}><FormField label="Valor automático" value={form.valorUnitario} onChangeText={() => undefined} editable={false} /></View>
        </View>
        <FormField label="Desconto" value={form.desconto} onChangeText={(value) => patch('desconto', value)} keyboardType="decimal-pad" />
        <Text style={styles.sectionLabel}>4. Como o aluno vai pagar?</Text>
        <View style={styles.filters}>
          {([
            ['LINK_PAGAMENTO', 'Link Stripe'],
            ['PIX_EXTERNO', 'Pix'],
            ['DINHEIRO', 'Dinheiro'],
            ['CARTAO_CREDITO', 'Crédito'],
            ['CARTAO_DEBITO', 'Débito']
          ] as [PaymentMethod, string][]).map(([value, label]) => <FilterChip key={value} label={label} active={form.formaPagamento === value} onPress={() => patch('formaPagamento', value)} />)}
        </View>
        <Text style={styles.message}>{form.formaPagamento === 'LINK_PAGAMENTO' ? 'O link será criado ao concluir e poderá ser enviado pelo WhatsApp.' : 'O recebimento será confirmado agora e registrado no histórico.'}</Text>
        <View style={styles.totalBox}><Text style={styles.totalLabel}>TOTAL DA VENDA</Text><Text style={styles.totalValue}>{formatCurrencyBRL(Math.max(0, Number(form.quantidade || 0) * parseCurrencyInput(form.valorUnitario) - parseCurrencyInput(form.desconto)))}</Text></View>
        <FormField label="Observação" value={form.observacao} onChangeText={(value) => patch('observacao', value)} multiline />
      </AppModal>

      <AppModal visible={!!paymentLink} onClose={() => setPaymentLink(null)} title="Link de pagamento">
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

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>;
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
  newSaleText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  lead: { color: colors.muted, fontSize: 12, marginTop: -10, marginBottom: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colors.card },
  chipActive: { borderColor: colors.red, backgroundColor: '#351616' },
  chipText: { color: colors.muted, fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  table: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  tableRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 10, gap: 8 },
  tableHeader: { minHeight: 42, backgroundColor: '#1D1D1D' },
  tableHeadText: { flex: 1, color: colors.muted, fontSize: 10, fontWeight: '900' },
  tableCell: { flex: 1, minWidth: 0 },
  tableText: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16 },
  tableStrong: { color: colors.text, fontSize: 11, fontWeight: '900' },
  tableMuted: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  actionsCell: { flex: 0.65, alignItems: 'flex-end' },
  mobileSaleCard: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 13 },
  mobileSaleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mobileSaleName: { color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: 3 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginVertical: 18 },
  detailGrid: { gap: 2 },
  itemBox: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 },
  inline: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  inlineItem: { flex: 1 },
  lookupButton: { height: 46, borderRadius: 12, backgroundColor: colors.red, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  lookupText: { color: '#fff', fontWeight: '900' },
  message: { color: colors.muted, fontWeight: '800', marginTop: 10 },
  personBox: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, padding: 12, marginTop: 14, gap: 8 },
  personHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  personName: { color: colors.text, fontSize: 17, fontWeight: '900', flex: 1 },
  infoRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  infoLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
  sectionLabel: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 16, marginBottom: 8 },
  optionList: { gap: 8 },
  option: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, backgroundColor: colors.card },
  optionActive: { borderColor: colors.red, backgroundColor: '#351616' },
  optionTitle: { color: colors.text, fontWeight: '900' },
  optionTitleActive: { color: '#fff' },
  optionSubtitle: { color: colors.muted, marginTop: 3, fontSize: 12 },
  linkBox: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginVertical: 12 },
  linkText: { color: colors.text, fontWeight: '800', lineHeight: 20 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  footerItem: { flex: 1, minWidth: 130 }
  ,totalBox: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#2E7D32', backgroundColor: '#152A18', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  totalLabel: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  totalValue: { color: colors.green, fontSize: 22, fontWeight: '900' }
});
