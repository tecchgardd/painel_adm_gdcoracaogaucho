import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EventFormModal } from '@/components/events/EventFormModal';
import { ActionMenu, AppModal, Button, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { listCursos } from '@/services/cursos.service';
import { colors } from '@/theme/colors';
import { formatDateTime } from '@/utils/format';

export default function Cursos() {
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryCursos = useCallback(() => listCursos(), []);
  const { data: apiCursos, loading, error, refetch } = useApiQuery(queryCursos, { fallbackData: [] });
  const cursos = apiCursos ?? [];
  const filtered = cursos.filter((curso: any) =>
    `${curso.nome} ${curso.cidade} ${curso.horario} ${curso.professor} ${curso.status}`.toLowerCase().includes(query.toLowerCase())
  );

  function onSaved() {
    refetch();
  }

  return (
    <Screen>
      <Header title="Cursos" right={<TouchableOpacity onPress={() => setCreating(true)} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar cursos" />
      {loading ? <Text style={styles.state}>Carregando cursos...</Text> : null}
      {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}

      {!error && <View style={styles.grid}>
        {filtered.map((curso: any) => (
          <View key={curso.id} style={[styles.row, { width: itemWidth }]}>
            <View style={styles.rowCard}>
              <ListCard
                title={curso.nome}
                subtitle={`${curso.cidade || curso.local || 'Sem cidade'} - ${formatDateTime(curso.horario || curso.data)}\n${curso.inscritos ?? 0}/${curso.capacidade ?? 0} inscritos`}
                status={curso.status}
                onPress={() => setSelected(curso)}
              />
            </View>
            <ActionMenu actions={[
              { label: 'Ver inscritos', icon: 'account-group-outline', onPress: () => setSelected(curso) },
              { label: 'Editar curso', icon: 'pencil-outline', onPress: () => setEditing(curso) },
              { label: 'Encerrar curso', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...curso, status: 'ENCERRADO' }) }
            ]} />
          </View>
        ))}
      </View>}
      {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}

      <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? 'Curso'}>
        {selected ? <>
          <View style={styles.sheetHeader}><Text style={styles.title}>{selected.nome}</Text><StatusBadge status={selected.status} /></View>
          <Text style={styles.sub}>{selected.cidade || selected.local} - {formatDateTime(selected.horario || selected.data)}</Text>
          <Text style={styles.sub}>Professor: {selected.professor || 'Não informado'}</Text>
          <Text style={styles.section}>Inscritos</Text>
          <Text style={styles.state}>Inscrições serão exibidas quando a API retornar participantes do curso.</Text>
          <Button title="Editar curso" tone="green" onPress={() => { setEditing(selected); setSelected(null); }} />
        </> : null}
      </AppModal>

      <EventFormModal visible={creating} onClose={() => setCreating(false)} onSaved={onSaved} initialType="CURSO" />
      <EventFormModal visible={!!editing} onClose={() => setEditing(null)} onSaved={onSaved} initialType="CURSO" initial={editing} />
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
  section: { color: '#fff', fontSize: 18, fontWeight: '900', marginVertical: 18 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 },
  person: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333', gap: 12 },
  personName: { color: '#fff', fontWeight: '800' },
  cpf: { color: '#aaa', marginTop: 4 }
});
