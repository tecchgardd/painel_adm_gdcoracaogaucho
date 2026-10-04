import { useMemo } from 'react';
import { View } from 'react-native';

import { ApiRecordScreen, type ApiField } from '@/shared/components/crud/ApiRecordScreen';
import { createAgentKnowledge, deleteAgentKnowledge, listAgentKnowledge, updateAgentKnowledge, updateAgentKnowledgeStatus } from '@/features/agente-ia/services/agent.service';
import { usePode } from '@/stores/auth.store';
import { agentKnowledgeSchema } from '@/validation/schemas';

const fields: ApiField[] = [
  { key: 'title', label: 'Título', placeholder: 'Título do item', required: true },
  { key: 'content', label: 'Conteúdo', placeholder: 'Conteúdo que a IA pode consultar', multiline: true },
  { key: 'type', label: 'Tipo', options: ['FAQ', 'POLICY', 'EVENT', 'COURSE', 'PAYMENT', 'TICKET', 'OTHER'], optionLabels: { FAQ: 'Pergunta frequente', POLICY: 'Política', EVENT: 'Evento', COURSE: 'Curso', PAYMENT: 'Pagamento', TICKET: 'Ingresso', OTHER: 'Outro' } },
  { key: 'source', label: 'Origem', placeholder: 'Link ou origem (opcional)' },
  { key: 'status', label: 'Status', options: ['ATIVO', 'INATIVO'] },
  { key: 'approvedById', label: 'Aprovado por (ID do colaborador)', readOnly: true }
];

export function ConhecimentoTab() {
  const podeCriar = usePode('agente-ia.criar');
  const podeEditar = usePode('agente-ia.editar');
  const podeExcluir = usePode('agente-ia.excluir');
  const api = useMemo(() => ({
    list: () => listAgentKnowledge(),
    create: podeCriar ? createAgentKnowledge : undefined,
    update: podeEditar ? updateAgentKnowledge : undefined,
    remove: podeExcluir ? deleteAgentKnowledge : undefined
  }), [podeCriar, podeEditar, podeExcluir]);

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
