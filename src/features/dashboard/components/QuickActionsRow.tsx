import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { Panel } from '@/shared/components/ui';
import { colors, theme } from '@/theme/theme';

type QuickAction = {
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path: string;
};

export const quickActions: QuickAction[] = [
  { label: 'Nova venda', subtitle: 'Evento, baile ou curso', icon: 'cash-register', path: '/vendas' },
  { label: 'Nova inscrição', subtitle: 'Curso para um aluno', icon: 'account-school-outline', path: '/vendas?tipo=CURSO' },
  { label: 'Cortesias', subtitle: 'Gratuidades com motivo', icon: 'ticket-percent-outline', path: '/cortesias' },
  { label: 'Dar baixa', subtitle: 'Pagamentos pendentes', icon: 'cash-check', path: '/pagamentos' },
  { label: 'Scanner', subtitle: 'Validar ingressos', icon: 'qrcode-scan', path: '/scanner' },
  { label: 'Agente IA', subtitle: 'Regras e conhecimento', icon: 'robot-outline', path: '/agente-ia' }
];

export function QuickActionsRow({ columns = 3 }: { columns?: number }) {
  const cell = gridCellStyle(columns);
  return <Panel title="Atalhos" icon="lightning-bolt-outline">
    <View style={[gridContainer, styles.grid]}>
      {quickActions.map((item) => <View key={item.label} style={cell}>
        <Pressable
          onPress={() => router.push(item.path as any)}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={(state) => [styles.action, (state as { hovered?: boolean }).hovered && styles.actionHover, state.pressed && styles.pressed]}
        >
          <View style={styles.iconBox}><MaterialCommunityIcons name={item.icon} color={colors.red} size={20} /></View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.title}>{item.label}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        </Pressable>
      </View>)}
    </View>
  </Panel>;
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  grid: { marginBottom: -12 },
  action: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: 12, ...webCursor },
  actionHover: { borderColor: colors.redBorder, backgroundColor: colors.cardHover },
  pressed: { opacity: 0.85 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.redSoft },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 13, fontFamily: theme.font.semiBold },
  subtitle: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.regular, marginTop: 1 }
});
