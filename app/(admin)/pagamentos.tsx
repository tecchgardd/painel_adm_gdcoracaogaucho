import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActionMenu, Header, ListCard, Screen, SearchBar } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { cancelarPagamento, confirmarPagamento, listPagamentos } from '@/services/pagamentos.service';
import { colors } from '@/theme/colors';
import { formatCurrencyBRL, formatDateTime } from '@/utils/format';

export default function Pagamentos() {
  const [query, setQuery] = useState('');
  const queryPagamentos = useCallback(() => listPagamentos(), []);
  const { data, loading, error, refetch } = useApiQuery(queryPagamentos, { fallbackData: [] });
  const pagamentos = data ?? [];
  const filtered = useMemo(() => pagamentos.filter((pagamento: any) =>
    `${pagamento.id} ${pagamento.nomeCustomer ?? ''} ${pagamento.cpfCustomer ?? ''} ${pagamento.status ?? ''}`.toLowerCase().includes(query.toLowerCase())
  ), [pagamentos, query]);

  async function confirm(id: string) {
    await confirmarPagamento(id);
    refetch();
  }

  async function cancel(id: string) {
    await cancelarPagamento(id);
    refetch();
  }

  return <Screen variant="admin">
    <Header title="Pagamentos" />
    <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar pagamentos" />
    {loading ? <Text style={styles.state}>Carregando pagamentos...</Text> : null}
    {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
    {!error ? <View style={styles.list}>
      {filtered.map((pagamento: any) => <View key={String(pagamento.id)} style={styles.row}>
        <View style={styles.rowCard}>
          <ListCard
            title={pagamento.nomeCustomer ?? pagamento.customer?.nome ?? `Pagamento ${pagamento.id}`}
            subtitle={`${pagamento.cpfCustomer ?? pagamento.customer?.cpf ?? '-'}\n${formatCurrencyBRL(pagamento.valor)} - ${formatDateTime(pagamento.createdAt)}`}
            status={pagamento.status}
          />
        </View>
        <ActionMenu actions={[
          { label: 'Confirmar', icon: 'cash-check', onPress: () => confirm(String(pagamento.id)) },
          { label: 'Cancelar', icon: 'close-circle-outline', tone: 'danger', onPress: () => cancel(String(pagamento.id)) }
        ]} />
      </View>)}
    </View> : null}
    {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 }
});

