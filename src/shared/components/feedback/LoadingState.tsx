import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/theme';

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label}>
    <ActivityIndicator color={colors.red} />
    <Text style={styles.label}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { color: colors.muted, fontWeight: '800' }
});
