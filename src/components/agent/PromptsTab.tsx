import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiRecordScreen, type ApiField } from '@/components/crud/ApiRecordScreen';
import { createAgentPrompt, deleteAgentPrompt, listAgentPrompts, updateAgentPrompt, updateAgentPromptStatus } from '@/services/agent.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';
import { agentPromptSchema } from '@/validation/schemas';

const fields: ApiField[] = [
  { key: 'name', label: 'Nome', placeholder: 'Nome do prompt' },
  { key: 'description', label: 'Descrição', placeholder: 'Descrição opcional', multiline: true },
  { key: 'content', label: 'Conteúdo/instruções', placeholder: 'Instruções detalhadas do prompt', multiline: true },
  { key: 'tone', label: 'Tom de voz', placeholder: 'Ex: Acolhedor, gaúcho e profissional' },
  { key: 'scope', label: 'Aplicação', options: ['GENERAL', 'VENDAS', 'INSCRICAO'] },
  { key: 'status', label: 'Status', options: ['ATIVO', 'INATIVO'] },
  { key: 'version', label: 'Versão', readOnly: true }
];

export function PromptsTab() {
  const role = useAuthStore((state) => state.role);
  const api = useMemo(() => ({
    list: () => listAgentPrompts(),
    create: createAgentPrompt,
    update: updateAgentPrompt,
    remove: role === 'ADMIN' ? deleteAgentPrompt : undefined
  }), [role]);

  return <View>
    <View style={styles.help}>
      <Text style={styles.helpTitle}>O que é um Prompt?</Text>
      <Text style={styles.helpText}>
        O Prompt define a personalidade, o tom de voz e as instruções gerais da IA para um contexto de uso.
        Diferente das Regras (orientações pontuais), o Prompt é a base de comportamento. Alterar o conteúdo, tom
        ou aplicação incrementa a versão automaticamente — use para acompanhar o histórico de mudanças.
      </Text>
    </View>
    <ApiRecordScreen
      embedded
      title="Prompts"
      singular="prompt"
      fields={fields}
      schema={agentPromptSchema}
      api={api}
      fallbackData={[]}
      primaryKey="name"
      secondaryKeys={['scope', 'tone']}
      searchKeys={['name', 'description', 'scope', 'tone', 'status']}
      extraActions={(record) => [{
        label: record.status === 'ATIVO' ? 'Desativar prompt' : 'Ativar prompt',
        icon: record.status === 'ATIVO' ? 'toggle-switch-off-outline' : 'toggle-switch-outline',
        onPress: async () => { await updateAgentPromptStatus(record.id, record.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'); }
      }]}
    />
  </View>;
}

const styles = StyleSheet.create({
  help: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: theme.radius.lg, padding: 14, marginBottom: 16 },
  helpTitle: { color: colors.text, fontWeight: '900', fontSize: 14, marginBottom: 6 },
  helpText: { color: colors.muted, lineHeight: 19, fontSize: 12 }
});
