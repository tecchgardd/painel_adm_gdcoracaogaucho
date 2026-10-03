import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, theme } from '@/theme/theme';

/** Paginação compacta: "‹  Página 2 de 7 · 140 resultados  ›". Some quando há uma página só. */
export function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total?: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return total !== undefined && total > 0 ? <Text style={styles.summaryOnly}>{total} resultado{total === 1 ? '' : 's'}</Text> : null;
  return <View style={styles.row}>
    <PageButton icon="chevron-left" label="Página anterior" disabled={page <= 1} onPress={() => onChange(page - 1)} />
    <Text style={styles.text}>Página {page} de {totalPages}{total !== undefined ? ` · ${total} resultado${total === 1 ? '' : 's'}` : ''}</Text>
    <PageButton icon="chevron-right" label="Próxima página" disabled={page >= totalPages} onPress={() => onChange(page + 1)} />
  </View>;
}

function PageButton({ icon, label, disabled, onPress }: { icon: 'chevron-left' | 'chevron-right'; label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    style={(state) => [styles.button, disabled && styles.buttonDisabled, (state as { hovered?: boolean }).hovered && !disabled && styles.buttonHover]}
  >
    <MaterialCommunityIcons name={icon} size={20} color={colors.text} />
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 18 },
  text: { color: colors.muted, fontSize: 13, fontFamily: theme.font.regular },
  summaryOnly: { color: colors.subtle, fontSize: 12, fontFamily: theme.font.regular, textAlign: 'center', marginVertical: 14 },
  button: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : null) },
  buttonHover: { backgroundColor: colors.cardHover },
  buttonDisabled: { opacity: 0.35 }
});
