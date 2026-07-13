import { StyleSheet, Text, View } from 'react-native';
import { AppModal, Button, FormField } from '@/components/ui';
import { colors } from '@/theme/theme';
import { CrudField, CrudRecord } from '@/types';

export function FormModal({
  visible,
  title,
  fields,
  value,
  onChange,
  onClose,
  onSubmit
}: {
  visible: boolean;
  title: string;
  fields: CrudField[];
  value: Partial<CrudRecord>;
  onChange: (value: Partial<CrudRecord>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return <AppModal
    visible={visible}
    onClose={onClose}
    position="center"
    title={title}
    footer={<View style={styles.footerRow}>
      <View style={styles.half}><Button title="Cancelar" tone="dark" onPress={onClose} /></View>
      <View style={styles.half}><Button title="Salvar" tone="green" onPress={onSubmit} /></View>
    </View>}
  >
    <Text style={styles.title}>{title}</Text>
    {fields.map((field) => <FormField
      key={field.key}
      label={field.label}
      placeholder={field.placeholder}
      multiline={field.multiline}
      keyboardType={field.keyboardType}
      value={String(value[field.key] ?? '')}
      onChangeText={(text) => onChange({ ...value, [field.key]: text })}
    />)}
  </AppModal>;
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  footerRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 }
});
