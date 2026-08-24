import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Header, ListCard, Screen, SearchBar } from '@/shared/components/ui';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { getHistoricoValidacoes } from '@/services/scanner.service';
import { formatDateTime } from '@/shared/utils/format';

export default function HistoricoValidacoes() {
  const [query, setQuery] = useState('');
  const queryHistorico = useCallback(() => getHistoricoValidacoes(), []);
  const { data, loading, error, refetch } = useApiQuery(queryHistorico, { fallbackData: [] });
  const historico = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const filtered = useMemo(() => historico.filter((item: any) =>
    `${item.codigo ?? ''} ${item.cliente ?? ''} ${item.status ?? ''} ${item.evento?.nome ?? ''}`.toLowerCase().includes(query.toLowerCase())
  ), [historico, query]);

  return <Screen variant="admin">
    <Header title="Histórico de validações" />
    <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar validações" />
    {loading ? <LoadingState label="Carregando validações..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error ? <View style={styles.list}>
      {filtered.map((item: any, index: number) => <ListCard
        key={String(item.id ?? item.codigo ?? index)}
        title={item.cliente ?? item.customer?.nome ?? item.codigo ?? 'Validação'}
        subtitle={`${item.evento?.nome ?? item.eventoNome ?? '-'}\n${formatDateTime(item.createdAt ?? item.validadoEm ?? item.horario)}`}
        status={item.status}
      />)}
    </View> : null}
    {!loading && !error && !filtered.length ? <EmptyState /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { gap: 10 }
});
