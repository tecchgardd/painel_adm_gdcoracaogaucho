import { useState } from 'react';
import type React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppModal, Button, Header, Screen } from '@/components/ui';
import { logout as logoutSession } from '@/services/auth.service';
import { colors } from '@/theme/theme';

type MenuItem = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path?: string;
  danger?: boolean;
};

const menuItems: MenuItem[] = [
  { title: 'Empresas', subtitle: 'Cadastro de patrocinadores e apoiadores', icon: 'office-building-outline', path: '/empresas' },
  { title: 'Relatórios', subtitle: 'Indicadores completos e exportações', icon: 'chart-bar', path: '/relatorios' },
  { title: 'Fotos', subtitle: 'Uploads em lote e galeria Cloudinary', icon: 'image-multiple-outline', path: '/fotos' },
  { title: 'Sair da conta', subtitle: 'Encerrar sessao administrativa', icon: 'logout', danger: true }
];

export default function Menu() {
  const [confirmLogout, setConfirmLogout] = useState(false);

  function handlePress(item: MenuItem) {
    if (item.danger) {
      setConfirmLogout(true);
      return;
    }
    if (item.path) router.push(item.path as any);
  }

  async function logout() {
    setConfirmLogout(false);
    await logoutSession();
    router.replace('/login');
  }

  return (
    <Screen variant="admin">
      <Header title="Menu" />
      <View style={styles.list}>
        {menuItems.map((item) => {
          const tone = item.danger ? colors.red : colors.text;
          return (
            <TouchableOpacity key={item.title} activeOpacity={0.86} style={styles.card} onPress={() => handlePress(item)}>
              <View style={[styles.iconBox, item.danger && styles.iconBoxDanger]}>
                <MaterialCommunityIcons name={item.icon} color={item.danger ? colors.red : colors.yellow} size={25} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: tone }]}>{item.title}</Text>
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
          <View style={styles.half}><Button title="Sair" onPress={logout} /></View>
        </View>}
      >
        <Text style={styles.modalTitle}>Encerrar sessao?</Text>
        <Text style={styles.modalText}>Voce sera direcionado para a tela de login.</Text>
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { minHeight: 88, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#302715' },
  iconBoxDanger: { backgroundColor: '#321616' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  modalText: { color: colors.muted, marginTop: 10, lineHeight: 20 },
  footerRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 }
});
