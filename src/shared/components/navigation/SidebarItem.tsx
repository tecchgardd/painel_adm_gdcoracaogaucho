import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { isNavItemActive, isPathActive, type NavItem } from '@/shared/components/navigation/navigation.config';
import { useUiStore } from '@/stores/ui.store';
import { colors, theme } from '@/theme/theme';

type PressState = { pressed: boolean; hovered?: boolean };

export function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const open = useUiStore((state) => state.openGroups.includes(item.label));
  const toggleGroup = useUiStore((state) => state.toggleGroup);
  const openGroup = useUiStore((state) => state.openGroup);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const active = isNavItemActive(item, pathname);
  const isGroup = !!item.children?.length;

  function onPress() {
    if (!isGroup) {
      if (item.path && !isPathActive(pathname, item.path)) router.push(item.path as any);
      return;
    }
    // No modo compacto não há espaço para os filhos: expande a sidebar já com o grupo aberto.
    if (collapsed) {
      openGroup(item.label);
      setSidebarCollapsed(false);
      return;
    }
    toggleGroup(item.label);
  }

  return <View>
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active, expanded: isGroup ? open : undefined }}
      style={(state) => [
        styles.item,
        collapsed && styles.itemCollapsed,
        (state as PressState).hovered && styles.itemHover,
        active && (isGroup && !collapsed ? styles.groupActive : styles.itemActive),
        state.pressed && styles.itemPressed
      ]}
    >
      {active && !isGroup && !collapsed ? <View style={styles.indicator} /> : null}
      <MaterialCommunityIcons name={item.icon} size={21} color={active ? colors.red : colors.muted} />
      {!collapsed ? <>
        <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
        {isGroup ? <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.subtle} /> : null}
      </> : null}
    </Pressable>

    {isGroup && open && !collapsed ? <View style={styles.children}>
      {item.children!.map((child) => {
        const selected = isPathActive(pathname, child.path);
        return <Pressable
          key={child.label}
          onPress={() => child.path && !selected && router.push(child.path as any)}
          accessibilityRole="button"
          accessibilityLabel={child.label}
          accessibilityState={{ selected }}
          style={(state) => [styles.child, (state as PressState).hovered && styles.itemHover, selected && styles.childSelected]}
        >
          <View style={[styles.childDot, selected && styles.childDotActive]} />
          <Text numberOfLines={1} style={[styles.childText, selected && styles.childTextActive]}>{child.label}</Text>
        </Pressable>;
      })}
    </View> : null}
  </View>;
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer', userSelect: 'none' } as any) : null;

const styles = StyleSheet.create({
  item: { minHeight: 42, borderRadius: theme.radius.md, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, position: 'relative', ...webCursor },
  itemCollapsed: { width: 44, height: 44, minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 0 },
  itemHover: { backgroundColor: colors.cardHover },
  itemPressed: { opacity: 0.85 },
  itemActive: { backgroundColor: colors.redSoft },
  groupActive: { backgroundColor: 'transparent' },
  indicator: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: colors.red },
  label: { flex: 1, color: colors.text, fontSize: 14, fontFamily: theme.font.medium },
  labelActive: { color: colors.text, fontFamily: theme.font.semiBold },
  children: { marginLeft: 22, marginTop: 2, marginBottom: 6, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.border, gap: 2 },
  child: { minHeight: 36, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, ...webCursor },
  childSelected: { backgroundColor: colors.redSoft },
  childDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.subtle },
  childDotActive: { backgroundColor: colors.red },
  childText: { flex: 1, color: colors.muted, fontSize: 13, fontFamily: theme.font.regular },
  childTextActive: { color: colors.text, fontFamily: theme.font.medium }
});
