import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors, theme } from '@/theme/theme';

export function EmptyState({ title = 'Não há dados ainda', subtitle, icon = 'database-search-outline' }: { title?: string; subtitle?: string; icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return <View style={styles.empty} accessibilityRole="text" accessibilityLabel={subtitle ? `${title} ${subtitle}` : title}>
    <MaterialCommunityIcons name={icon} color={colors.muted} size={38} />
    <Text style={styles.text}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: theme.radius.lg, backgroundColor: colors.card, gap: 10, paddingHorizontal: 24 },
  text: { color: colors.muted, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: -4, lineHeight: 17 }
});
