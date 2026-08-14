import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppModal, Button } from '@/components/ui';
import { ErrorState } from '@/components/crud/ErrorState';
import { LoadingState } from '@/components/crud/LoadingState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getAgentConfig, setAgentStatus } from '@/services/agent.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';

export function AgentStatusHeader() {
  const role = useAuthStore((state) => state.role);
  const query = useCallback(() => getAgentConfig(), []);
  const { data: config, loading, error, refetch } = useApiQuery(query);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function confirmToggle() {
    if (!config || busy) return;
    setBusy(true);
    setActionError('');
    try {
      await setAgentStatus(!config.aiEnabled);
      await refetch();
      setConfirming(false);
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? 'Não foi possível atualizar o status.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Carregando status do Agente IA..." />;
  if (error || !config) return <ErrorState message={error ?? 'Não foi possível carregar o status.'} onRetry={refetch} />;

  const active = config.aiEnabled;

  return <View style={styles.wrap}>
    <View style={[styles.pill, { backgroundColor: active ? '#17351D' : '#241414', borderColor: active ? colors.green : colors.red }]}>
      <View style={[styles.dot, { backgroundColor: active ? colors.green : colors.red }]} />
      <Text style={[styles.pillText, { color: active ? colors.green : colors.red }]}>{active ? 'IA ATIVA' : 'IA PAUSADA'}</Text>
    </View>
    {role === 'ADMIN' ? <Button title={active ? 'Pausar' : 'Ativar'} tone={active ? 'red' : 'green'} onPress={() => setConfirming(true)} /> : null}

    <AppModal
      visible={confirming}
      onClose={() => { if (!busy) setConfirming(false); }}
      position="center"
      title={active ? 'Pausar Agente IA' : 'Ativar Agente IA'}
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setConfirming(false)} /></View>
        <View style={styles.footerItem}><Button title={busy ? 'Aguarde...' : active ? 'Confirmar pausa' : 'Confirmar ativação'} tone={active ? 'red' : 'green'} onPress={busy ? undefined : confirmToggle} /></View>
      </View>}
    >
      <Text style={styles.confirmText}>
        {active
          ? 'A IA deixará de responder automaticamente em todos os canais habilitados até ser reativada.'
          : 'A IA voltará a responder automaticamente nos canais habilitados.'}
      </Text>
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
    </AppModal>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.md, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  confirmText: { color: colors.muted, lineHeight: 20 },
  error: { color: colors.red, fontWeight: '800', marginTop: 10 }
});
