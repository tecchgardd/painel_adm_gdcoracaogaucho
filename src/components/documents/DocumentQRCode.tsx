import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

export function DocumentQRCode({ value, label }: { value: string; label?: string }) {
  return (
    <View style={styles.box}>
      <MaterialCommunityIcons name="qrcode" size={92} color="#111" />
      <Text style={styles.code} numberOfLines={1}>{value}</Text>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14, gap: 4 },
  code: { color: '#111', fontSize: 10, fontWeight: '800', maxWidth: 160 },
  label: { color: '#555', fontSize: 9, fontWeight: '700' }
});
