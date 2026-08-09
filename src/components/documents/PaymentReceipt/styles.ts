import { StyleSheet } from 'react-native';

export const PAYMENT_RECEIPT_WIDTH = 300;

export const styles = StyleSheet.create({
  sheet: { width: PAYMENT_RECEIPT_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 4, paddingVertical: 18, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  companyName: { color: '#111111', fontWeight: '900', fontSize: 14 },
  titleBlock: { alignItems: 'center', marginVertical: 10 },
  title: { color: '#111111', fontWeight: '900', fontSize: 20 },
  subtitle: { color: '#111111', fontWeight: '800', fontSize: 11, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  label: { color: '#6B6B6B', fontSize: 10, fontWeight: '700' },
  value: { color: '#111111', fontSize: 10.5, fontWeight: '800' },
  sectionTitle: { color: '#111111', fontWeight: '800', fontSize: 12, marginVertical: 8 },
  itemHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111111', paddingBottom: 4, marginBottom: 4 },
  itemHeaderText: { color: '#111111', fontSize: 9, fontWeight: '800' },
  itemRow: { flexDirection: 'row', marginVertical: 2 },
  itemText: { color: '#111111', fontSize: 10 },
  colDescricao: { flex: 3 },
  colQtd: { flex: 1, textAlign: 'center' },
  colUn: { flex: 1, textAlign: 'center' },
  colUnit: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsBlock: { marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  totalLabel: { color: '#111111', fontSize: 11, fontWeight: '700' },
  totalValue: { color: '#111111', fontSize: 11, fontWeight: '700' },
  grandTotalLabel: { color: '#111111', fontSize: 15, fontWeight: '900' },
  grandTotalValue: { color: '#111111', fontSize: 15, fontWeight: '900' },
  authBlock: { alignItems: 'center', marginTop: 14, marginBottom: 10 },
  authText: { color: '#111111', fontSize: 10, fontWeight: '800' },
  thanksRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  thanksTitle: { color: '#111111', fontSize: 11, fontWeight: '800', flexShrink: 1 },
  thanksSubtitle: { color: '#6B6B6B', fontSize: 10, fontStyle: 'italic', marginTop: 2 },
  hearts: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  spacerSm: { height: 6 }
});
