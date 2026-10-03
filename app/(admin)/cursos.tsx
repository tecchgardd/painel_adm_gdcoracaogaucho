import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EventFormModal } from '@/features/eventos/components/EventFormModal';
import { ActionMenu, AppModal, Button, FloatingActionButton, Header, ListCard, Screen, FilterBar, StatusBadge } from '@/shared/components/ui';
import { EVENTO_SITUACOES, matchSituacao } from '@/shared/utils/situacao';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { listCursos } from '@/features/cursos/services/cursos.service';
import { colors, theme } from '@/theme/theme';
import { formatDateTime } from '@/shared/utils/format';

export default function Cursos() {
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [situacao, setSituacao] = useState('TODAS');
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const queryCursos = useCallback(() => listCursos(), []);
  const { data: apiCursos, loading, error, refetch } = useApiQuery(queryCursos, { fallbackData: [] });
  const cursos = apiCursos ?? [];
  const filtered = cursos.filter((curso: any) =>
    `${curso.nome} ${curso.cidade} ${curso.horario} ${curso.professor} ${curso.status}`.toLowerCase().includes(query.toLowerCase())
  );
  const visiveis = filtered.filter((item: any) => matchSituacao(item.status, situacao));

  function onSaved() {
    refetch();
  }

  return (
    <Screen>
      <Header title="Cursos" right={<FloatingActionButton onPress={() => setCreating(true)} accessibilityLabel="Novo curso" />} />
      <FilterBar
        search={{ value: query, onChange: setQuery, placeholder: 'Buscar cursos por nome, local ou data' }}
        filters={[{ key: 'situacao', label: 'Situação', value: situacao, allValue: 'TODAS', options: EVENTO_SITUACOES, onChange: setSituacao }]}
      />
      {loading ? <LoadingState label="Carregando cursos..." /> : null}
      {error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {!error && <View style={styles.grid}>
        {visiveis.map((curso: any) => (
          <View key={curso.id} style={gridCell}>
            <ListCard
                title={curso.nome}
                subtitle={`${curso.cidade || curso.local || 'Sem cidade'} - ${formatDateTime(curso.horario || curso.data)}\n${curso.inscritos ?? 0}/${curso.capacidade ?? 0} inscritos`}
                status={curso.status}
                onPress={() => setSelected(curso)}
            actions={<ActionMenu variant="ghost" actions={[
              { label: 'Ver inscritos', icon: 'account-group-outline', onPress: () => setSelected(curso) },
              { label: 'Editar curso', icon: 'pencil-outline', onPress: () => setEditing(curso) },
              { label: 'Encerrar curso', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...curso, status: 'ENCERRADO' }) }
            ]} />}
          />
          </View>
        ))}
      </View>}
      {!loading && !error && !visiveis.length ? <EmptyState /> : null}

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
  grid: gridContainer,
  sheetHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 21, fontFamily: theme.font.regular, marginTop: 6 },
  section: { color: colors.text, fontSize: 18, fontFamily: theme.font.bold, marginVertical: 18 },
  hint: { color: colors.muted, fontFamily: theme.font.semiBold, marginTop: 8 }
});
