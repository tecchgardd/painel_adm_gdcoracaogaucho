import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/theme/colors';
import { useResponsive } from '@/hooks/useResponsive';

type DocumentAction = {
  title: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  tone?: 'green' | 'danger';
  onPress: () => void;
};

export function DocumentActions({ actions }: { actions: DocumentAction[] }) {
  const { isMobile } = useResponsive();
  return (
    <View style={[styles.grid, isMobile && styles.gridMobile]}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.title}
          style={[styles.action, action.tone === 'danger' && styles.actionDanger, action.tone === 'green' && styles.actionGreen]}
          onPress={action.onPress}
        >
          <MaterialCommunityIcons name={action.icon} size={21} color={action.tone === 'danger' ? colors.red : action.tone === 'green' ? colors.green : colors.text} />
          <Text style={[styles.actionText, action.tone === 'danger' && { color: colors.red }]}>{action.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridMobile: { flexDirection: 'column' },
  action: { flex: 1, minWidth: 150, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 },
  actionDanger: { borderColor: colors.red, backgroundColor: '#261313' },
  actionGreen: { borderColor: colors.green, backgroundColor: '#15331B' },
  actionText: { color: colors.text, fontWeight: '800', fontSize: 13, textAlign: 'center' }
});
