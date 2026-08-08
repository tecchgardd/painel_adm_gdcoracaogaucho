import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';

import { DocumentHeader } from './DocumentHeader';
import { DocumentQRCode } from './DocumentQRCode';
import { DocumentRow } from './DocumentRow';
import { DocumentSection } from './DocumentSection';

export function TicketCard({
  title,
  status,
  banner,
  qrValue,
  fields
}: {
  title: string;
  status: string;
  banner?: string | null;
  qrValue: string;
  fields: { label: string; value?: string }[];
}) {
  return (
    <View style={styles.card}>
      <DocumentHeader title={title} subtitle={status} banner={banner} />
      <View style={styles.body}>
        <DocumentSection title="Detalhes">
          {fields.map((field) => (
            <DocumentRow key={field.label} label={field.label} value={field.value} />
          ))}
        </DocumentSection>
        <DocumentQRCode value={qrValue} label="QR de validação" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden' },
  body: { padding: 14, gap: 14 }
});
