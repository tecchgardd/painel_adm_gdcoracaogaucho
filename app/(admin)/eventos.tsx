import { useCallback, useMemo, useState } from 'react';
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
import type { EventType } from '@/shared/types/entities';

const tabs: { type: EventType; label: string; plural: string }[] = [
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
  const [situacao, setSituacao] = useState('TODAS');
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
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
  const visiveis = filtered.filter((item: any) => matchSituacao(item.status, situacao));

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
      <Header title="Eventos" right={<FloatingActionButton onPress={() => setCreating(true)} accessibilityLabel={`Novo ${activeTab.label.toLowerCase()}`} />} />
      <FilterBar
        search={{ value: query, onChange: setQuery, placeholder: `Buscar ${activeTab.plural} por nome, local ou data` }}
        filters={[
          { key: 'tipo', label: 'Tipo', value: activeType, options: tabs.map((tab) => ({ value: tab.type, label: tab.label })), onChange: (value) => changeType(value as EventType) },
          { key: 'situacao', label: 'Situação', value: situacao, allValue: 'TODAS', options: EVENTO_SITUACOES, onChange: setSituacao }
        ]}
      />
      {loading ? <LoadingState label={`Carregando ${activeTab.plural}...`} /> : null}
      {error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {!error && <View style={styles.grid}>
        {visiveis.map((evento: any) => (
          <View key={evento.id} style={gridCell}>
            <ListCard
                title={evento.nome ?? `${activeTab.label} sem nome`}
                subtitle={`${formatDateTime(evento.data ?? evento.horario)}\n${[evento.local, evento.cidade].filter(Boolean).join(' - ')}`}
                status={evento.status}
                onPress={() => setSelected(evento)}
            actions={<ActionMenu variant="ghost" actions={[
              { label: 'Ver detalhes', icon: 'eye-outline', onPress: () => setSelected(evento) },
              { label: `Editar ${activeTab.label.toLowerCase()}`, icon: 'pencil-outline', onPress: () => setEditing(evento) },
              { label: activeType === 'CURSO' ? 'Encerrar curso' : 'Cancelar evento', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...evento, status: activeType === 'CURSO' ? 'ENCERRADO' : 'CANCELADO' }) }
            ]} />}
          />
          </View>
        ))}
      </View>}
      {!loading && !error && !visiveis.length ? <EmptyState /> : null}

      <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? activeTab.label}>
        {selected ? <>
          <View style={styles.sheetHeader}><StatusBadge status={selected.status} /></View>
          <Text style={styles.sub}>{formatDateTime(selected.data ?? selected.horario)}</Text>
          <Text style={styles.sub}>{[selected.local, selected.cidade].filter(Boolean).join(' - ')}</Text>
          {activeType === 'CURSO' ? <Text style={styles.sub}>Professor: {selected.professor || 'Não informado'}</Text> : null}
          {activeType === 'BAILE' ? <Text style={styles.sub}>Atração: {selected.atracao || 'Não informada'}</Text> : null}
          {activeType === 'EVENTO' ? <Text style={styles.sub}>{selected.descricao || selected.observacao || 'Sem descrição informada.'}</Text> : null}
          <View style={styles.stats}>
            <Card style={styles.mini}><Text style={styles.miniLabel}>Capacidade</Text><Text style={styles.miniValue}>{selected.capacidade ?? 0}</Text></Card>
            <Card style={styles.mini}><Text style={styles.miniLabel}>{activeType === 'CURSO' ? 'Inscritos' : 'Vendidos'}</Text><Text style={styles.miniValue}>{selected.inscritos ?? selected.vendidos ?? selected._count?.ingresso ?? 0}</Text></Card>
            <Card style={styles.mini}><Text style={styles.miniLabel}>{activeType === 'BAILE' ? 'Ingresso' : 'Inscrição'}</Text><Text style={styles.miniValue}>{formatCurrencyBRL(selected.preco ?? selected.valor ?? 0)}</Text></Card>
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
  grid: gridContainer,
  sheetHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 21, fontFamily: theme.font.regular, marginTop: 6 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 20 },
  mini: { flexGrow: 1, flexBasis: 120, padding: 14, backgroundColor: colors.cardAlt, borderColor: colors.borderSoft },
  miniLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.regular },
  miniValue: { color: colors.text, fontSize: 18, fontFamily: theme.font.semiBold, marginTop: 4 }
});
