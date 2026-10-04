import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionMenu, AppModal, Button, FilterBar, FloatingActionButton, Header, ListCard, Screen } from '@/shared/components/ui';
import { matchSituacao } from '@/shared/utils/situacao';
import { EmitirCortesiaModal } from '@/features/cortesias/components/EmitirCortesiaModal';
import { responsavelNome } from '@/features/cortesias/utils/cortesiaForm';
import { usePode } from '@/stores/auth.store';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { cancelarCortesia, listCortesias } from '@/features/cortesias/services/cortesias.service';
import { formatDateTime } from '@/shared/utils/format';
import { ExportButton, ExportModal } from '@/shared/components/ui/ExportModal';
import { usePeriodoFiltro } from '@/shared/components/ui/PeriodoFiltro';
import { CORTESIA_COLUMNS } from '@/features/cortesias/utils/cortesiaExport';
import { dentroDoIntervalo, ordenar, ORDENACAO_OPTIONS, type Ordenacao } from '@/shared/utils/listaAvancada';
import { colors, theme } from '@/theme/theme';

const SITUACAO_OPTIONS = [{ value: 'ATIVO', label: 'Ativas' }, { value: 'CANCELADO', label: 'Canceladas' }, { value: 'TODAS', label: 'Todas' }];

export default function Cortesias() {
  const [query, setQuery] = useState('');
  const [situacao, setSituacao] = useState('ATIVO');
  const [emitting, setEmitting] = useState(false);
  const [canceling, setCanceling] = useState<any>(null);
  const [cancelError, setCancelError] = useState('');
  const podeEmitir = usePode('cortesias.criar');
  const podeCancelar = usePode('cortesias.cancelar');
  const podeExportar = usePode('cortesias.exportar');
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const queryCortesias = useCallback(() => listCortesias(), []);
  const { data, loading, error, refetch } = useApiQuery(queryCortesias, { fallbackData: [] });
  const cortesias = useMemo(() => data ?? [], [data]);
  const [eventoFilter, setEventoFilter] = useState('TODOS');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('RECENTES');
  const [exportando, setExportando] = useState(false);
  const periodo = usePeriodoFiltro('Emissão');
  const intervalo = periodo.intervalo;
  const eventoKey = (cortesia: any) => String(cortesia.evento?.id ?? cortesia.eventoId ?? cortesia.eventId ?? '');
  // Eventos que aparecem nas cortesias (inclui os já encerrados).
  const eventos = useMemo(() => {
    const mapa = new Map<string, string>();
    cortesias.forEach((cortesia: any) => { const key = eventoKey(cortesia); if (key && !mapa.has(key)) mapa.set(key, cortesia.evento?.nome ?? `Evento ${key}`); });
    return [...mapa].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [cortesias]);
  const visiveis = useMemo(() => {
    const termo = query.trim().toLowerCase();
    const lista = cortesias.filter((cortesia: any) =>
      matchSituacao(cortesia.status ?? 'ATIVO', situacao)
      && (eventoFilter === 'TODOS' || eventoKey(cortesia) === eventoFilter)
      && dentroDoIntervalo(cortesia.createdAt, intervalo)
      && (!termo || `${cortesia.nome ?? ''} ${cortesia.cpf ?? ''} ${cortesia.telefone ?? ''} ${cortesia.evento?.nome ?? ''} ${cortesia.motivo ?? ''} ${responsavelNome(cortesia.responsavel) ?? ''} ${cortesia.codigo ?? ''}`.toLowerCase().includes(termo))
    );
    return ordenar(lista, ordenacao, { criado: (cortesia: any) => cortesia.createdAt, modificado: (cortesia: any) => cortesia.updatedAt, nome: (cortesia: any) => cortesia.nome ?? '' });
  }, [cortesias, eventoFilter, intervalo, ordenacao, query, situacao]);
  const descricaoFiltros = [
    eventoFilter !== 'TODOS' ? `Evento: ${eventos.find((evento) => evento.value === eventoFilter)?.label ?? eventoFilter}` : '',
    `Situação: ${SITUACAO_OPTIONS.find((option) => option.value === situacao)?.label}`,
    periodo.descricao ? `Emissão: ${periodo.descricao}` : '',
    query.trim() ? `Busca: "${query.trim()}"` : '',
    `Ordem: ${ORDENACAO_OPTIONS.find((option) => option.value === ordenacao)?.label}`
  ].filter(Boolean).join(' · ');

  async function confirmCancel() {
    if (!canceling) return;
    setCancelError('');
    try {
      await cancelarCortesia(String(canceling.id));
      setCanceling(null);
      refetch();
    } catch (cancelFailure) {
      setCancelError((cancelFailure as { message?: string })?.message ?? 'Não foi possível cancelar a cortesia.');
    }
  }

  return <Screen variant="admin">
    <Header
      title="Cortesias"
      subtitle={podeEmitir ? 'Ingressos gratuitos emitidos com motivo e responsável.' : 'Ingressos gratuitos emitidos. Seu perfil não pode emitir cortesias.'}
      right={podeEmitir ? <FloatingActionButton onPress={() => setEmitting(true)} accessibilityLabel="Emitir cortesia" /> : undefined}
    />
    <FilterBar
      search={{ value: query, onChange: setQuery, placeholder: 'Buscar por nome, CPF, evento, motivo ou responsável' }}
      filters={[
        ...(eventos.length ? [{ key: 'evento', label: 'Evento', value: eventoFilter, allValue: 'TODOS', options: [{ value: 'TODOS', label: 'Todos' }, ...eventos], onChange: setEventoFilter }] : []),
        { key: 'situacao', label: 'Situação', value: situacao, allValue: 'ATIVO', options: SITUACAO_OPTIONS, onChange: setSituacao },
        periodo.filter,
        { key: 'ordem', label: 'Ordenar', value: ordenacao, allValue: 'RECENTES', options: ORDENACAO_OPTIONS, onChange: (value) => setOrdenacao(value as Ordenacao) }
      ]}
      right={podeExportar ? <ExportButton onPress={() => setExportando(true)} /> : undefined}
    />
    {!loading && !error && cortesias.length ? <Text style={styles.resultCount}>{visiveis.length === cortesias.length ? `${cortesias.length} cortesia(s)` : `${visiveis.length} de ${cortesias.length} cortesia(s)`}</Text> : null}
    {loading ? <LoadingState label="Carregando cortesias..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error ? <View style={styles.grid}>
      {visiveis.map((cortesia: any) => <View key={String(cortesia.id)} style={gridCell}>
        <ListCard
            title={cortesia.nome ?? 'Cortesia sem nome'}
            subtitle={`${cortesia.evento?.nome ?? 'Evento não informado'} · ${formatDateTime(cortesia.createdAt)}${cortesia.quantidade ? ` · ${cortesia.quantidade} ingresso(s)` : ''}\n${cortesia.motivo ? `Motivo: ${cortesia.motivo}` : 'Motivo não informado'}${responsavelNome(cortesia.responsavel) ? ` · por ${responsavelNome(cortesia.responsavel)}` : ''}`}
            status={cortesia.status ?? 'ATIVO'}
            actions={podeCancelar ? <ActionMenu variant="ghost" actions={[
          { label: 'Cancelar cortesia', icon: 'close-circle-outline', tone: 'danger', onPress: () => { setCancelError(''); setCanceling(cortesia); } }
        ]} /> : undefined}
          />
      </View>)}
    </View> : null}
    {!loading && !error && !visiveis.length ? <EmptyState icon="ticket-percent-outline" title="Nenhuma cortesia encontrada" subtitle={podeEmitir ? 'Use o botão + para emitir uma cortesia.' : undefined} /> : null}
    {periodo.modal}
    <ExportModal visible={exportando} onClose={() => setExportando(false)} titulo="Cortesias" subtitulo={descricaoFiltros} columns={CORTESIA_COLUMNS} rows={visiveis} />
    <EmitirCortesiaModal visible={emitting} onClose={() => setEmitting(false)} onCreated={refetch} />
    <AppModal
      visible={!!canceling}
      onClose={() => setCanceling(null)}
      title="Cancelar cortesia"
      size="sm"
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Voltar" tone="dark" onPress={() => setCanceling(null)} /></View>
        <View style={styles.footerItem}><Button title="Cancelar cortesia" tone="red" onPress={confirmCancel} /></View>
      </View>}
    >
      <Text style={styles.confirm}>Cancelar a cortesia de {canceling?.nome ?? 'beneficiário'}{canceling?.evento?.nome ? ` para ${canceling.evento.nome}` : ''}? Os ingressos gerados deixam de valer na portaria.</Text>
      {cancelError ? <Text style={styles.error}>{cancelError}</Text> : null}
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  grid: gridContainer,
  resultCount: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, marginTop: -6, marginBottom: 12 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  confirm: { color: colors.text, lineHeight: 20, fontFamily: theme.font.regular },
  error: { color: colors.red, fontFamily: theme.font.medium, marginTop: 10 }
});
