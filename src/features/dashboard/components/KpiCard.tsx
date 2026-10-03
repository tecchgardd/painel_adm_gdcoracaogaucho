import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, theme } from '@/theme/theme';

export type KpiTone = 'red' | 'green' | 'yellow' | 'blue' | 'neutral';

const toneColors: Record<KpiTone, { fg: string; bg: string }> = {
  red: { fg: colors.red, bg: colors.redSoft },
  green: { fg: '#4CB85C', bg: colors.greenSoft },
  yellow: { fg: colors.yellow, bg: colors.yellowSoft },
  blue: { fg: '#5B9FE0', bg: colors.blueSoft },
  neutral: { fg: colors.muted, bg: 'rgba(155, 157, 166, 0.12)' }
};

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  tone?: KpiTone;
  /** Destaque visual (gradiente da marca) para o indicador principal da linha. */
  highlight?: boolean;
  /** Versão reduzida para linhas de três no mobile: sem dica e valor menor. */
  compact?: boolean;
  onPress?: () => void;
};

export function KpiCard({ label, value, hint, icon, tone = 'neutral', highlight = false, compact = false, onPress }: Props) {
  const palette = toneColors[tone];
  const content = <>
    <View style={styles.top}>
      <Text numberOfLines={1} style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      {compact ? <View style={[styles.dot, { backgroundColor: palette.fg }]} /> : <View style={[styles.iconBox, { backgroundColor: highlight ? 'rgba(255,255,255,0.12)' : palette.bg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={highlight ? '#fff' : palette.fg} />
      </View>}
    </View>
    <Text numberOfLines={1} style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
    {hint && !compact ? <Text numberOfLines={1} style={[styles.hint, highlight && styles.hintHighlight]}>{hint}</Text> : null}
  </>;

  return <Pressable
    disabled={!onPress}
    onPress={onPress}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={`${label}: ${value}`}
    style={({ pressed }) => [styles.shell, highlight ? styles.shellHighlight : null, pressed && styles.pressed, onPress && webCursor]}
  >
    {highlight
      ? <LinearGradient colors={['#5A1A19', '#2A1112', colors.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>{content}</LinearGradient>
      : <View style={[styles.card, compact && styles.cardCompact]}>{content}</View>}
  </Pressable>;
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  shell: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, overflow: 'hidden' },
  shellHighlight: { borderColor: colors.redBorder },
  pressed: { opacity: 0.88 },
  card: { minHeight: 124, padding: 16, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flex: 1, color: colors.muted, fontSize: 13, fontFamily: theme.font.medium },
  cardCompact: { minHeight: 96, padding: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  labelCompact: { fontSize: 12 },
  valueCompact: { fontSize: 22, lineHeight: 28 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.text, fontSize: 28, lineHeight: 36, fontFamily: theme.font.semiBold, marginTop: 10 },
  hint: { color: colors.subtle, fontSize: 12, fontFamily: theme.font.regular, marginTop: 2 },
  hintHighlight: { color: 'rgba(247, 243, 234, 0.7)' }
});
