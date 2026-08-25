import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { AgentStatusHeader } from '@/components/agent/AgentStatusHeader';
import { AprendizadosTab } from '@/components/agent/AprendizadosTab';
import { ConhecimentoTab } from '@/components/agent/ConhecimentoTab';
import { PromptsTab } from '@/components/agent/PromptsTab';
import { RegrasTab } from '@/components/agent/RegrasTab';
import { Header, Screen } from '@/shared/components/ui';
import { colors } from '@/theme/theme';

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
    <Header title="Agente IA" />
    <AgentStatusHeader />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {TABS.map((item) => <TouchableOpacity key={item.key} style={[styles.tab, tab === item.key && styles.tabActive]} onPress={() => setTab(item.key)}>
        <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
      </TouchableOpacity>)}
    </ScrollView>
    {tab === 'REGRAS' ? <RegrasTab /> : null}
    {tab === 'PROMPTS' ? <PromptsTab /> : null}
    {tab === 'CONHECIMENTO' ? <ConhecimentoTab /> : null}
    {tab === 'APRENDIZADOS' ? <AprendizadosTab /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  tabs: { gap: 6, paddingBottom: 14 },
  tab: { minHeight: 38, paddingHorizontal: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, outlineStyle: 'none' as any },
  tabActive: { backgroundColor: colors.red },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: '#fff' }
});
