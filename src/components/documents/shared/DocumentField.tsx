import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function DocumentField({
  icon,
  label,
  value,
  textColor,
  mutedColor,
  badgeColor
}: {
  icon: IconName;
  label: string;
  value?: string | null;
  textColor: string;
  mutedColor: string;
  badgeColor: string;
}) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <MaterialCommunityIcons name={icon} size={16} color="#fff" />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
        <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  body: { flex: 1 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  value: { fontSize: 14, fontWeight: '800', marginTop: 2 }
});
