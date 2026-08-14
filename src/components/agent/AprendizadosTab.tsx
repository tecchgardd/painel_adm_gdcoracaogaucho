import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionMenu, AppModal, Button, ChoiceGroup, StatusBadge } from '@/components/ui';
import { EmptyState } from '@/components/crud/EmptyState';
import { ErrorState } from '@/components/crud/ErrorState';
import { LoadingState } from '@/components/crud/LoadingState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { approveAgentLearningSuggestion, listAgentLearningSuggestions, rejectAgentLearningSuggestion } from '@/services/agent.service';
import { colors, theme } from '@/theme/theme';
import type { AgentLearningStatus, AgentLearningSuggestion } from '@/types/agent';
import { formatDateTime } from '@/utils/format';

export function AprendizadosTab() {
  const [status, setStatus] = useState<AgentLearningStatus | ''>('');
  const [selected, setSelected] = useState<AgentLearningSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const query = useCallback(() => listAgentLearningSuggestions(status ? { status } : {}), [status]);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: [] });
  const items = data ?? [];

  async function review(item: AgentLearningSuggestion, action: 'approve' | 'reject') {
    setBusy(true);
    setActionError('');
    try {
      if (action === 'approve') await approveAgentLearningSuggestion(item.id);
      else await rejectAgentLearningSuggestion(item.id);
      await refetch();
      setSelected(null);
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  }

  return <View>
    <ChoiceGroup
      options={[{ value: '', label: 'TODOS' }, { value: 'PENDENTE', label: 'PENDENTE' }, { value: 'APROVADO', label: 'APROVADO' }, { value: 'REJEITADO', label: 'REJEITADO' }]}
      value={status}
      onChange={(value) => setStatus(value as AgentLearningStatus | '')}
    />
    {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
    {loading ? <LoadingState label="Carregando aprendizados..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    <View style={styles.list}>
      {items.map((item) => <View key={item.id} style={styles.row}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{item.title}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.meta}>{item.suggestedType} · {item.occurrences}x observado · {formatDateTime(item.createdAt)}</Text>
        </View>
        <ActionMenu actions={[
          { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => setSelected(item) },
          ...(item.status === 'PENDENTE' ? [
            { label: 'Aprovar', icon: 'check-circle-outline' as const, onPress: () => review(item, 'approve') },
            { label: 'Rejeitar', icon: 'close-circle-outline' as const, tone: 'danger' as const, onPress: () => review(item, 'reject') }
          ] : [])
        ]} />
      </View>)}
    </View>
    {!loading && !error && !items.length ? <EmptyState title="Nenhum aprendizado encontrado." subtitle="Sugestões aparecem automaticamente conforme a IA identifica padrões de atendimento." /> : null}

    <AppModal visible={!!selected} onClose={() => setSelected(null)} position="center" title={selected?.title ?? 'Aprendizado'}>
      {selected ? <>
        <View style={styles.detailHeader}><StatusBadge status={selected.status} /></View>
        <Text style={styles.detailLabel}>Descrição</Text>
        <Text selectable style={styles.detailValue}>{selected.description}</Text>
        <Text style={styles.detailLabel}>Origem</Text>
        <Text selectable style={styles.detailValue}>{selected.source ?? '-'}</Text>
        <Text style={styles.detailLabel}>Tipo sugerido</Text>
        <Text style={styles.detailValue}>{selected.suggestedType}</Text>
        <Text style={styles.detailLabel}>Ocorrências</Text>
        <Text style={styles.detailValue}>{selected.occurrences}</Text>
        {selected.status === 'PENDENTE' ? <View style={styles.footer}>
          <View style={styles.footerItem}><Button title="Rejeitar" tone="red" onPress={busy ? undefined : () => review(selected, 'reject')} /></View>
          <View style={styles.footerItem}><Button title="Aprovar" tone="green" onPress={busy ? undefined : () => review(selected, 'approve')} /></View>
        </View> : null}
      </> : null}
    </AppModal>
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 10, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  card: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: theme.radius.lg, padding: 13 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900', flex: 1 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  detailHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 10 },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4, lineHeight: 21 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 18 },
  footerItem: { flex: 1 },
  error: { color: colors.red, fontWeight: '800', marginTop: 10 }
});
