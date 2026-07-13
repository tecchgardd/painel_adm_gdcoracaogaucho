import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventFormModal } from '@/components/events/EventFormModal';
import { ActionMenu, AppModal, Button, Card, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { listEventos } from '@/services/eventos.service';
import { colors } from '@/theme/colors';
import { formatCurrencyBRL, formatDateTime } from '@/utils/format';
import type { EventType } from '@/types/entities';

const tabs: Array<{ type: EventType; label: string; plural: string }> = [
  { type: 'BAILE', label: 'Baile', plural: 'bailes' },
  { type: 'CURSO', label: 'Curso', plural: 'cursos' },
  { type: 'EVENTO', label: 'Evento', plural: 'eventos' }
];

export default function Eventos() {
  const [activeType, setActiveType] = useState<EventType>('BAILE');
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const activeTab = tabs.find((tab) => tab.type === activeType) ?? tabs[0];
  const queryEventos = useCallback(() => listEventos({ tipo: activeType }) as any, [activeType]);
  const { data: apiEventos, loading, error, refetch } = useApiQuery(queryEventos, { fallbackData: [] });

  const eventos = useMemo(() => {
    const data = apiEventos ?? [];
    return data.filter((item: any) => item.tipo === activeType || (activeType === 'BAILE' && !item.tipo));
  }, [activeType, apiEventos]);

  const filtered = eventos.filter((evento: any) =>
    `${evento.nome} ${evento.data} ${evento.local} ${evento.cidade ?? ''} ${evento.status}`.toLowerCase().includes(query.toLowerCase())
  );

  function changeType(type: EventType) {
    setActiveType(type);
    setQuery('');
    setSelected(null);
    setEditing(null);
    setCreating(false);
  }

  function onSaved() {
    refetch();
  }

  return (
    <Screen variant="admin">
      <Header title="Eventos" right={<TouchableOpacity onPress={() => setCreating(true)} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.type} style={[styles.tab, activeType === tab.type && styles.tabActive]} onPress={() => changeType(tab.type)}>
            <Text style={[styles.tabText, activeType === tab.type && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <SearchBar value={query} onChangeText={setQuery} placeholder={`Pesquisar ${activeTab.plural}`} />
      {loading ? <Text style={styles.state}>Carregando {activeTab.plural}...</Text> : null}
      {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}

      {!error && <View style={styles.grid}>
        {filtered.map((evento: any) => (
          <View key={evento.id} style={[styles.row, { width: itemWidth }]}>
            <View style={styles.rowCard}>
              <ListCard
                title={evento.nome ?? `${activeTab.label} sem nome`}
                subtitle={`${formatDateTime(evento.data ?? evento.horario)}\n${[evento.local, evento.cidade].filter(Boolean).join(' - ')}`}
                status={evento.status}
                onPress={() => setSelected(evento)}
              />
            </View>
            <ActionMenu actions={[
              { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => setSelected(evento) },
              { label: `Editar ${activeTab.label.toLowerCase()}`, icon: 'pencil-outline', onPress: () => setEditing(evento) },
              { label: activeType === 'CURSO' ? 'Encerrar curso' : 'Cancelar evento', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...evento, status: activeType === 'CURSO' ? 'ENCERRADO' : 'CANCELADO' }) }
            ]} />
          </View>
        ))}
      </View>}
      {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}

      <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? activeTab.label}>
        {selected ? <>
          <View style={styles.sheetHeader}><Text style={styles.title}>{selected.nome}</Text><StatusBadge status={selected.status} /></View>
          <Text style={styles.sub}>{formatDateTime(selected.data ?? selected.horario)}</Text>
          <Text style={styles.sub}>{[selected.local, selected.cidade].filter(Boolean).join(' - ')}</Text>
          {activeType === 'CURSO' ? <Text style={styles.sub}>Professor: {selected.professor || 'Não informado'}</Text> : null}
          {activeType === 'BAILE' ? <Text style={styles.sub}>Atração: {selected.atracao || 'Não informada'}</Text> : null}
          {activeType === 'EVENTO' ? <Text style={styles.sub}>{selected.descricao || selected.observacao || 'Sem descrição informada.'}</Text> : null}
          <View style={styles.stats}>
            <Card style={styles.mini}><Text style={styles.miniLabel}>Capacidade</Text><Text style={styles.miniValue}>{selected.capacidade ?? 0}</Text></Card>
            <Card style={styles.mini}><Text style={styles.miniLabel}>{activeType === 'CURSO' ? 'Inscritos' : 'Vendidos'}</Text><Text style={styles.miniValue}>{selected.inscritos ?? selected.vendidos ?? selected._count?.ingresso ?? 0}</Text></Card>
            <Card style={styles.mini}><Text style={styles.miniLabel}>Valor</Text><Text style={styles.miniValue}>{formatCurrencyBRL(selected.preco ?? selected.valor ?? 0)}</Text></Card>
          </View>
          <Button title={`Editar ${activeTab.label.toLowerCase()}`} tone="green" onPress={() => { setEditing(selected); setSelected(null); }} />
        </> : null}
      </AppModal>

      <EventFormModal visible={creating} onClose={() => setCreating(false)} onSaved={onSaved} initialType={activeType} />
      <EventFormModal visible={!!editing} onClose={() => setEditing(null)} onSaved={onSaved} initialType={activeType} initial={editing} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  plus: { backgroundColor: colors.red, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tab: { minHeight: 40, minWidth: 96, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  tabActive: { backgroundColor: colors.red, borderColor: colors.red },
  tabText: { color: colors.muted, fontWeight: '900' },
  tabTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', flexShrink: 1 },
  sub: { color: '#ccc', marginTop: 8, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 8, marginVertical: 18 },
  mini: { flex: 1, padding: 12 },
  miniLabel: { color: '#aaa', fontSize: 11 },
  miniValue: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 6 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 }
});
