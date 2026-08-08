import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionMenu, Header, ListCard, Screen, SearchBar } from '@/components/ui';
import { EmptyState } from '@/components/crud/EmptyState';
import { ErrorState } from '@/components/crud/ErrorState';
import { LoadingState } from '@/components/crud/LoadingState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { cancelarCortesia, listCortesias } from '@/services/cortesias.service';
import { formatDateTime } from '@/utils/format';

export default function Cortesias() {
  const [query, setQuery] = useState('');
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryCortesias = useCallback(() => listCortesias(), []);
  const { data, loading, error, refetch } = useApiQuery(queryCortesias, { fallbackData: [] });
  const cortesias = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => cortesias.filter((cortesia: any) =>
    `${cortesia.nome ?? ''} ${cortesia.cpf ?? ''} ${cortesia.telefone ?? ''}`.toLowerCase().includes(query.toLowerCase())
  ), [cortesias, query]);

  async function cancel(id: string) {
    await cancelarCortesia(id);
    refetch();
  }

  return <Screen variant="admin">
    <Header title="Cortesias" />
    <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar cortesias" />
    {loading ? <LoadingState label="Carregando cortesias..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error ? <View style={styles.grid}>
      {filtered.map((cortesia: any) => <View key={String(cortesia.id)} style={[styles.row, { width: itemWidth }]}>
        <View style={styles.rowCard}>
          <ListCard
            title={cortesia.nome ?? 'Cortesia sem nome'}
            subtitle={`${cortesia.cpf ?? '-'}\n${cortesia.evento?.nome ?? 'Evento não informado'} - ${formatDateTime(cortesia.createdAt)}`}
            status={cortesia.status ?? 'ATIVO'}
          />
        </View>
        <ActionMenu actions={[
          { label: 'Cancelar', icon: 'close-circle-outline', tone: 'danger', onPress: () => cancel(String(cortesia.id)) }
        ]} />
      </View>)}
    </View> : null}
    {!loading && !error && !filtered.length ? <EmptyState title="Nenhuma cortesia encontrada." /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 }
});
