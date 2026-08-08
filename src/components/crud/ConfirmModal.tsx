import { StyleSheet, Text, View } from 'react-native';

import { AppModal, Button } from '@/components/ui';
import { colors } from '@/theme/theme';

export function ConfirmModal({ visible, title, onCancel, onConfirm }: { visible: boolean; title: string; onCancel: () => void; onConfirm: () => void }) {
  return <AppModal
    visible={visible}
    onClose={onCancel}
    position="center"
    title="Confirmar exclusao"
    footer={<View style={styles.row}>
      <View style={styles.half}><Button title="Cancelar" tone="dark" onPress={onCancel} /></View>
      <View style={styles.half}><Button title="Excluir" onPress={onConfirm} /></View>
    </View>}
  >
    <Text style={styles.text}>Deseja excluir {title}? Esta ação não pode ser desfeita.</Text>
  </AppModal>;
}

const styles = StyleSheet.create({
  text: { color: colors.muted, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 }
});
