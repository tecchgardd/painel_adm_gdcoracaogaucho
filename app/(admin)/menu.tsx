import { useState } from 'react';
import type React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AppModal, Avatar, Button, Screen } from '@/components/ui';
import { setBiometricEnabled } from '@/services/biometric.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';
import type { UserRole } from '@/types/entities';

type MenuItem = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path?: string;
  danger?: boolean;
  adminOnly?: boolean;
  roles?: UserRole[];
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Atendimento',
  CHECKIN: 'Check-in'
};

const menuItems: MenuItem[] = [
  { title: 'Meu perfil', subtitle: 'Seus dados de acesso', icon: 'account-outline', path: '/perfil' },
  { title: 'Colaboradores', subtitle: 'Gerenciar colaboradores e acessos', icon: 'account-multiple-outline', path: '/colaboradores', adminOnly: true },
  { title: 'Configurações', subtitle: 'Preferências do painel', icon: 'cog-outline', path: '/configuracoes', roles: ['ADMIN', 'STAFF'] },
  { title: 'Empresas', subtitle: 'Cadastro de patrocinadores e apoiadores', icon: 'office-building-outline', path: '/empresas', roles: ['ADMIN', 'STAFF'] },
  { title: 'Relatórios', subtitle: 'Indicadores completos e exportações', icon: 'chart-bar', path: '/relatorios', roles: ['ADMIN'] },
  { title: 'Fotos', subtitle: 'Uploads em lote e galeria Cloudinary', icon: 'image-multiple-outline', path: '/fotos', roles: ['ADMIN', 'STAFF'] },
  { title: 'Ajuda', subtitle: 'Suporte e dúvidas sobre o painel', icon: 'help-circle-outline', path: '/ajuda' },
  { title: 'Sobre o app', subtitle: 'Versão e créditos', icon: 'information-outline', path: '/sobre' },
  { title: 'Sair da conta', subtitle: 'Encerrar sessão administrativa', icon: 'logout', danger: true }
];

export default function Menu() {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const displayName = user?.nome ?? user?.name ?? 'Usuário';

  function handlePress(item: MenuItem) {
    if (item.danger) {
      setConfirmLogout(true);
      return;
    }
    if (item.path) router.push(item.path as never);
  }

  async function handleLogout() {
    setConfirmLogout(false);
    await setBiometricEnabled(false);
    await logout();
    router.replace('/login');
  }

  const visibleItems = menuItems.filter((item) => {
    if (item.adminOnly && role !== 'ADMIN') return false;
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    return true;
  });

  return (
    <Screen variant="admin">
      <View style={styles.header}>
        <Avatar name={displayName} size={56} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerName}>{displayName}</Text>
          {user?.email ? <Text style={styles.headerEmail}>{user.email}</Text> : null}
          {role ? <Text style={styles.headerRole}>{roleLabels[role] ?? role}</Text> : null}
        </View>
      </View>

      <View style={styles.list}>
        {visibleItems.map((item) => {
          const titleColor = item.danger ? colors.red : colors.text;
          return (
            <TouchableOpacity
              key={item.title}
              activeOpacity={0.86}
              style={styles.card}
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View style={[styles.iconBox, item.danger && styles.iconBoxDanger]}>
                <MaterialCommunityIcons name={item.icon} color={item.danger ? colors.red : colors.goldAccent} size={25} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: titleColor }]}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" color={item.danger ? colors.red : colors.muted} size={22} />
            </TouchableOpacity>
          );
        })}
      </View>

      <AppModal
        visible={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        position="center"
        title="Sair da conta"
        footer={<View style={styles.footerRow}>
          <View style={styles.half}><Button title="Cancelar" tone="dark" onPress={() => setConfirmLogout(false)} /></View>
          <View style={styles.half}><Button title="Sair" onPress={handleLogout} /></View>
        </View>}
      >
        <Text style={styles.modalTitle}>Deseja realmente sair da conta?</Text>
        <Text style={styles.modalText}>Você será direcionado para a tela de login.</Text>
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, paddingTop: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerName: { fontFamily: theme.font.semiBold, fontSize: 18, color: colors.text },
  headerEmail: { fontFamily: theme.font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  headerRole: { fontFamily: theme.font.medium, fontSize: 12, color: colors.goldAccent, marginTop: 4 },
  list: { gap: 12 },
  card: { minHeight: 88, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark },
  iconBoxDanger: { backgroundColor: colors.redDark },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: theme.font.semiBold, fontSize: 16 },
  subtitle: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 12, marginTop: 3 },
  modalTitle: { fontFamily: theme.font.semiBold, color: colors.text, fontSize: 20 },
  modalText: { fontFamily: theme.font.regular, color: colors.muted, marginTop: 10, lineHeight: 20 },
  footerRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 }
});
