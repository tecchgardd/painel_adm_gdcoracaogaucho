import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useApiQuery } from '@/hooks/useApiQuery';
import { getAgentConfig } from '@/services/agent.service';
import { colors, theme } from '@/theme/theme';

export function AgentTeaserCard() {
  const query = useCallback(() => getAgentConfig(), []);
  const { data: config, loading } = useApiQuery(query);
  const active = config?.aiEnabled;

  return <TouchableOpacity
    activeOpacity={0.86}
    style={styles.card}
    onPress={() => router.push('/agente-ia')}
    accessibilityRole="button"
    accessibilityLabel="Agente IA"
  >
    <View style={styles.iconBox}><MaterialCommunityIcons name="robot-outline" color="#ffb36b" size={24} /></View>
    <View style={styles.copy}>
      <Text style={styles.title}>Agente IA</Text>
      <Text style={styles.subtitle}>Regras, prompts, canais e conhecimento da IA</Text>
    </View>
    {!loading && config ? <View style={[styles.pill, { backgroundColor: active ? '#17351D' : '#241414', borderColor: active ? colors.green : colors.red }]}>
      <View style={[styles.dot, { backgroundColor: active ? colors.green : colors.red }]} />
      <Text style={[styles.pillText, { color: active ? colors.green : colors.red }]}>{active ? 'IA ATIVA' : 'IA PAUSADA'}</Text>
    </View> : null}
    <MaterialCommunityIcons name="chevron-right" color={colors.muted} size={22} />
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  card: { minHeight: 82, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1515' },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.md, borderWidth: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 }
});
