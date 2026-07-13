import { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionMenu, AppModal, Button, FormField, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { atualizarIngresso, buscarInscricaoPorCpf, gerarLinkPagamentoLote, gerarLoteIngressos, listLotesIngressos, registrarPagamentoLote } from '@/services/ingressos.service';
import { findPersonByCpf } from '@/services/people.service';
import { createSale } from '@/services/sales.service';
import { colors } from '@/theme/colors';
import { formatCurrencyBRL, formatDateTime, parseCurrencyInput } from '@/utils/format';

type TicketBatch = {
  id: string;
  loteId: string;
  alunoNome: string;
  cpf?: string;
  cursoNome: string;
  cidade?: string;
  telefone?: string;
  email?: string;
  professor?: string;
  status: string;
  quantidade: number;
  valorTotal: number;
  issuedAt?: string;
  tickets: any[];
};

function normalizeBatches(lotes: any[]): TicketBatch[] {
  return lotes.map((lote) => {
    const inscricao = lote.inscricao ?? {};
    const customer = inscricao.customer ?? {};
    const evento = inscricao.evento ?? {};
    const tickets = lote.tickets ?? [];
    return {
      id: String(lote.id),
      loteId: String(lote.id),
      alunoNome: customer.nome ?? tickets[0]?.alunoNome ?? 'Aluno sem nome',
      cpf: customer.cpf,
      cursoNome: evento.nome ?? tickets[0]?.cursoNome ?? 'Curso não informado',
      cidade: evento.cidade ?? tickets[0]?.cidade,
      telefone: customer.telefone,
      email: customer.email,
      professor: evento.atracao ?? evento.observacao ?? tickets[0]?.professor,
      status: lote.paymentStatus ?? lote.status ?? 'PENDENTE',
      quantidade: Number(lote.quantidade ?? tickets.length ?? 0),
      valorTotal: Number(lote.valorTotal ?? tickets.reduce((total: number, ticket: any) => total + Number(ticket.valor ?? 0), 0)),
      issuedAt: lote.createdAt ?? tickets[0]?.issuedAt,
      tickets
    };
  });
}

export default function Ingressos() {
  const [modalOpen, setModalOpen] = useState(false);
  const [cpf, setCpf] = useState('');
  const [search, setSearch] = useState('');
  const [inscricao, setInscricao] = useState<any>(null);
  const [person, setPerson] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [paymentLink, setPaymentLink] = useState<{ checkoutUrl: string; shareText: string; telefone?: string; nome?: string } | null>(null);
  const [valorUnitario, setValorUnitario] = useState('0');
  const [dataLimite, setDataLimite] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'PIX' | 'DINHEIRO' | 'CARTAO' | 'CORTESIA'>('PIX');
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryIngressos = useCallback(() => listLotesIngressos(), []);
  const { data, loading, error, refetch } = useApiQuery(queryIngressos, { fallbackData: [] });
  const batches = useMemo(() => normalizeBatches(data ?? []), [data]);
  const filtered = useMemo(() => batches.filter((batch) =>
    `${batch.id} ${batch.alunoNome} ${batch.cpf ?? ''} ${batch.cursoNome} ${batch.status} ${batch.cidade ?? ''}`.toLowerCase().includes(search.toLowerCase())
  ), [batches, search]);

  function openModal() {
    setCpf('');
    setInscricao(null);
    setPerson(null);
    setMessage('');
    setValorUnitario('0');
    setDataLimite('');
    setFormaPagamento('PIX');
    setObservacao('');
    setModalOpen(true);
  }

  async function findStudent() {
    setMessage('');
    setInscricao(null);
    setPerson(null);
    try {
      const lookup = await findPersonByCpf(cpf);
      if (!lookup.success || !lookup.data) {
        setMessage(lookup.message ?? 'Pessoa não encontrada pelo CPF informado.');
        return;
      }
      setPerson(lookup.data);
      const latestInscricao = lookup.data.raw?.inscricao?.[0];
      if (latestInscricao) {
        setInscricao(latestInscricao);
        setValorUnitario(String(latestInscricao?.evento?.preco ?? 0));
        return;
      }
      try {
        const result = await buscarInscricaoPorCpf(cpf);
        setInscricao(result);
        setValorUnitario(String(result?.evento?.preco ?? 0));
      } catch {
        setMessage('Pessoa encontrada. Nenhuma inscrição de curso foi localizada para gerar lote automático.');
      }
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Pessoa não encontrada pelo CPF informado.');
    }
  }

  async function generateBatch() {
    if (!inscricao || submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      await gerarLoteIngressos({
        cpf,
        valorUnitario: parseCurrencyInput(valorUnitario),
        dataLimite: dataLimite || undefined,
        observacoes: observacao || undefined
      });
      setModalOpen(false);
      setInscricao(null);
      refetch();
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Não foi possível gerar o lote.');
    } finally {
      setSubmitting(false);
    }
  }

  async function createTicketSale() {
    if (!person || !inscricao || submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      await createSale({
        cpf,
        tipo: inscricao.evento?.tipo === 'CURSO' ? 'CURSO' : inscricao.evento?.tipo === 'BAILE' ? 'BAILE' : 'EVENTO',
        eventoId: inscricao.evento?.tipo === 'CURSO' ? undefined : inscricao.eventoId,
        cursoId: inscricao.evento?.tipo === 'CURSO' ? inscricao.eventoId : undefined,
        inscricaoId: inscricao.id,
        quantidade: Math.max(1, Number(inscricao.quantidadeParticipantes ?? 1)),
        valorUnitario: parseCurrencyInput(valorUnitario),
        formaPagamento,
        observacao
      });
      setModalOpen(false);
      refetch();
    } catch (err) {
      setMessage((err as { message?: string })?.message ?? 'Não foi possível gerar a venda.');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateTicket(id: string, status: string) {
    await atualizarIngresso(id, { status, motivo: 'Alteracao manual no painel admin' });
    refetch();
  }

  async function updateTicketAsCourtesy(id: string) {
    await atualizarIngresso(id, { tipo: 'CORTESIA', status: 'CORTESIA', motivo: 'Cortesia manual', responsavel: 'Admin' });
    refetch();
  }

  async function markBatchPaid(loteId: string) {
    await registrarPagamentoLote(loteId, { paymentStatus: 'PAGO', reason: 'Pagamento confirmado manualmente' });
    refetch();
  }

  async function sendBatchPaymentLink(batch: TicketBatch) {
    setMessage('');
    try {
      const response = await gerarLinkPagamentoLote(batch.loteId);
      setPaymentLink({
        checkoutUrl: response.checkoutUrl,
        shareText: response.shareText,
        telefone: batch.telefone,
        nome: batch.alunoNome
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
      <Header title="Ingressos" right={<TouchableOpacity onPress={openModal} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Pesquisar lotes de ingressos" />
      {loading ? <Text style={styles.state}>Carregando lotes...</Text> : null}
      {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
      {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}

      {!error ? <View style={styles.grid}>
        {filtered.map((batch) => {
          const firstTicket = batch.tickets[0];
          return (
            <View key={batch.id} style={[styles.row, { width: itemWidth }]}>
              <View style={styles.rowCard}>
                <ListCard
                  title={`Lote ${batch.id} - ${batch.alunoNome}`}
                  subtitle={`${batch.cursoNome}\n${batch.quantidade} ingressos - ${formatCurrencyBRL(batch.valorTotal)} - ${formatDateTime(batch.issuedAt)}`}
                  status={batch.status}
                />
              </View>
              <ActionMenu actions={[
                { label: 'Confirmar lote', icon: 'cash-check', onPress: () => markBatchPaid(batch.loteId) },
                { label: 'Enviar link AbacatePay', icon: 'link-variant', onPress: () => sendBatchPaymentLink(batch) },
                { label: 'Marcar 1 ingresso pago', icon: 'check-decagram-outline', onPress: () => updateTicket(String(firstTicket.id), 'PAGO') },
                { label: 'Marcar 1 pendente', icon: 'clock-outline', onPress: () => updateTicket(String(firstTicket.id), 'PENDENTE') },
                { label: 'Cortesia em 1 ingresso', icon: 'ticket-percent-outline', onPress: () => updateTicketAsCourtesy(String(firstTicket.id)) },
                { label: 'Cancelar 1 ingresso', icon: 'close-circle-outline', tone: 'danger', onPress: () => updateTicket(String(firstTicket.id), 'CANCELADO') }
              ]} />
            </View>
          );
        })}
      </View> : null}

      <AppModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        position="center"
        title="Novo lote de ingressos"
        footer={<View style={styles.footer}>
          <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setModalOpen(false)} /></View>
          <View style={styles.footerItem}><Button title="Nova venda" tone="dark" onPress={person && inscricao && !submitting ? createTicketSale : undefined} /></View>
          <View style={styles.footerItem}><Button title={submitting ? 'Gerando...' : 'Gerar lote de ingressos'} tone="green" onPress={inscricao && !submitting ? generateBatch : undefined} /></View>
        </View>}
      >
        <View style={styles.inline}>
          <View style={styles.inlineItem}>
            <FormField label="CPF do aluno" value={cpf} onChangeText={setCpf} keyboardType="numeric" placeholder="000.000.000-00" />
          </View>
          <TouchableOpacity style={styles.lookupButton} onPress={findStudent}>
            <MaterialCommunityIcons name="account-search-outline" color="#fff" size={20} />
            <Text style={styles.lookupText}>Pesquisar</Text>
          </TouchableOpacity>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}

        {person ? <View style={styles.studentBox}>
          <View style={styles.studentHeader}>
            <Text style={styles.studentName}>{person.nome}</Text>
            <StatusBadge status={person.tipo} />
          </View>
          <Info label="CPF" value={person.cpf} />
          <Info label="Telefone" value={person.telefone} />
          <Info label="E-mail" value={person.email} />
          <Info label="Cidade" value={person.cidade} />
        </View> : null}

        {inscricao ? <View style={styles.studentBox}>
          <View style={styles.studentHeader}>
            <Text style={styles.studentName}>{inscricao.customer?.nome}</Text>
            <StatusBadge status={inscricao.status} />
          </View>
          <Info label="CPF" value={inscricao.customer?.cpf} />
          <Info label="Telefone" value={inscricao.customer?.telefone} />
          <Info label="E-mail" value={inscricao.customer?.email} />
          <Info label="Cidade" value={inscricao.evento?.cidade ?? inscricao.customer?.cidade} />
          <Info label="Curso" value={inscricao.evento?.nome} />
          <Info label="Professor" value={inscricao.evento?.atracao ?? inscricao.evento?.observacao} />
          <Info label="Status da inscrição" value={inscricao.status} />
          <Info label="Quantidade de participantes" value={String(inscricao.quantidadeParticipantes ?? 1)} />
          <Info label="Ingressos gerados automaticamente" value={String((inscricao.quantidadeParticipantes ?? 1) * 10)} />
          <PaymentPicker value={formaPagamento} onChange={setFormaPagamento} />
          <View style={styles.inline}>
            <View style={styles.inlineItem}><FormField label="Valor por ingresso" value={valorUnitario} onChangeText={setValorUnitario} keyboardType="decimal-pad" /></View>
            <View style={styles.inlineItem}><FormField label="Data limite" value={dataLimite} onChangeText={setDataLimite} placeholder="2026-07-30T23:59" /></View>
          </View>
          <FormField label="Observação" value={observacao} onChangeText={setObservacao} multiline />
        </View> : null}
      </AppModal>

      <AppModal visible={!!paymentLink} onClose={() => setPaymentLink(null)} title="Link de pagamento">
        {paymentLink ? <>
          <Text style={styles.message}>Link AbacatePay gerado para {paymentLink.nome ?? 'aluno'}.</Text>
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

function PaymentPicker({ value, onChange }: { value: 'PIX' | 'DINHEIRO' | 'CARTAO' | 'CORTESIA'; onChange: (value: 'PIX' | 'DINHEIRO' | 'CARTAO' | 'CORTESIA') => void }) {
  return <View>
    <Text style={styles.infoLabel}>Forma de pagamento</Text>
    <View style={styles.chips}>
      {(['PIX', 'DINHEIRO', 'CARTAO', 'CORTESIA'] as const).map((item) => (
        <TouchableOpacity key={item} onPress={() => onChange(item)} style={[styles.chip, value === item && styles.chipActive]}>
          <Text style={[styles.chipText, value === item && styles.chipTextActive]}>{item === 'CARTAO' ? 'CARTÃO' : item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>;
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '-'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  plus: { backgroundColor: colors.red, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  inlineItem: { flex: 1 },
  lookupButton: { height: 46, borderRadius: 12, backgroundColor: colors.red, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  lookupText: { color: '#fff', fontWeight: '900' },
  message: { color: colors.muted, fontWeight: '800', marginTop: 10 },
  studentBox: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, padding: 12, marginTop: 14, gap: 8 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  studentName: { color: colors.text, fontSize: 17, fontWeight: '900', flex: 1 },
  infoRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  infoLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 },
  linkBox: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginVertical: 12 },
  linkText: { color: colors.text, fontWeight: '800', lineHeight: 20 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  footerItem: { flex: 1, minWidth: 120 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colors.card },
  chipActive: { borderColor: colors.red, backgroundColor: '#351616' },
  chipText: { color: colors.muted, fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: colors.text }
});
