import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Header, ListCard, Screen, SearchBar } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getHistoricoValidacoes } from '@/services/scanner.service';
import { colors } from '@/theme/colors';
import { formatDateTime } from '@/utils/format';

export default function HistoricoValidacoes() {
  const [query, setQuery] = useState('');
  const queryHistorico = useCallback(() => getHistoricoValidacoes(), []);
  const { data, loading, error, refetch } = useApiQuery(queryHistorico, { fallbackData: [] });
  const historico = Array.isArray(data) ? data : [];
  const filtered = useMemo(() => historico.filter((item: any) =>
    `${item.codigo ?? ''} ${item.cliente ?? ''} ${item.status ?? ''} ${item.evento?.nome ?? ''}`.toLowerCase().includes(query.toLowerCase())
  ), [historico, query]);

  return <Screen variant="admin">
    <Header title="Histórico de validações" />
    <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar validações" />
    {loading ? <Text style={styles.state}>Carregando validações...</Text> : null}
    {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
    {!error ? <View style={styles.list}>
      {filtered.map((item: any, index: number) => <ListCard
        key={String(item.id ?? item.codigo ?? index)}
        title={item.cliente ?? item.customer?.nome ?? item.codigo ?? 'Validação'}
        subtitle={`${item.evento?.nome ?? item.eventoNome ?? '-'}\n${formatDateTime(item.createdAt ?? item.validadoEm ?? item.horario)}`}
        status={item.status}
      />)}
    </View> : null}
    {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 }
});

