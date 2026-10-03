import { Fragment, useEffect, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, usePathname } from 'expo-router';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CommandPalette, commandShortcutLabel, useCommandPaletteShortcut } from '@/shared/components/navigation/CommandPalette';
import { filterNavigationByRole, isNavItemActive, navigationItems, ROLE_LABELS, sectionHeadingAt } from '@/shared/components/navigation/navigation.config';
import { SidebarItem } from '@/shared/components/navigation/SidebarItem';
import { AppModal, Avatar, Button, Logo } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { colors, theme } from '@/theme/theme';

type PressState = { pressed: boolean; hovered?: boolean };
const { sidebarExpanded, sidebarCollapsed } = theme.layout;

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const hydrate = useUiStore((state) => state.hydrate);
  const openGroup = useUiStore((state) => state.openGroup);
  const setPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [width] = useState(() => new Animated.Value(collapsed ? sidebarCollapsed : sidebarExpanded));
  const visibleItems = filterNavigationByRole(navigationItems, role);
  const displayName = user?.nome ?? user?.name ?? 'Usuário';

  useCommandPaletteShortcut();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // O grupo da rota atual começa aberto (a sidebar remonta a cada tela).
  useEffect(() => {
    const activeGroup = visibleItems.find((item) => item.children?.length && isNavItemActive(item, pathname));
    if (activeGroup) openGroup(activeGroup.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    Animated.timing(width, {
      toValue: collapsed ? sidebarCollapsed : sidebarExpanded,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [collapsed, width]);

  async function signOut() {
    setConfirmLogout(false);
    await logout();
    router.replace('/login');
  }

  return <Animated.View style={[styles.sidebar, { width }]}>
    {collapsed
      // Compacto: o próprio logo expande o menu; no hover ele vira o ícone de expandir.
      ? <View style={styles.brandCollapsed}>
        <Pressable
          onPress={() => { setLogoHovered(false); toggleSidebar(); }}
          onHoverIn={() => setLogoHovered(true)}
          onHoverOut={() => setLogoHovered(false)}
          accessibilityRole="button"
          accessibilityLabel="Expandir menu lateral"
          style={[styles.railButton, logoHovered && styles.hover]}
        >
          {logoHovered ? <MaterialCommunityIcons name="chevron-double-right" size={20} color={colors.text} /> : <Logo size={36} />}
        </Pressable>
      </View>
      : <View style={styles.brand}>
        <Logo size={36} />
        <View style={styles.brandCopy}>
          <Text numberOfLines={1} style={styles.brandName}>Coração Gaúcho</Text>
          <Text numberOfLines={1} style={styles.brandSub}>Painel administrativo</Text>
        </View>
        <Pressable
          onPress={toggleSidebar}
          accessibilityRole="button"
          accessibilityLabel="Recolher menu lateral"
          style={(state) => [styles.iconButton, (state as PressState).hovered && styles.hover]}
        >
          <MaterialCommunityIcons name="chevron-double-left" size={18} color={colors.muted} />
        </Pressable>
      </View>}

    <Pressable
      onPress={() => setPaletteOpen(true)}
      accessibilityRole="search"
      accessibilityLabel="Buscar página"
      style={(state) => [collapsed ? [styles.railButton, styles.searchRail] : styles.search, (state as PressState).hovered && styles.hover]}
    >
      <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
      {!collapsed ? <>
        <Text style={styles.searchText}>Buscar…</Text>
        {Platform.OS === 'web' ? <Text style={styles.kbd}>{commandShortcutLabel}</Text> : null}
      </> : null}
    </Pressable>

    <ScrollView style={styles.navScroll} contentContainerStyle={styles.nav} showsVerticalScrollIndicator={false}>
      {visibleItems.map((item, index) => {
        const section = sectionHeadingAt(visibleItems, index);
        return <Fragment key={item.label}>
          {section ? (collapsed ? <View style={styles.sectionDivider} /> : <Text style={styles.sectionTitle}>{section}</Text>) : null}
          <SidebarItem item={item} collapsed={collapsed} />
        </Fragment>;
      })}
    </ScrollView>

    <View style={[styles.profile, collapsed && styles.profileCollapsed]}>
      <Pressable
        onPress={() => router.push('/perfil')}
        accessibilityRole="button"
        accessibilityLabel={`Meu perfil: ${displayName}`}
        style={(state) => [collapsed ? styles.railButton : styles.profileMain, (state as PressState).hovered && styles.hover]}
      >
        <Avatar name={displayName} size={collapsed ? 32 : 36} />
        {!collapsed ? <View style={styles.profileCopy}>
          <Text numberOfLines={1} style={styles.profileName}>{displayName}</Text>
          <Text numberOfLines={1} style={styles.profileRole}>{role ? ROLE_LABELS[role] ?? role : user?.email ?? ''}</Text>
        </View> : null}
      </Pressable>
      <Pressable
        onPress={() => setConfirmLogout(true)}
        accessibilityRole="button"
        accessibilityLabel="Sair da conta"
        style={(state) => [collapsed ? styles.railButton : styles.iconButton, (state as PressState).hovered && styles.logoutHover]}
      >
        <MaterialCommunityIcons name="logout" size={18} color={colors.red} />
      </Pressable>
    </View>

    <CommandPalette />

    <AppModal
      visible={confirmLogout}
      onClose={() => setConfirmLogout(false)}
      title="Sair da conta"
      size="sm"
      footer={<View style={styles.footerRow}>
        <View style={styles.half}><Button title="Cancelar" tone="dark" onPress={() => setConfirmLogout(false)} /></View>
        <View style={styles.half}><Button title="Sair" onPress={signOut} /></View>
      </View>}
    >
      <Text style={styles.modalText}>Deseja encerrar a sessão? Você será direcionado para a tela de login.</Text>
    </AppModal>
  </Animated.View>;
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  sidebar: {
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: colors.sidebar,
    borderRightWidth: 1,
    borderRightColor: colors.borderSoft,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 12,
    ...(Platform.OS === 'web' ? { height: '100vh' as any, maxHeight: '100vh' as any } : { flex: 1 })
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginBottom: 18 },
  brandCollapsed: { alignItems: 'center', marginBottom: 8 },
  railButton: { width: 44, height: 44, borderRadius: theme.radius.md, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', ...webCursor },
  searchRail: { marginBottom: 4 },
  brandCopy: { flex: 1, minWidth: 0 },
  brandName: { color: colors.text, fontSize: 15, fontFamily: theme.font.semiBold },
  brandSub: { color: colors.goldAccent, fontSize: 11, fontFamily: theme.font.medium, marginTop: 1 },
  iconButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...webCursor },
  hover: { backgroundColor: colors.cardHover },
  logoutHover: { backgroundColor: colors.redSoft },
  search: { height: 40, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.dark, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 14, ...webCursor },
  searchText: { flex: 1, color: colors.subtle, fontSize: 13, fontFamily: theme.font.regular },
  kbd: { color: colors.subtle, fontSize: 10, fontFamily: theme.font.medium, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  navScroll: { flex: 1 },
  nav: { gap: 2, paddingBottom: 12 },
  sectionTitle: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.medium, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14, marginBottom: 6, paddingHorizontal: 12 },
  sectionDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 12, marginHorizontal: 10 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 12, marginTop: 6 },
  profileCollapsed: { flexDirection: 'column', alignItems: 'center', gap: 4 },
  profileMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: theme.radius.md, padding: 6, ...webCursor },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: colors.text, fontSize: 13, fontFamily: theme.font.semiBold },
  profileRole: { color: colors.muted, fontSize: 11, fontFamily: theme.font.regular, marginTop: 1 },
  footerRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  modalText: { color: colors.muted, lineHeight: 20, fontFamily: theme.font.regular }
});
