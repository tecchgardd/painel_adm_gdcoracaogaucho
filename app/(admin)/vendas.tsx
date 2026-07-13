import { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionMenu, AppModal, Button, FormField, Header, ListCard, Screen, SearchBar, StatCard, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { listEventos } from '@/services/eventos.service';
import { findPersonByCpf } from '@/services/people.service';
import { createSale, generateSalePaymentLink, listSales, removeSale, updateSale } from '@/services/sales.service';
import { colors } from '@/theme/colors';
import { formatCurrencyBRL, formatDateTime, parseCurrencyInput } from '@/utils/format';

type SaleType = 'EVENTO' | 'BAILE' | 'CURSO';
type SaleStatus = 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'CORTESIA';
type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO' | 'CORTESIA';

const emptyForm = {
  cpf: '',
  tipo: 'EVENTO' as SaleType,
  eventoId: '',
  cursoId: '',
  inscricaoId: '',
  quantidade: '1',
  valorUnitario: '0',
  desconto: '0',
  formaPagamento: 'PIX' as PaymentMethod,
  observacao: ''
};

export default function Vendas() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | SaleType>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | SaleStatus>('TODOS');
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [person, setPerson] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [paymentLink, setPaymentLink] = useState<{ checkoutUrl: string; shareText: string; telefone?: string; nome?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';

  const querySales = useCallback(() => listSales({
    search: search || undefined,
    tipo: typeFilter === 'TODOS' ? undefined : typeFilter,
    status: statusFilter === 'TODOS' ? undefined : statusFilter
  }), [search, typeFilter, statusFilter]);
  const { data, loading, error, refetch } = useApiQuery(querySales, { fallbackData: { data: [], total: 0, summary: {} } });
  const queryEvents = useCallback(() => listEventos({ status: 'ATIVO' }), []);
  const { data: eventsData } = useApiQuery(queryEvents, { fallbackData: [] });

  const sales = data?.data ?? [];
  const summary = data?.summary ?? {};
  const eventos = useMemo(() => (eventsData ?? []).filter((item: any) => item.tipo !== 'CURSO'), [eventsData]);
  const cursos = useMemo(() => (eventsData ?? []).filter((item: any) => item.tipo === 'CURSO'), [eventsData]);
  const selectedOptions = form.tipo === 'CURSO' ? cursos : eventos;

  function openNew() {
    setForm(emptyForm);
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
      const inscricao = result.data.raw?.inscricao?.[0];
      if (inscricao) {
        setForm((current) => ({
          ...current,
          tipo: inscricao.evento?.tipo === 'CURSO' ? 'CURSO' : inscricao.evento?.tipo === 'BAILE' ? 'BAILE' : 'EVENTO',
          eventoId: inscricao.evento?.tipo === 'CURSO' ? '' : String(inscricao.eventoId ?? ''),
          cursoId: inscricao.evento?.tipo === 'CURSO' ? String(inscricao.eventoId ?? '') : '',
          inscricaoId: String(inscricao.id ?? ''),
          valorUnitario: String(inscricao.evento?.preco ?? current.valorUnitario)
        }));
      }
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Pessoa não encontrada pelo CPF informado.');
    }
  }

  async function saveSale() {
    if (saving) return;
    setSaving(true);
    setMessage('');
    try {
      await createSale({
        cpf: form.cpf,
        tipo: form.tipo,
        eventoId: form.tipo === 'CURSO' ? undefined : form.eventoId,
        cursoId: form.tipo === 'CURSO' ? form.cursoId : undefined,
        inscricaoId: form.inscricaoId || undefined,
        quantidade: Number(form.quantidade || 1),
        valorUnitario: parseCurrencyInput(form.valorUnitario),
        desconto: parseCurrencyInput(form.desconto),
        formaPagamento: form.formaPagamento,
        observacao: form.observacao
      });
      setModalOpen(false);
      refetch();
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Não foi possível salvar a venda.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: SaleStatus) {
    await updateSale(id, { status });
    refetch();
  }

  async function cancelSale(id: string) {
    await updateSale(id, { status: 'CANCELADO', observacao: 'Cancelada no painel admin' });
    refetch();
  }

  async function deleteSale(id: string) {
    await removeSale(id);
    refetch();
  }

  async function sendPaymentLink(sale: any) {
    setMessage('');
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
      <Header title="Vendas" right={<TouchableOpacity onPress={openNew} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />

      <View style={styles.stats}>
        <StatCard title="Total vendido" value={formatCurrencyBRL(summary.totalVendido ?? 0)} tone="green" />
        <StatCard title="Vendas pagas" value={String(summary.vendasPagas ?? 0)} tone="green" />
        <StatCard title="Pendentes" value={String(summary.vendasPendentes ?? 0)} tone="yellow" />
        <StatCard title="Cortesias" value={String(summary.cortesias ?? 0)} tone="red" />
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Pesquisar por CPF, nome ou código" />
      <View style={styles.filters}>
        <FilterChip label="Todos" active={typeFilter === 'TODOS'} onPress={() => setTypeFilter('TODOS')} />
        {(['EVENTO', 'BAILE', 'CURSO'] as const).map((item) => <FilterChip key={item} label={item} active={typeFilter === item} onPress={() => setTypeFilter(item)} />)}
      </View>
      <View style={styles.filters}>
        <FilterChip label="Todos" active={statusFilter === 'TODOS'} onPress={() => setStatusFilter('TODOS')} />
        {(['PENDENTE', 'PAGO', 'CANCELADO', 'CORTESIA'] as const).map((item) => <FilterChip key={item} label={item} active={statusFilter === item} onPress={() => setStatusFilter(item)} />)}
      </View>

      {loading ? <Text style={styles.state}>Carregando vendas...</Text> : null}
      {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
      {!loading && !error && !sales.length ? <Text style={styles.state}>Não há vendas ainda</Text> : null}

      <View style={styles.grid}>
        {sales.map((sale: any) => (
          <View key={sale.id} style={[styles.row, { width: itemWidth }]}>
            <View style={styles.rowCard}>
              <ListCard
                title={`${sale.codigo} - ${sale.nome}`}
                subtitle={`${sale.cpf}\n${sale.tipo} - ${sale.eventoNome ?? '-'} - ${formatCurrencyBRL(sale.valorTotal)}\n${formatDateTime(sale.createdAt)}`}
                status={sale.status}
                onPress={() => setMessage('')}
              />
            </View>
            <ActionMenu actions={[
              { label: 'Marcar pago', icon: 'cash-check', onPress: () => changeStatus(sale.id, 'PAGO') },
              { label: 'Enviar link AbacatePay', icon: 'link-variant', onPress: () => sendPaymentLink(sale) },
              { label: 'Marcar pendente', icon: 'clock-outline', onPress: () => changeStatus(sale.id, 'PENDENTE') },
              { label: 'Cortesia', icon: 'ticket-percent-outline', onPress: () => changeStatus(sale.id, 'CORTESIA') },
              { label: 'Cancelar', icon: 'close-circle-outline', tone: 'danger', onPress: () => cancelSale(sale.id) },
              { label: 'Excluir', icon: 'trash-can-outline', tone: 'danger', onPress: () => deleteSale(sale.id) }
            ]} />
          </View>
        ))}
      </View>

      <AppModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        position="center"
        title="Nova venda"
        footer={<View style={styles.footer}>
          <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setModalOpen(false)} /></View>
          <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar venda'} tone="green" onPress={!saving ? saveSale : undefined} /></View>
        </View>}
      >
        <View style={styles.inline}>
          <View style={styles.inlineItem}><FormField label="CPF" value={form.cpf} onChangeText={(value) => patch('cpf', value)} keyboardType="numeric" placeholder="000.000.000-00" /></View>
          <TouchableOpacity style={styles.lookupButton} onPress={lookupCpf}>
            <MaterialCommunityIcons name="account-search-outline" color="#fff" size={20} />
            <Text style={styles.lookupText}>Buscar</Text>
          </TouchableOpacity>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {person ? <View style={styles.personBox}>
          <View style={styles.personHeader}><Text style={styles.personName}>{person.nome}</Text><StatusBadge status={person.tipo} /></View>
          <Info label="CPF" value={person.cpf} />
          <Info label="Telefone" value={person.telefone} />
          <Info label="Cidade" value={person.cidade} />
        </View> : null}

        <Text style={styles.sectionLabel}>Tipo</Text>
        <View style={styles.filters}>
          {(['EVENTO', 'BAILE', 'CURSO'] as const).map((item) => <FilterChip key={item} label={item} active={form.tipo === item} onPress={() => patch('tipo', item)} />)}
        </View>

        <Text style={styles.sectionLabel}>{form.tipo === 'CURSO' ? 'Curso' : 'Evento/Baile'}</Text>
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

        <View style={styles.inline}>
          <View style={styles.inlineItem}><FormField label="Quantidade" value={form.quantidade} onChangeText={(value) => patch('quantidade', value)} keyboardType="numeric" /></View>
          <View style={styles.inlineItem}><FormField label="Valor unitário" value={form.valorUnitario} onChangeText={(value) => patch('valorUnitario', value)} keyboardType="decimal-pad" /></View>
        </View>
        <FormField label="Desconto" value={form.desconto} onChangeText={(value) => patch('desconto', value)} keyboardType="decimal-pad" />
        <Text style={styles.sectionLabel}>Forma de pagamento</Text>
        <View style={styles.filters}>
          {(['PIX', 'DINHEIRO', 'CARTAO', 'CORTESIA'] as const).map((item) => <FilterChip key={item} label={item === 'CARTAO' ? 'CARTÃO' : item} active={form.formaPagamento === item} onPress={() => patch('formaPagamento', item)} />)}
        </View>
        <FormField label="Observação" value={form.observacao} onChangeText={(value) => patch('observacao', value)} multiline />
      </AppModal>

      <AppModal visible={!!paymentLink} onClose={() => setPaymentLink(null)} title="Link de pagamento">
        {paymentLink ? <>
          <Text style={styles.message}>Link AbacatePay gerado para {paymentLink.nome ?? 'cliente'}.</Text>
          <View style={styles.linkBox}><Text selectable style={styles.linkText}>{paymentLink.checkoutUrl}</Text></View>
          <View style={styles.footer}>
            <View style={styles.footerItem}><Button title="Copiar" tone="dark" onPress={copyPaymentLink} /></View>
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
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colors.card },
  chipActive: { borderColor: colors.red, backgroundColor: '#351616' },
  chipText: { color: colors.muted, fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
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
});
