import { StyleSheet } from 'react-native';

import { colors } from '@/theme/colors';

export const COURSE_RECEIPT_WIDTH = 380;

export const styles = StyleSheet.create({
  sheet: { width: COURSE_RECEIPT_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden' },
  header: { paddingTop: 22, paddingHorizontal: 20, alignItems: 'center' },
  title: { fontWeight: '900', fontSize: 22, color: '#111111', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontWeight: '800', fontSize: 14, color: colors.green, marginTop: 4, letterSpacing: 1 },
  logoWrap: { alignItems: 'center', marginVertical: 16 },
  confirmBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.green, paddingVertical: 12, overflow: 'hidden' },
  confirmOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.12)' },
  confirmCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontWeight: '900', color: '#fff', fontSize: 15, letterSpacing: 1 },
  paragraph: { textAlign: 'center', color: '#111111', fontSize: 12.5, marginTop: 12, paddingHorizontal: 20 },
  fields: { paddingHorizontal: 20, marginTop: 14 },
  infoBox: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#F4F4F4', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12 },
  infoTitle: { fontWeight: '800', color: colors.green, fontSize: 12.5, marginBottom: 4 },
  infoText: { color: '#5A5A5A', fontSize: 11.5, lineHeight: 16 },
  qrRow: { alignItems: 'flex-end', paddingHorizontal: 20, marginTop: 14 },
  footer: { backgroundColor: colors.green, paddingVertical: 14, marginTop: 18, overflow: 'hidden' },
  footerOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  footerText: { color: '#fff', textAlign: 'center', fontStyle: 'italic', fontSize: 12.5 },
  hearts: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: '#fff' }
});
