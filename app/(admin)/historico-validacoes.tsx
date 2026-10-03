import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Header, ListCard, Screen, FilterBar } from '@/shared/components/ui';
import { matchSituacao } from '@/shared/utils/situacao';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { getHistoricoValidacoes } from '@/features/scanner/services/scanner.service';
import { formatDateTime } from '@/shared/utils/format';

export default function HistoricoValidacoes() {
  const [query, setQuery] = useState('');
  const [situacao, setSituacao] = useState('TODAS');
  const queryHistorico = useCallback(() => getHistoricoValidacoes(), []);
  const { data, loading, error, refetch } = useApiQuery(queryHistorico, { fallbackData: [] });
  const historico = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const filtered = useMemo(() => historico.filter((item: any) =>
    `${item.codigo ?? ''} ${item.cliente ?? ''} ${item.status ?? ''} ${item.evento?.nome ?? ''}`.toLowerCase().includes(query.toLowerCase())
  ), [historico, query]);
  const visiveis = filtered.filter((item: any) => matchSituacao(item.status, situacao));

  return <Screen variant="admin">
    <Header title="Histórico de validações" subtitle="Leituras feitas na portaria, com o resultado de cada uma." />
    <FilterBar
      search={{ value: query, onChange: setQuery, placeholder: 'Buscar por código, pessoa ou evento' }}
      filters={[{ key: 'situacao', label: 'Resultado', value: situacao, allValue: 'TODAS', options: [
        { value: 'TODAS', label: 'Todos' },
        { value: 'VALIDO', label: 'Válidos' },
        { value: 'JA_UTILIZADO', label: 'Já utilizados' },
        { value: 'CANCELADO', label: 'Cancelados' },
        { value: 'NAO_ENCONTRADO', label: 'Não encontrados' },
        { value: 'EVENTO_EXPIRADO', label: 'Evento expirado' }
      ], onChange: setSituacao }]}
    />
    {loading ? <LoadingState label="Carregando validações..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error ? <View style={styles.list}>
      {visiveis.map((item: any, index: number) => <ListCard
        key={String(item.id ?? item.codigo ?? index)}
        title={item.cliente ?? item.customer?.nome ?? item.codigo ?? 'Validação'}
        subtitle={`${item.evento?.nome ?? item.eventoNome ?? '-'}\n${formatDateTime(item.createdAt ?? item.validadoEm ?? item.horario)}`}
        status={item.status}
      />)}
    </View> : null}
    {!loading && !error && !visiveis.length ? <EmptyState icon="history" title="Nenhuma validação encontrada" subtitle={historico.length ? 'Ajuste a busca ou o filtro.' : 'As leituras do scanner aparecem aqui.'} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { gap: 10 }
});
