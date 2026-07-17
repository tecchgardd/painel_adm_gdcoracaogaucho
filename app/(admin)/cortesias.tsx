import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionMenu, Header, ListCard, Screen, SearchBar } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { cancelarCortesia, listCortesias } from '@/services/cortesias.service';
import { colors } from '@/theme/colors';
import { formatDateTime } from '@/utils/format';

export default function Cortesias() {
  const [query, setQuery] = useState('');
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
    {loading ? <Text style={styles.state}>Carregando cortesias...</Text> : null}
    {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
    {!error ? <View style={styles.list}>
      {filtered.map((cortesia: any) => <View key={String(cortesia.id)} style={styles.row}>
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
    {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 }
});
