import { StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Atendimento',
  CHECKIN: 'Check-in'
};

export default function Perfil() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const displayName = user?.nome ?? user?.name ?? 'Usuário';

  return (
    <Screen variant="admin">
      <Header title="Meu perfil" />
      <View style={styles.card}>
        <Field label="Nome" value={displayName} />
        <Field label="E-mail" value={user?.email ?? '-'} />
        <Field label="Cargo" value={role ? (roleLabels[role] ?? role) : '-'} />
      </View>
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 16 },
  field: { gap: 4 },
  label: { fontFamily: theme.font.medium, color: colors.muted, fontSize: 12 },
  value: { fontFamily: theme.font.semiBold, color: colors.text, fontSize: 16 }
});
