import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EventFormModal } from '@/components/events/EventFormModal';
import { ActionMenu, AppModal, Button, FloatingActionButton, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { EmptyState } from '@/components/crud/EmptyState';
import { ErrorState } from '@/components/crud/ErrorState';
import { LoadingState } from '@/components/crud/LoadingState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { listCursos } from '@/services/cursos.service';
import { colors } from '@/theme/theme';
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
      <Header title="Cursos" right={<FloatingActionButton onPress={() => setCreating(true)} accessibilityLabel="Novo curso" />} />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar cursos" />
      {loading ? <LoadingState label="Carregando cursos..." /> : null}
      {error ? <ErrorState message={error} onRetry={refetch} /> : null}

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
      {!loading && !error && !filtered.length ? <EmptyState /> : null}

      <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? 'Curso'}>
        {selected ? <>
          <View style={styles.sheetHeader}><StatusBadge status={selected.status} /></View>
          <Text style={styles.sub}>{selected.cidade || selected.local} - {formatDateTime(selected.horario || selected.data)}</Text>
          <Text style={styles.sub}>Professor: {selected.professor || 'Não informado'}</Text>
          <Text style={styles.section}>Inscritos</Text>
          <Text style={styles.hint}>Inscrições serão exibidas quando a API retornar participantes do curso.</Text>
          <Button title="Editar curso" tone="green" onPress={() => { setEditing(selected); setSelected(null); }} />
        </> : null}
      </AppModal>

      <EventFormModal visible={creating} onClose={() => setCreating(false)} onSaved={onSaved} initialType="CURSO" />
      <EventFormModal visible={!!editing} onClose={() => setEditing(null)} onSaved={onSaved} initialType="CURSO" initial={editing} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  sub: { color: colors.text, marginTop: 8 },
  section: { color: colors.text, fontSize: 18, fontWeight: '900', marginVertical: 18 },
  hint: { color: colors.muted, fontWeight: '800', marginTop: 8 }
});
