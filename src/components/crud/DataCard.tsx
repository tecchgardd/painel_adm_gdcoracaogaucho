import { StyleSheet, Text, View } from 'react-native';
import { ActionMenu, StatusBadge } from '@/components/ui';
import { colors } from '@/theme/theme';
import { CrudRecord } from '@/types';

export function DataCard({ record, onEdit, onDelete }: { record: CrudRecord; onEdit: () => void; onDelete: () => void }) {
  return <View style={styles.card}>
    <View style={styles.content}>
      <Text style={styles.title}>{record.titulo}</Text>
      {!!record.subtitulo && <Text style={styles.sub}>{record.subtitulo}</Text>}
      {!!record.status && <View style={styles.badge}><StatusBadge status={String(record.status)} /></View>}
    </View>
    <ActionMenu actions={[
      { label: 'Editar', icon: 'pencil-outline', onPress: onEdit },
      { label: 'Excluir', icon: 'trash-can-outline', tone: 'danger', onPress: onDelete }
    ]} />
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 96, flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  content: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  sub: { color: colors.muted, marginTop: 5, lineHeight: 18 },
  badge: { alignSelf: 'flex-start', marginTop: 10 }
});
