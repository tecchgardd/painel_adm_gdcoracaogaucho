import { StyleSheet, View } from 'react-native';

export function DocumentDivider({ variant = 'solid', color }: { variant?: 'solid' | 'dashed'; color: string }) {
  if (variant === 'dashed') {
    return (
      <View style={styles.dashedRow}>
        {Array.from({ length: 40 }, (_, index) => (
          <View key={index} style={[styles.dash, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }
  return <View style={[styles.solid, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  solid: { height: 1, width: '100%' },
  dashedRow: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', height: 1, width: '100%', gap: 4 },
  dash: { width: 4, height: 1 }
});
