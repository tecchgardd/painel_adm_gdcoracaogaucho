import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { getAgentConfig } from '@/services/agent.service';
import { colors, theme } from '@/theme/theme';

export function AgentStatusHeader() {
  const query = useCallback(() => getAgentConfig(), []);
  const { data: config, loading, error, refetch } = useApiQuery(query);

  if (loading) return <LoadingState label="Carregando status do Agente IA..." />;
  if (error || !config) return <ErrorState message={error ?? 'Não foi possível carregar o status.'} onRetry={refetch} />;

  const active = config.aiEnabled;

  return <View style={styles.wrap}>
    <View style={[styles.pill, { backgroundColor: active ? '#17351D' : '#241414', borderColor: active ? colors.green : colors.red }]}>
      <View style={[styles.dot, { backgroundColor: active ? colors.green : colors.red }]} />
      <Text style={[styles.pillText, { color: active ? colors.green : colors.red }]}>{active ? 'IA ATIVA' : 'IA PAUSADA'}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.md, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }
});
