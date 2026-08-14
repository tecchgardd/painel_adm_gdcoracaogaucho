import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { EmptyState } from '@/components/crud/EmptyState';
import { ErrorState } from '@/components/crud/ErrorState';
import { LoadingState } from '@/components/crud/LoadingState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { listAgentChannels, updateAgentChannel } from '@/services/agent.service';
import { colors, theme } from '@/theme/theme';
import type { AgentChannel, AgentChannelName } from '@/types/agent';

const CHANNEL_LABELS: Record<AgentChannelName, string> = {
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  WEBSITE: 'Site'
};

export function CanaisTab() {
  const query = useCallback(() => listAgentChannels(), []);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: [] });
  const [busyChannel, setBusyChannel] = useState<AgentChannelName | null>(null);
  const [actionError, setActionError] = useState('');
  const channels = data ?? [];

  async function toggle(channel: AgentChannel) {
    setBusyChannel(channel.channel);
    setActionError('');
    try {
      await updateAgentChannel(channel.channel, !channel.enabled);
      await refetch();
    } catch (err) {
      setActionError((err as { message?: string })?.message ?? 'Não foi possível atualizar o canal.');
    } finally {
      setBusyChannel(null);
    }
  }

  if (loading) return <LoadingState label="Carregando canais..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return <View>
    {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
    {channels.map((channel) => <View key={channel.id} style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.name}>{CHANNEL_LABELS[channel.channel]}</Text>
        <Text style={styles.meta}>{channel.provider ? `Provedor: ${channel.provider}` : 'Sem provedor configurado'}</Text>
      </View>
      <Button
        title={busyChannel === channel.channel ? 'Aguarde...' : channel.enabled ? 'Ativado' : 'Desativado'}
        tone={channel.enabled ? 'green' : 'dark'}
        onPress={busyChannel ? undefined : () => toggle(channel)}
      />
    </View>)}
    {!channels.length ? <EmptyState title="Nenhum canal encontrado." /> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: theme.radius.lg, padding: 14, marginBottom: 10 },
  rowBody: { flex: 1 },
  name: { color: colors.text, fontWeight: '900', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  error: { color: colors.red, fontWeight: '800', marginBottom: 10 }
});
