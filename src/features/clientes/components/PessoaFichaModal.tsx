import { useCallback, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { deleteCustomer, getCustomer, getHistoricoCustomer, updateCustomer } from '@/features/clientes/services/customers.service';
import { normalizeHistorico, normalizePessoa, podeExcluirPessoa, type HistoricoTipo } from '@/features/clientes/utils/pessoa';
import { AppModal, Avatar, Button, InfoList, InfoRow, StatusBadge } from '@/shared/components/ui';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import type { Customer } from '@/shared/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/shared/utils/format';
import { colors, theme } from '@/theme/theme';

const HISTORICO_ICON: Record<HistoricoTipo, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  VENDA: 'cart-outline', INGRESSO: 'ticket-outline', INSCRICAO: 'school-outline', CORTESIA: 'ticket-percent-outline', PAGAMENTO: 'cash-check', OUTRO: 'history'
};

type Confirm = 'excluir' | 'inativar' | null;

/** Ficha da pessoa: dados, histórico (compras, ingressos, inscrições, cortesias) e ações. */
export function PessoaFichaModal({ pessoaId, onClose, onEdit, onChanged }: { pessoaId: string | null; onClose: () => void; onEdit: (customer: Customer) => void; onChanged: () => void }) {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const queryPessoa = useCallback(() => getCustomer(String(pessoaId)), [pessoaId]);
  const { data: customer, loading } = useApiQuery(queryPessoa, { enabled: !!pessoaId });
  const queryHistorico = useCallback(() => getHistoricoCustomer(String(pessoaId)).then(normalizeHistorico), [pessoaId]);
  const { data: historico, loading: loadingHistorico } = useApiQuery(queryHistorico, { enabled: !!pessoaId, fallbackData: [] });

  if (!pessoaId) return null;
  const pessoa = customer ? normalizePessoa(customer) : null;
  const itens = historico ?? [];
  const endereco = customer ? [customer.rua && `${customer.rua}${customer.numero ? `, ${customer.numero}` : ''}`, customer.bairro, customer.cidade && `${customer.cidade}${customer.estado ? `/${customer.estado}` : ''}`].filter(Boolean).join(' · ') : '';

  function go(path: string) {
    onClose();
    router.push(path as any);
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      setConfirm(null);
      onChanged();
      onClose();
    } catch (actionError) {
      setError((actionError as { message?: string })?.message ?? 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  }

  const footer = confirm ? <View style={styles.footer}>
    <View style={styles.footerItem}><Button title="Voltar" tone="dark" onPress={() => setConfirm(null)} /></View>
    <View style={styles.footerItem}><Button
      title={busy ? 'Aguarde...' : confirm === 'excluir' ? 'Excluir cadastro' : pessoa?.ativo ? 'Inativar' : 'Reativar'}
      tone="red"
      disabled={busy}
      onPress={() => run(() => confirm === 'excluir' ? deleteCustomer(pessoaId) : updateCustomer(pessoaId, { status: pessoa?.ativo ? 'INATIVO' : 'ATIVO' }))}
    /></View>
  </View> : undefined;

  return <AppModal visible={!!pessoaId} onClose={() => { setConfirm(null); onClose(); }} title="Ficha da pessoa" size="lg" footer={footer}>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading && !pessoa ? <Text style={styles.muted}>Carregando...</Text> : null}
    {pessoa && confirm ? <Text style={styles.confirmText}>{confirm === 'excluir'
      ? `Excluir o cadastro de ${pessoa.nome}? Esta ação não pode ser desfeita.`
      : pessoa.ativo
        ? `Inativar ${pessoa.nome}? O histórico de compras e inscrições é preservado e o cadastro pode ser reativado depois.`
        : `Reativar o cadastro de ${pessoa.nome}?`}</Text> : null}

    {pessoa && !confirm ? <>
      <View style={styles.header}>
        <Avatar name={pessoa.nome} size={56} />
        <View style={styles.headerCopy}>
          <Text style={styles.name}>{pessoa.nome}</Text>
          <View style={styles.tags}>
            {!pessoa.ativo ? <StatusBadge status="INATIVO" /> : null}
            {pessoa.aluno || itens.some((item) => item.tipo === 'INSCRICAO') ? <Text style={[styles.tag, styles.tagAluno]}>Aluno</Text> : null}
            {pessoa.comprador || itens.some((item) => item.tipo === 'VENDA' || item.tipo === 'INGRESSO') ? <Text style={[styles.tag, styles.tagComprador]}>Comprador</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.action}><Button title="Inscrever em curso" tone="green" onPress={() => go(`/alunos?pessoa=${pessoaId}`)} /></View>
        <View style={styles.action}><Button title="Nova venda" tone="soft" onPress={() => go(`/vendas?cpf=${(pessoa.cpf ?? '').replace(/\D/g, '')}`)} /></View>
        <View style={styles.action}><Button title="Editar" tone="dark" onPress={() => customer && onEdit(customer)} /></View>
      </View>

      <InfoList>
        <InfoRow label="CPF" value={pessoa.cpf ? maskCpf(pessoa.cpf) : undefined} />
        <InfoRow label="Telefone" value={pessoa.telefone} />
        <InfoRow label="E-mail" value={pessoa.email} />
        <InfoRow label="Endereço" value={endereco || undefined} />
      </InfoList>

      <Text style={styles.sectionTitle}>Histórico</Text>
      {loadingHistorico ? <Text style={styles.muted}>Carregando histórico...</Text> : itens.length ? <View style={styles.history}>
        {itens.slice(0, 30).map((item, index) => <View key={`${item.tipo}-${item.id}`} style={[styles.historyRow, index > 0 && styles.historyDivider]}>
          <View style={styles.historyIcon}><MaterialCommunityIcons name={HISTORICO_ICON[item.tipo]} size={16} color={colors.muted} /></View>
          <View style={styles.historyCopy}>
            <Text numberOfLines={1} style={styles.historyTitle}>{item.titulo}</Text>
            <Text style={styles.muted}>{[item.data ? formatDateTime(item.data) : null, item.codigo].filter(Boolean).join(' · ')}</Text>
          </View>
          {item.valor !== undefined ? <Text style={styles.historyValue}>{formatCurrencyBRL(item.valor)}</Text> : null}
          {item.status ? <StatusBadge status={item.status} /> : null}
        </View>)}
      </View> : <Text style={styles.muted}>Nenhuma compra, ingresso ou inscrição ainda.</Text>}

      <View style={styles.dangerZone}>
        <View style={styles.action}><Button title={pessoa.ativo ? 'Inativar cadastro' : 'Reativar cadastro'} tone="dark" onPress={() => setConfirm('inativar')} /></View>
        {podeExcluirPessoa(itens) && !loadingHistorico ? <View style={styles.action}><Button title="Excluir cadastro" tone="dark" onPress={() => setConfirm('excluir')} /></View> : null}
      </View>
      {!podeExcluirPessoa(itens) ? <Text style={styles.hint}>Quem já tem compras ou inscrições não pode ser excluído; inative o cadastro para preservar o histórico.</Text> : null}
    </> : null}
  </AppModal>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  headerCopy: { flex: 1, minWidth: 0, gap: 6 },
  name: { color: colors.text, fontSize: 20, lineHeight: 26, fontFamily: theme.font.semiBold },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { fontSize: 12, fontFamily: theme.font.medium, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  tagAluno: { color: '#5B9FE0', backgroundColor: colors.blueSoft },
  tagComprador: { color: '#4CB85C', backgroundColor: colors.greenSoft },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  action: { flexGrow: 1, minWidth: 150 },
  sectionTitle: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.medium, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  history: { borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardAlt, paddingHorizontal: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  historyDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  historyIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  historyCopy: { flex: 1, minWidth: 0 },
  historyTitle: { color: colors.text, fontSize: 13, fontFamily: theme.font.medium },
  historyValue: { color: colors.text, fontSize: 13, fontFamily: theme.font.semiBold },
  dangerZone: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  hint: { color: colors.subtle, fontSize: 12, lineHeight: 17, fontFamily: theme.font.regular, marginTop: 8 },
  muted: { color: colors.subtle, fontSize: 12, fontFamily: theme.font.regular },
  confirmText: { color: colors.text, fontSize: 14, lineHeight: 21, fontFamily: theme.font.regular },
  error: { color: colors.red, fontFamily: theme.font.medium, marginBottom: 10 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 }
});
