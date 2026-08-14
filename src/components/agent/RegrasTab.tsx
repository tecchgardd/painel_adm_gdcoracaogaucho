import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiRecordScreen, type ApiField } from '@/components/crud/ApiRecordScreen';
import { createAgentRule, deleteAgentRule, listAgentRules, updateAgentRule, updateAgentRuleStatus } from '@/services/agent.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';
import { agentRuleSchema } from '@/validation/schemas';

const fields: ApiField[] = [
  { key: 'name', label: 'Nome', placeholder: 'Nome da regra' },
  { key: 'description', label: 'Descrição', placeholder: 'Descrição opcional', multiline: true },
  { key: 'category', label: 'Categoria', options: ['GERAL', 'VENDAS', 'INSCRICAO', 'ATENDIMENTO', 'PAGAMENTO'] },
  { key: 'content', label: 'Conteúdo aplicado pela IA', placeholder: 'Texto da regra', multiline: true },
  { key: 'priority', label: 'Prioridade (menor numero = mais prioritario)', placeholder: '5', keyboardType: 'numeric' },
  { key: 'status', label: 'Status', options: ['ATIVO', 'INATIVO'] }
];

export function RegrasTab() {
  const role = useAuthStore((state) => state.role);
  const api = useMemo(() => ({
    list: () => listAgentRules(),
    create: createAgentRule,
    update: updateAgentRule,
    remove: role === 'ADMIN' ? deleteAgentRule : undefined
  }), [role]);

  return <View>
    <View style={styles.help}>
      <Text style={styles.helpTitle}>O que é uma Regra?</Text>
      <Text style={styles.helpText}>
        Regras dizem à IA como agir em situações específicas (ex.: &ldquo;sempre oferecer parcelamento em cursos
        acima de R$ 500&rdquo;). Escreva de forma objetiva, uma orientação por regra. A prioridade define a ordem
        de aplicação quando duas regras conflitam.
      </Text>
    </View>
    <ApiRecordScreen
      embedded
      title="Regras"
      singular="regra"
      fields={fields}
      schema={agentRuleSchema}
      api={api}
      fallbackData={[]}
      primaryKey="name"
      secondaryKeys={['category', 'priority']}
      searchKeys={['name', 'description', 'category', 'status']}
      extraActions={(record) => [{
        label: record.status === 'ATIVO' ? 'Desativar regra' : 'Ativar regra',
        icon: record.status === 'ATIVO' ? 'toggle-switch-off-outline' : 'toggle-switch-outline',
        onPress: async () => { await updateAgentRuleStatus(record.id, record.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'); }
      }]}
    />
  </View>;
}

const styles = StyleSheet.create({
  help: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: theme.radius.lg, padding: 14, marginBottom: 16 },
  helpTitle: { color: colors.text, fontWeight: '900', fontSize: 14, marginBottom: 6 },
  helpText: { color: colors.muted, lineHeight: 19, fontSize: 12 }
});
