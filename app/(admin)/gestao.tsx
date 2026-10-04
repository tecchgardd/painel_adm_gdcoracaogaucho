import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Header, Screen } from '@/shared/components/ui';
import { pode, rotaPermitida } from '@/core/permissions/permissoes';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';

type ManagementItem = {
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path: string;
  /** Permissão exigida além de poder abrir a rota (ex.: `vendas.criar` para "Nova venda"). */
  permissao?: string;
};

const quickActions: ManagementItem[] = [
  { label: 'Nova venda', subtitle: 'Evento, baile ou curso', icon: 'cash-register', path: '/vendas', permissao: 'vendas.criar' },
  { label: 'Nova inscrição', subtitle: 'Venda de curso para um aluno', icon: 'account-school-outline', path: '/vendas?tipo=CURSO', permissao: 'vendas.criar' },
  { label: 'Dar baixa', subtitle: 'Pagamentos pendentes', icon: 'cash-check', path: '/pagamentos', permissao: 'pagamentos.editar' }
];

const sections: { title: string; items: ManagementItem[] }[] = [
  {
    title: 'COMERCIAL',
    items: [
      { label: 'Vendas', subtitle: 'Ingressos e inscrições', icon: 'cart-outline', path: '/vendas' },
      { label: 'Ingressos', subtitle: 'Portadores, códigos e check-in', icon: 'ticket-outline', path: '/ingressos' },
      { label: 'Inscrições', subtitle: 'Alunos, turmas e pares', icon: 'school-outline', path: '/alunos' },
      { label: 'Pagamentos', subtitle: 'Cobranças e movimentações', icon: 'cash-multiple', path: '/pagamentos' },
      { label: 'Cortesias', subtitle: 'Gratuidades com motivo', icon: 'ticket-percent-outline', path: '/cortesias' }
    ]
  },
  {
    title: 'CADASTROS',
    items: [
      { label: 'Pessoas', subtitle: 'Clientes e alunos, com histórico', icon: 'account-group-outline', path: '/clientes' },
      { label: 'Eventos e bailes', subtitle: 'Agenda e capacidade', icon: 'calendar-star', path: '/eventos' },
      { label: 'Cursos e turmas', subtitle: 'Cursos e inscrições', icon: 'school-outline', path: '/cursos' },
      { label: 'Empresas', subtitle: 'Parceiros e apoiadores', icon: 'office-building-outline', path: '/empresas' },
      { label: 'Colaboradores', subtitle: 'Equipe operacional', icon: 'badge-account-outline', path: '/colaboradores' },
      { label: 'Fotos de formaturas', subtitle: 'Envie pastas com até 1.000 fotos', icon: 'folder-multiple-image', path: '/fotos' }
    ]
  },
  {
    title: 'SISTEMA',
    items: [
      { label: 'Perfis de acesso', subtitle: 'O que cada perfil pode ver e fazer', icon: 'shield-account-outline', path: '/perfis' },
      { label: 'Agente IA', subtitle: 'Regras, prompts e conhecimento da IA', icon: 'robot-outline', path: '/agente-ia' },
      { label: 'Registro de atividades', subtitle: 'Quem fez o quê e quando', icon: 'clipboard-text-clock-outline', path: '/registros' },
      { label: 'Histórico de validações', subtitle: 'Check-ins realizados', icon: 'history', path: '/historico-validacoes' },
      { label: 'Relatórios', subtitle: 'Indicadores operacionais', icon: 'chart-box-outline', path: '/relatorios' }
    ]
  }
];

export default function Gestao() {
  const permissoes = useAuthStore((state) => state.permissoes);
  const allowed = (item: ManagementItem) => rotaPermitida(permissoes, item.path) && (!item.permissao || pode(permissoes, item.permissao));
  return <Screen variant="admin">
    <Header title="Gestão" subtitle="Central operacional de vendas, inscrições, lotes e pagamentos." />
    {quickActions.some(allowed) ? <>
      <Text style={styles.sectionTitle}>AÇÕES RÁPIDAS</Text>
      <View style={styles.quickGrid}>{quickActions.filter(allowed).map((item) => <ManagementCard key={item.label} item={item} quick />)}</View>
    </> : null}
    {sections.map((section) => ({ ...section, items: section.items.filter(allowed) })).filter((section) => section.items.length).map((section) => <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.grid}>{section.items.map((item) => <ManagementCard key={item.label} item={item} />)}</View>
    </View>)}
  </Screen>;
}

function ManagementCard({ item, quick = false }: { item: ManagementItem; quick?: boolean }) {
  return <TouchableOpacity
    activeOpacity={0.86}
    style={[styles.card, quick && styles.quickCard]}
    onPress={() => router.push(item.path as any)}
    accessibilityRole="button"
    accessibilityLabel={item.label}
  >
    <View style={[styles.iconBox, quick && styles.quickIcon]}><MaterialCommunityIcons name={item.icon} color={quick ? '#fff' : colors.red} size={24} /></View>
    <View style={styles.cardCopy}><Text style={styles.title}>{item.label}</Text><Text style={styles.subtitle}>{item.subtitle}</Text></View>
    <MaterialCommunityIcons name="chevron-right" color={colors.muted} size={22} />
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  sectionTitle: { color: colors.muted, fontSize: 12, fontFamily: theme.font.bold, letterSpacing: 1, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { minHeight: 82, width: '100%', maxWidth: 360, flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickCard: { maxWidth: 270, borderColor: '#492020', backgroundColor: '#201313' },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1515' },
  quickIcon: { backgroundColor: colors.red },
  cardCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, fontFamily: theme.font.bold },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }
});
