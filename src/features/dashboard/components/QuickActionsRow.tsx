import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors, theme } from '@/theme/theme';

type QuickAction = {
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path: string;
};

const quickActions: QuickAction[] = [
  { label: 'Nova venda', subtitle: 'Evento, baile ou curso', icon: 'cash-register', path: '/vendas' },
  { label: 'Nova inscrição', subtitle: 'Venda de curso para um aluno', icon: 'account-school-outline', path: '/vendas?tipo=CURSO' },
  { label: 'Gerar lote', subtitle: 'Aluno + evento ou baile', icon: 'ticket-confirmation-outline', path: '/vendas?tipo=LOTE' },
  { label: 'Dar baixa', subtitle: 'Pagamentos pendentes', icon: 'cash-check', path: '/pagamentos' },
  { label: 'Agente IA', subtitle: 'Regras, prompts e canais', icon: 'robot-outline', path: '/agente-ia' }
];

export function QuickActionsRow() {
  return <View>
    <Text style={styles.sectionTitle}>AÇÕES RÁPIDAS</Text>
    <View style={styles.grid}>
      {quickActions.map((item) => <TouchableOpacity
        key={item.label}
        activeOpacity={0.86}
        style={styles.card}
        onPress={() => router.push(item.path as any)}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <View style={styles.iconBox}><MaterialCommunityIcons name={item.icon} color="#fff" size={22} /></View>
        <Text style={styles.title}>{item.label}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </TouchableOpacity>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { minWidth: 150, maxWidth: 270, flexGrow: 1, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: '#492020', backgroundColor: '#201313', padding: 14 },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.red, marginBottom: 10 },
  title: { color: colors.text, fontSize: 13, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 }
});
