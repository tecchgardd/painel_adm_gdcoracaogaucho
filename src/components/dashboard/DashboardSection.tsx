import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  title: string;
  children: ReactNode;
};

export function DashboardSection({ title, children }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <View style={styles.marker} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const webNoSelect = { userSelect: 'none' } as any;

const styles = StyleSheet.create({
  section: {
    gap: 10
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  marker: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.red
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    ...webNoSelect
  }
});
