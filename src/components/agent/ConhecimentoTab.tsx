import { useMemo } from 'react';
import { View } from 'react-native';

import { ApiRecordScreen, type ApiField } from '@/components/crud/ApiRecordScreen';
import { createAgentKnowledge, deleteAgentKnowledge, listAgentKnowledge, updateAgentKnowledge, updateAgentKnowledgeStatus } from '@/services/agent.service';
import { useAuthStore } from '@/stores/auth.store';
import { agentKnowledgeSchema } from '@/validation/schemas';

const fields: ApiField[] = [
  { key: 'title', label: 'Título', placeholder: 'Título do item' },
  { key: 'content', label: 'Conteúdo', placeholder: 'Conteúdo que a IA pode consultar', multiline: true },
  { key: 'type', label: 'Tipo', options: ['FAQ', 'POLICY', 'EVENT', 'COURSE', 'PAYMENT', 'TICKET', 'OTHER'] },
  { key: 'source', label: 'Origem', placeholder: 'Link ou origem (opcional)' },
  { key: 'status', label: 'Status', options: ['ATIVO', 'INATIVO'] },
  { key: 'approvedById', label: 'Aprovado por (ID do colaborador)', readOnly: true }
];

export function ConhecimentoTab() {
  const role = useAuthStore((state) => state.role);
  const api = useMemo(() => ({
    list: () => listAgentKnowledge(),
    create: createAgentKnowledge,
    update: updateAgentKnowledge,
    remove: role === 'ADMIN' ? deleteAgentKnowledge : undefined
  }), [role]);

  return <View>
    <ApiRecordScreen
      embedded
      title="Conhecimento"
      singular="item de conhecimento"
      fields={fields}
      schema={agentKnowledgeSchema}
      api={api}
      fallbackData={[]}
      primaryKey="title"
      secondaryKeys={['type', 'source']}
      searchKeys={['title', 'content', 'type', 'source', 'status']}
      extraActions={(record) => [{
        label: record.status === 'ATIVO' ? 'Desativar item' : 'Ativar item',
        icon: record.status === 'ATIVO' ? 'toggle-switch-off-outline' : 'toggle-switch-outline',
        onPress: async () => { await updateAgentKnowledgeStatus(record.id, record.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'); }
      }]}
    />
  </View>;
}
