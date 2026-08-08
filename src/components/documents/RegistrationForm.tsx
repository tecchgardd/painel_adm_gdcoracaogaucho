import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

import { DocumentHeader } from './DocumentHeader';
import { DocumentRow } from './DocumentRow';
import { DocumentSection } from './DocumentSection';

export function RegistrationForm({
  title,
  banner,
  fields,
  consent,
  signatureDate
}: {
  title: string;
  banner?: string | null;
  fields: { label: string; value?: string }[];
  consent: string;
  signatureDate: string;
}) {
  return (
    <View style={styles.card}>
      <DocumentHeader title={title} subtitle="Documento administrativo" banner={banner} />
      <View style={styles.body}>
        <DocumentSection title="Dados da inscrição">
          {fields.map((field) => (
            <DocumentRow key={field.label} label={field.label} value={field.value} />
          ))}
        </DocumentSection>
        <DocumentSection title="Termo de ciência">
          <Text style={styles.consent}>{consent}</Text>
        </DocumentSection>
        <View style={styles.signatureRow}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Assinatura digital · Emitido em {signatureDate}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden' },
  body: { padding: 14, gap: 14 },
  consent: { color: colors.text, fontSize: 12, lineHeight: 18, paddingVertical: 10 },
  signatureRow: { gap: 6 },
  signatureLine: { height: 1, backgroundColor: colors.border },
  signatureLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }
});
