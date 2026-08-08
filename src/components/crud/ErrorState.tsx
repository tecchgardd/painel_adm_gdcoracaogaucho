import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, theme } from '@/theme/theme';

export function ErrorState({ message, onRetry, title = 'Não foi possível carregar os dados.' }: { message: string; onRetry?: () => void; title?: string }) {
  return <TouchableOpacity
    disabled={!onRetry}
    onPress={onRetry}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={onRetry ? 'Tentar novamente' : title}
    style={styles.box}
  >
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry ? <Text style={styles.retry}>Tentar novamente</Text> : null}
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  box: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 14, gap: 4 },
  title: { color: colors.text, fontWeight: '900', fontSize: 14 },
  message: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 6 }
});
