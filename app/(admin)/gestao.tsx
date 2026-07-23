import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Header, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/theme';

type ManagementItem = {
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path: string;
  adminOnly?: boolean;
};

const quickActions: ManagementItem[] = [
  { label: 'Nova venda', subtitle: 'Evento, baile ou curso', icon: 'cash-register', path: '/vendas' },
  { label: 'Nova inscrição', subtitle: 'Somente curso ou turma', icon: 'account-school-outline', path: '/alunos' },
  { label: 'Gerar lote', subtitle: 'Aluno + evento ou baile', icon: 'ticket-confirmation-outline', path: '/ingressos' },
  { label: 'Dar baixa', subtitle: 'Pagamentos pendentes', icon: 'cash-check', path: '/pagamentos' }
];

const sections: { title: string; items: ManagementItem[] }[] = [
  {
    title: 'COMERCIAL',
    items: [
      { label: 'Vendas', subtitle: 'Eventos, bailes e cursos', icon: 'cart-outline', path: '/vendas' },
      { label: 'Pagamentos', subtitle: 'Cobranças e movimentações', icon: 'cash-multiple', path: '/pagamentos' },
      { label: 'Inscrições', subtitle: 'Alunos vinculados a cursos', icon: 'account-school-outline', path: '/alunos' },
      { label: 'Lotes de ingressos', subtitle: 'Lotes vinculados a alunos', icon: 'ticket-confirmation-outline', path: '/ingressos' },
      { label: 'Pedidos da loja', subtitle: 'Produtos, retirada e entrega', icon: 'shopping-outline', path: '/pedidos' }
    ]
  },
  {
    title: 'CADASTROS',
    items: [
      { label: 'Alunos', subtitle: 'Pessoas e dados cadastrais', icon: 'account-group-outline', path: '/alunos' },
      { label: 'Eventos e bailes', subtitle: 'Agenda e capacidade', icon: 'calendar-star', path: '/eventos' },
      { label: 'Cursos e turmas', subtitle: 'Cursos e inscrições', icon: 'school-outline', path: '/cursos' },
      { label: 'Empresas', subtitle: 'Parceiros e apoiadores', icon: 'office-building-outline', path: '/empresas' },
      { label: 'Colaboradores', subtitle: 'Equipe operacional', icon: 'badge-account-outline', path: '/colaboradores', adminOnly: true }
    ]
  },
  {
    title: 'SISTEMA',
    items: [
      { label: 'Usuários e permissões', subtitle: 'Acessos administrativos', icon: 'account-key-outline', path: '/colaboradores', adminOnly: true },
      { label: 'Configurações', subtitle: 'Preferências do painel', icon: 'cog-outline', path: '/configuracoes', adminOnly: true },
      { label: 'Histórico de ações', subtitle: 'Validações e auditoria', icon: 'history', path: '/historico-validacoes' },
      { label: 'Relatórios', subtitle: 'Indicadores operacionais', icon: 'chart-box-outline', path: '/relatorios' }
    ]
  }
];

export default function Gestao() {
  const role = useAuthStore((state) => state.role);
  const allowed = (item: ManagementItem) => !item.adminOnly || role === 'ADMIN';
  return <Screen variant="admin">
    <Header title="Gestão" />
    <Text style={styles.lead}>Central operacional de vendas, inscrições, lotes e pagamentos.</Text>
    <Text style={styles.sectionTitle}>AÇÕES RÁPIDAS</Text>
    <View style={styles.quickGrid}>{quickActions.filter(allowed).map((item) => <ManagementCard key={item.label} item={item} quick />)}</View>
    {sections.map((section) => <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.grid}>{section.items.filter(allowed).map((item) => <ManagementCard key={item.label} item={item} />)}</View>
    </View>)}
  </Screen>;
}

function ManagementCard({ item, quick = false }: { item: ManagementItem; quick?: boolean }) {
  return <TouchableOpacity activeOpacity={0.86} style={[styles.card, quick && styles.quickCard]} onPress={() => router.push(item.path as any)}>
    <View style={[styles.iconBox, quick && styles.quickIcon]}><MaterialCommunityIcons name={item.icon} color={quick ? '#fff' : colors.red} size={24} /></View>
    <View style={styles.cardCopy}><Text style={styles.title}>{item.label}</Text><Text style={styles.subtitle}>{item.subtitle}</Text></View>
    <MaterialCommunityIcons name="chevron-right" color={colors.muted} size={22} />
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  lead: { color: colors.muted, lineHeight: 20, marginBottom: 18 },
  section: { marginTop: 22 },
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { minHeight: 82, width: '100%', maxWidth: 360, flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickCard: { maxWidth: 270, borderColor: '#492020', backgroundColor: '#201313' },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1515' },
  quickIcon: { backgroundColor: colors.red },
  cardCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }
});
