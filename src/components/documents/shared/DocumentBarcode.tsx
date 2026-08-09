import { StyleSheet, View } from 'react-native';

import { encodeCode128B } from '@/utils/barcode';

export function DocumentBarcode({
  value,
  color = '#000000',
  backgroundColor = '#FFFFFF',
  height = 70,
  unitWidth = 2,
  orientation = 'horizontal'
}: {
  value: string;
  color?: string;
  backgroundColor?: string;
  height?: number;
  unitWidth?: number;
  orientation?: 'horizontal' | 'vertical';
}) {
  const bars = encodeCode128B(value);
  return (
    <View style={[styles.wrapper, { backgroundColor }, orientation === 'vertical' && styles.vertical]}>
      <View style={styles.row}>
        {bars.map((bar, index) => (
          <View key={index} style={{ width: bar.width * unitWidth, height, backgroundColor: bar.isBar ? color : backgroundColor }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'flex-start' },
  vertical: { transform: [{ rotate: '90deg' }] },
  row: { flexDirection: 'row' }
});
