import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IngressoDetalheModal } from '@/features/ingressos/components/IngressoDetalheModal';
import { listIngressosParaConsulta } from '@/features/ingressos/services/ingressos.service';
import { buscaIngresso, nomeDoPortador, normalizeIngresso, type IngressoSituacao, type IngressoView } from '@/features/ingressos/utils/ingresso';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { ActionMenu, FilterBar, Header, ListCard, Screen, StatCard } from '@/shared/components/ui';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { formatDateTime } from '@/shared/utils/format';
import { usePode } from '@/stores/auth.store';

const SITUACOES: { value: 'TODAS' | IngressoSituacao; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'LIBERADO', label: 'Liberados' },
  { value: 'RESERVADO', label: 'Reservados' },
  { value: 'UTILIZADO', label: 'Utilizados' },
  { value: 'CANCELADO', label: 'Cancelados' }
];

/**
 * Consulta dos ingressos emitidos. A emissão acontece pela venda (Vendas) ou pela cortesia (Cortesias);
 * aqui ficam portador, código/QR, reenvio do documento e cancelamento.
 */
export default function Ingressos() {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<'TODAS' | IngressoSituacao>('TODAS');
  const [eventoId, setEventoId] = useState('TODOS');
  const [selected, setSelected] = useState<IngressoView | null>(null);
  const podeTrocar = usePode('ingressos.editar');
  const podeCancelar = usePode('ingressos.cancelar');
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const query = useCallback(() => listIngressosParaConsulta(), []);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: { itens: [], fonte: 'api' as const } });
  const ingressos = useMemo(() => (data?.itens ?? []).map(normalizeIngresso), [data]);

  // Filtro de evento montado a partir dos ingressos carregados (só eventos que têm ingresso).
  const eventos = useMemo(() => {
    const unique = new Map<string, string>();
    ingressos.forEach((ingresso) => { if (ingresso.evento.id) unique.set(ingresso.evento.id, ingresso.evento.nome); });
    return [...unique.entries()].map(([value, label]) => ({ value, label }));
  }, [ingressos]);

  const doEvento = useMemo(() => ingressos.filter((ingresso) => eventoId === 'TODOS' || ingresso.evento.id === eventoId), [eventoId, ingressos]);
  const filtrados = useMemo(() => doEvento.filter((ingresso) => (situacao === 'TODAS' || ingresso.situacao === situacao) && (!busca.trim() || buscaIngresso(ingresso, busca))), [busca, doEvento, situacao]);
  const contagem = useMemo(() => doEvento.reduce((acc, ingresso) => ({ ...acc, [ingresso.situacao]: acc[ingresso.situacao] + 1 }), { LIBERADO: 0, RESERVADO: 0, UTILIZADO: 0, CANCELADO: 0 } as Record<IngressoSituacao, number>), [doEvento]);

  return <Screen variant="admin">
    <Header title="Ingressos" subtitle="Ingressos emitidos por vendas e cortesias: portador, código e entrada." />

    <View style={styles.stats}>
      <StatCard title="Liberados" value={String(contagem.LIBERADO)} tone="green" onPress={() => setSituacao('LIBERADO')} />
      <StatCard title="Reservados" value={String(contagem.RESERVADO)} tone="yellow" onPress={() => setSituacao('RESERVADO')} />
      <StatCard title="Utilizados" value={String(contagem.UTILIZADO)} tone="green" onPress={() => setSituacao('UTILIZADO')} />
      <StatCard title="Cancelados" value={String(contagem.CANCELADO)} tone="red" onPress={() => setSituacao('CANCELADO')} />
    </View>

    <FilterBar
      search={{ value: busca, onChange: setBusca, placeholder: 'Buscar por código, portador, comprador ou CPF' }}
      filters={[
        ...(eventos.length > 1 ? [{ key: 'evento', label: 'Evento', value: eventoId, allValue: 'TODOS', options: [{ value: 'TODOS', label: 'Todos' }, ...eventos], onChange: setEventoId }] : []),
        { key: 'situacao', label: 'Situação', value: situacao, allValue: 'TODAS', options: SITUACOES, onChange: (value: string) => setSituacao(value as typeof situacao) }
      ]}
    />

    {loading ? <LoadingState label="Carregando ingressos..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!loading && !error && !filtrados.length ? <EmptyState icon="ticket-outline" title="Nenhum ingresso encontrado" subtitle={ingressos.length ? 'Ajuste a busca ou os filtros.' : 'Os ingressos aparecem aqui depois de uma venda ou cortesia.'} /> : null}

    {!error ? <View style={styles.grid}>
      {filtrados.map((ingresso) => <View key={ingresso.id} style={gridCell}>
        <ListCard
          title={nomeDoPortador(ingresso)}
          subtitle={`${ingresso.codigo}${ingresso.cortesia ? ' · Cortesia' : ''}\n${ingresso.evento.nome}${ingresso.evento.data ? ` · ${formatDateTime(ingresso.evento.data)}` : ''}`}
          status={ingresso.situacao}
          onPress={() => setSelected(ingresso)}
          actions={<ActionMenu variant="ghost" actions={[{ label: 'Ver detalhes', icon: 'eye-outline', onPress: () => setSelected(ingresso) }]} />}
        />
      </View>)}
    </View> : null}

    <IngressoDetalheModal ingresso={selected} podeTrocar={podeTrocar} podeCancelar={podeCancelar} onClose={() => setSelected(null)} onChanged={refetch} />
  </Screen>;
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  grid: gridContainer,
});
