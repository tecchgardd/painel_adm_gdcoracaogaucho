import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AgentStatusHeader } from '@/features/agente-ia/components/AgentStatusHeader';
import { AprendizadosTab } from '@/features/agente-ia/components/AprendizadosTab';
import { ConhecimentoTab } from '@/features/agente-ia/components/ConhecimentoTab';
import { PromptsTab } from '@/features/agente-ia/components/PromptsTab';
import { RegrasTab } from '@/features/agente-ia/components/RegrasTab';
import { ChoiceGroup, Header, Screen } from '@/shared/components/ui';

type Tab = 'REGRAS' | 'PROMPTS' | 'CONHECIMENTO' | 'APRENDIZADOS';

const TABS: { key: Tab; label: string }[] = [
  { key: 'REGRAS', label: 'Regras' },
  { key: 'PROMPTS', label: 'Prompts' },
  { key: 'CONHECIMENTO', label: 'Conhecimento' },
  { key: 'APRENDIZADOS', label: 'Aprendizados' }
];

export default function AgenteIa() {
  const [tab, setTab] = useState<Tab>('REGRAS');

  return <Screen variant="admin">
    <Header title="Agente IA" subtitle="Regras, prompts e conhecimento que orientam o atendimento automático." />
    <AgentStatusHeader />
    <View style={styles.tabs}>
      <ChoiceGroup options={TABS.map((item) => ({ value: item.key, label: item.label }))} value={tab} onChange={(value) => setTab(value as Tab)} />
    </View>
    {tab === 'REGRAS' ? <RegrasTab /> : null}
    {tab === 'PROMPTS' ? <PromptsTab /> : null}
    {tab === 'CONHECIMENTO' ? <ConhecimentoTab /> : null}
    {tab === 'APRENDIZADOS' ? <AprendizadosTab /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  tabs: { marginTop: 4, marginBottom: 16 }
});
