import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EventFormModal } from '@/features/eventos/components/EventFormModal';
import { ActionMenu, AppModal, Button, Card, FloatingActionButton, Header, ListCard, Screen, FilterBar, StatusBadge } from '@/shared/components/ui';
import { EVENTO_SITUACOES, matchSituacao } from '@/shared/utils/situacao';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { listEventos } from '@/features/eventos/services/eventos.service';
import { colors, theme } from '@/theme/theme';
import { formatCurrencyBRL, formatDateTime } from '@/shared/utils/format';

export default function Eventos() {
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [situacao, setSituacao] = useState('TODAS');
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const queryEventos = useCallback(() => listEventos({ tipo: 'BAILE' }) as any, []);
  const { data: apiEventos, loading, error, refetch } = useApiQuery(queryEventos, { fallbackData: [] });
  const eventos = apiEventos ?? [];
  const filtered = eventos.filter((evento: any) =>
    `${evento.nome} ${evento.data} ${evento.local} ${evento.status}`.toLowerCase().includes(query.toLowerCase())
  );
  const visiveis = filtered.filter((item: any) => matchSituacao(item.status, situacao));

  function onSaved() {
    refetch();
  }

  return (
    <Screen>
      <Header title="Bailes" right={<FloatingActionButton onPress={() => setCreating(true)} accessibilityLabel="Novo baile" />} />
      <FilterBar
        search={{ value: query, onChange: setQuery, placeholder: 'Buscar bailes por nome, local ou data' }}
        filters={[{ key: 'situacao', label: 'Situação', value: situacao, allValue: 'TODAS', options: EVENTO_SITUACOES, onChange: setSituacao }]}
      />
      {loading ? <LoadingState label="Carregando bailes..." /> : null}
      {error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {!error && <View style={styles.grid}>
        {visiveis.map((evento: any) => (
          <View key={evento.id} style={gridCell}>
            <ListCard
                title={evento.nome ?? 'Baile sem nome'}
                subtitle={`${formatDateTime(evento.data)}\n${evento.local ?? ''}`}
                status={evento.status}
                onPress={() => setSelected(evento)}
            actions={<ActionMenu variant="ghost" actions={[
              { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => setSelected(evento) },
              { label: 'Editar', icon: 'pencil-outline', onPress: () => setEditing(evento) },
              { label: 'Cancelar evento', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...evento, status: 'CANCELADO' }) }
            ]} />}
          />
          </View>
        ))}
      </View>}
      {!loading && !error && !visiveis.length ? <EmptyState /> : null}

      <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? 'Baile'}>
        {selected ? <>
          <View style={styles.sheetHeader}><StatusBadge status={selected.status} /></View>
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
  grid: gridContainer,
  sheetHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 21, fontFamily: theme.font.regular, marginTop: 6 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 20 },
  mini: { flexGrow: 1, flexBasis: 120, padding: 14, backgroundColor: colors.cardAlt, borderColor: colors.borderSoft },
  miniLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.regular },
  miniValue: { color: colors.text, fontSize: 18, fontFamily: theme.font.semiBold, marginTop: 4 }
});
