import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ChoiceGroup, FormField } from '@/components/ui';
import { ErrorState } from '@/components/crud/ErrorState';
import { LoadingState } from '@/components/crud/LoadingState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { getAgentConfig, updateAgentConfig } from '@/services/agent.service';
import { colors } from '@/theme/theme';
import type { AgentFirstResponseMode } from '@/types/agent';

export function ConfiguracoesTab() {
  const query = useCallback(() => getAgentConfig(), []);
  const { data: config, loading, error, refetch } = useApiQuery(query);
  const [mode, setMode] = useState<AgentFirstResponseMode>('INSTANT');
  const [delay, setDelay] = useState('0');
  const [sla, setSla] = useState('0');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!config) return;
    setMode(config.firstResponseMode);
    setDelay(String(config.firstResponseDelaySeconds));
    setSla(String(config.humanQueueSlaSeconds));
  }, [config]);

  async function save() {
    setSaving(true);
    setFormError('');
    setSaved(false);
    const delaySeconds = Number(delay);
    const slaSeconds = Number(sla);
    if (!Number.isFinite(delaySeconds) || delaySeconds < 0 || !Number.isFinite(slaSeconds) || slaSeconds < 0) {
      setFormError('Informe valores numéricos válidos (0 ou maiores).');
      setSaving(false);
      return;
    }
    try {
      await updateAgentConfig({ firstResponseMode: mode, firstResponseDelaySeconds: delaySeconds, humanQueueSlaSeconds: slaSeconds });
      await refetch();
      setSaved(true);
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Carregando configurações..." />;
  if (error || !config) return <ErrorState message={error ?? 'Não foi possível carregar as configurações.'} onRetry={refetch} />;

  return <View>
    <Text style={styles.label}>Modo de primeira resposta</Text>
    <ChoiceGroup
      options={[{ value: 'INSTANT', label: 'Instantânea' }, { value: 'DELAYED', label: 'Com atraso' }]}
      value={mode}
      onChange={(value) => setMode(value as AgentFirstResponseMode)}
    />
    {mode === 'DELAYED' ? <FormField label="Atraso da primeira resposta (segundos)" value={delay} onChangeText={setDelay} keyboardType="numeric" /> : null}
    <FormField label="SLA da fila humana (segundos)" value={sla} onChangeText={setSla} keyboardType="numeric" />
    {formError ? <Text style={styles.error}>{formError}</Text> : null}
    {saved ? <Text style={styles.success}>Configurações salvas.</Text> : null}
    <View style={styles.actions}><Button title={saving ? 'Salvando...' : 'Salvar configurações'} tone="green" onPress={saving ? undefined : save} /></View>
  </View>;
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 4 },
  error: { color: colors.red, fontWeight: '800', marginTop: 10 },
  success: { color: colors.green, fontWeight: '800', marginTop: 10 },
  actions: { marginTop: 16 }
});
