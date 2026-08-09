import { StyleSheet } from 'react-native';

import { colors } from '@/theme/colors';

export const EVENT_TICKET_MAIN_WIDTH = 560;
export const EVENT_TICKET_STUB_WIDTH = 120;
export const EVENT_TICKET_WIDTH = EVENT_TICKET_MAIN_WIDTH + EVENT_TICKET_STUB_WIDTH;
export const EVENT_TICKET_HEIGHT = 380;

export const styles = StyleSheet.create({
  ticket: { flexDirection: 'row', width: EVENT_TICKET_WIDTH, height: EVENT_TICKET_HEIGHT, backgroundColor: colors.black, borderRadius: 16, overflow: 'hidden' },
  main: { width: EVENT_TICKET_MAIN_WIDTH },
  flyer: { width: '100%', height: 200, backgroundColor: colors.dark },
  flyerFallback: { width: '100%', height: 200, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center', gap: 8 },
  flyerFallbackText: { color: colors.white, fontWeight: '900', fontSize: 20, textAlign: 'center', paddingHorizontal: 16 },
  infoBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  infoCol: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: colors.border },
  infoColLast: { borderRightWidth: 0 },
  infoLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  infoValue: { color: colors.white, fontWeight: '800', fontSize: 14, marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  entranceBox: { flex: 1, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  entranceTitle: { color: colors.black, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  entranceHint: { color: colors.black, fontSize: 10, marginTop: 2 },
  stub: { width: EVENT_TICKET_STUB_WIDTH, borderLeftWidth: 1, borderLeftColor: colors.white, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 20 },
  stubCode: { color: colors.white, fontWeight: '800', fontSize: 13, letterSpacing: 2, transform: [{ rotate: '90deg' }] }
});
