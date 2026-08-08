import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export function DocumentHeader({
  title,
  subtitle,
  status,
  banner
}: {
  title: string;
  subtitle: string;
  status?: string;
  banner?: string | null;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>CORAÇÃO GAÚCHO</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {banner ? <Image source={{ uri: banner }} style={styles.banner} /> : null}
      </View>
      {status ? (
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#5C1414', paddingHorizontal: 18, paddingVertical: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brandBlock: { flex: 1 },
  brand: { color: '#E0AC3D', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#fff', fontSize: 17, fontWeight: '900', marginTop: 6 },
  subtitle: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 2, opacity: 0.85 },
  banner: { width: 44, height: 44, borderRadius: 22 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '800' }
});
