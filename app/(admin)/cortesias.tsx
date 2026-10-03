import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionMenu, AppModal, Button, FilterBar, FloatingActionButton, Header, ListCard, Screen } from '@/shared/components/ui';
import { matchSituacao } from '@/shared/utils/situacao';
import { EmitirCortesiaModal } from '@/features/cortesias/components/EmitirCortesiaModal';
import { responsavelNome } from '@/features/cortesias/utils/cortesiaForm';
import { useAuthStore } from '@/stores/auth.store';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { cancelarCortesia, listCortesias } from '@/features/cortesias/services/cortesias.service';
import { formatDateTime } from '@/shared/utils/format';
import { colors, theme } from '@/theme/theme';

export default function Cortesias() {
  const [query, setQuery] = useState('');
  const [situacao, setSituacao] = useState('ATIVO');
  const [emitting, setEmitting] = useState(false);
  const [canceling, setCanceling] = useState<any>(null);
  const [cancelError, setCancelError] = useState('');
  const isAdmin = useAuthStore((state) => state.role) === 'ADMIN';
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const queryCortesias = useCallback(() => listCortesias(), []);
  const { data, loading, error, refetch } = useApiQuery(queryCortesias, { fallbackData: [] });
  const cortesias = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => cortesias.filter((cortesia: any) =>
    `${cortesia.nome ?? ''} ${cortesia.cpf ?? ''} ${cortesia.telefone ?? ''} ${cortesia.evento?.nome ?? ''} ${cortesia.motivo ?? ''}`.toLowerCase().includes(query.toLowerCase())
  ), [cortesias, query]);
  const visiveis = filtered.filter((item: any) => matchSituacao(item.status ?? 'ATIVO', situacao));

  async function confirmCancel() {
    if (!canceling) return;
    setCancelError('');
    try {
      await cancelarCortesia(String(canceling.id));
      setCanceling(null);
      refetch();
    } catch (cancelFailure) {
      setCancelError((cancelFailure as { message?: string })?.message ?? 'Não foi possível cancelar a cortesia.');
    }
  }

  return <Screen variant="admin">
    <Header
      title="Cortesias"
      subtitle={isAdmin ? 'Ingressos gratuitos emitidos com motivo e responsável.' : 'Ingressos gratuitos emitidos. Só administradores podem emitir.'}
      right={isAdmin ? <FloatingActionButton onPress={() => setEmitting(true)} accessibilityLabel="Emitir cortesia" /> : undefined}
    />
    <FilterBar
      search={{ value: query, onChange: setQuery, placeholder: 'Buscar por nome, CPF, evento ou motivo' }}
      filters={[{ key: 'situacao', label: 'Situação', value: situacao, allValue: 'ATIVO', options: [{ value: 'ATIVO', label: 'Ativas' }, { value: 'CANCELADO', label: 'Canceladas' }, { value: 'TODAS', label: 'Todas' }], onChange: setSituacao }]}
    />
    {loading ? <LoadingState label="Carregando cortesias..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error ? <View style={styles.grid}>
      {visiveis.map((cortesia: any) => <View key={String(cortesia.id)} style={gridCell}>
        <ListCard
            title={cortesia.nome ?? 'Cortesia sem nome'}
            subtitle={`${cortesia.evento?.nome ?? 'Evento não informado'} · ${formatDateTime(cortesia.createdAt)}${cortesia.quantidade ? ` · ${cortesia.quantidade} ingresso(s)` : ''}\n${cortesia.motivo ? `Motivo: ${cortesia.motivo}` : 'Motivo não informado'}${responsavelNome(cortesia.responsavel) ? ` · por ${responsavelNome(cortesia.responsavel)}` : ''}`}
            status={cortesia.status ?? 'ATIVO'}
            actions={isAdmin ? <ActionMenu variant="ghost" actions={[
          { label: 'Cancelar cortesia', icon: 'close-circle-outline', tone: 'danger', onPress: () => { setCancelError(''); setCanceling(cortesia); } }
        ]} /> : undefined}
          />
      </View>)}
    </View> : null}
    {!loading && !error && !visiveis.length ? <EmptyState icon="ticket-percent-outline" title="Nenhuma cortesia encontrada" subtitle={isAdmin ? 'Use o botão + para emitir uma cortesia.' : undefined} /> : null}
    <EmitirCortesiaModal visible={emitting} onClose={() => setEmitting(false)} onCreated={refetch} />
    <AppModal
      visible={!!canceling}
      onClose={() => setCanceling(null)}
      title="Cancelar cortesia"
      size="sm"
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Voltar" tone="dark" onPress={() => setCanceling(null)} /></View>
        <View style={styles.footerItem}><Button title="Cancelar cortesia" tone="red" onPress={confirmCancel} /></View>
      </View>}
    >
      <Text style={styles.confirm}>Cancelar a cortesia de {canceling?.nome ?? 'beneficiário'}{canceling?.evento?.nome ? ` para ${canceling.evento.nome}` : ''}? Os ingressos gerados deixam de valer na portaria.</Text>
      {cancelError ? <Text style={styles.error}>{cancelError}</Text> : null}
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  grid: gridContainer,
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  confirm: { color: colors.text, lineHeight: 20, fontFamily: theme.font.regular },
  error: { color: colors.red, fontFamily: theme.font.medium, marginTop: 10 }
});
