import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventFormModal } from '@/components/events/EventFormModal';
import { ActionMenu, AppModal, Button, Card, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { listEventos } from '@/services/eventos.service';
import { colors } from '@/theme/colors';
import { formatCurrencyBRL, formatDateTime } from '@/utils/format';

export default function Eventos() {
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryEventos = useCallback(() => listEventos({ tipo: 'BAILE' }) as any, []);
  const { data: apiEventos, loading, error, refetch } = useApiQuery(queryEventos, { fallbackData: [] });
  const eventos = apiEventos ?? [];
  const filtered = eventos.filter((evento: any) =>
    `${evento.nome} ${evento.data} ${evento.local} ${evento.status}`.toLowerCase().includes(query.toLowerCase())
  );

  function onSaved() {
    refetch();
  }

  return (
    <Screen>
      <Header title="Bailes" right={<TouchableOpacity onPress={() => setCreating(true)} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar bailes" />
      {loading ? <Text style={styles.state}>Carregando bailes...</Text> : null}
      {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}

      {!error && <View style={styles.grid}>
        {filtered.map((evento: any) => (
          <View key={evento.id} style={[styles.row, { width: itemWidth }]}>
            <View style={styles.rowCard}>
              <ListCard
                title={evento.nome ?? 'Baile sem nome'}
                subtitle={`${formatDateTime(evento.data)}\n${evento.local ?? ''}`}
                status={evento.status}
                onPress={() => setSelected(evento)}
              />
            </View>
            <ActionMenu actions={[
              { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => setSelected(evento) },
              { label: 'Editar', icon: 'pencil-outline', onPress: () => setEditing(evento) },
              { label: 'Cancelar evento', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...evento, status: 'CANCELADO' }) }
            ]} />
          </View>
        ))}
      </View>}
      {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}

      <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? 'Baile'}>
        {selected ? <>
          <View style={styles.sheetHeader}><Text style={styles.title}>{selected.nome}</Text><StatusBadge status={selected.status} /></View>
          <Text style={styles.sub}>{formatDateTime(selected.data)}</Text>
          <Text style={styles.sub}>{selected.local}</Text>
          <View style={styles.stats}>
            <Card style={styles.mini}><Text style={styles.miniLabel}>Vendidos</Text><Text style={styles.miniValue}>{selected.vendidos ?? selected._count?.ingresso ?? 0}</Text></Card>
            <Card style={styles.mini}><Text style={styles.miniLabel}>Capacidade</Text><Text style={styles.miniValue}>{selected.capacidade ?? 0}</Text></Card>
            <Card style={styles.mini}><Text style={styles.miniLabel}>Receita</Text><Text style={styles.miniValue}>{formatCurrencyBRL(selected.receita ?? selected.preco ?? 0)}</Text></Card>
          </View>
          <Button title="Editar baile" tone="green" onPress={() => { setEditing(selected); setSelected(null); }} />
        </> : null}
      </AppModal>

      <EventFormModal visible={creating} onClose={() => setCreating(false)} onSaved={onSaved} initialType="BAILE" />
      <EventFormModal visible={!!editing} onClose={() => setEditing(null)} onSaved={onSaved} initialType="BAILE" initial={editing} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  plus: { backgroundColor: colors.red, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', flexShrink: 1 },
  sub: { color: '#ccc', marginTop: 8 },
  stats: { flexDirection: 'row', gap: 8, marginVertical: 18 },
  mini: { flex: 1, padding: 12 },
  miniLabel: { color: '#aaa', fontSize: 11 },
  miniValue: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 6 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 }
});
