import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NavItem } from '@/navigation.config';
import { colors } from '@/theme/theme';

export function SidebarAccordion({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const childActive = useMemo(() => item.children?.some((child) => child.path && (pathname === child.path || pathname.endsWith(child.path))) ?? false, [item.children, pathname]);
  const selfActive = !!item.path && (pathname === item.path || pathname.endsWith(item.path));
  const [open, setOpen] = useState(false);
  const active = selfActive || childActive;

  function toggleOpen() {
    setOpen((current) => !current);
  }

  function go(path?: string) {
    setOpen(false);
    if (path) router.push(path as any);
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!item.children?.length) {
    return <TouchableOpacity style={[styles.item, active && styles.itemActive]} onPress={() => item.path && router.push(item.path as any)}>
      <MaterialCommunityIcons name={item.icon as any} color={active ? colors.red : colors.text} size={22} />
      <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
    </TouchableOpacity>;
  }

  return <View style={styles.wrap}>
    <TouchableOpacity style={[styles.item, active && styles.itemActive]} onPress={toggleOpen}>
      <MaterialCommunityIcons name={item.icon as any} color={active ? colors.red : colors.text} size={22} />
      <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
      <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={20} />
    </TouchableOpacity>
    {open ? <View style={styles.children}>
      {item.children.map((child) => {
        const selected = !!child.path && (pathname === child.path || pathname.endsWith(child.path));
        return <TouchableOpacity key={child.label} style={[styles.child, selected && styles.childSelected]} onPress={() => go(child.path)}>
          <Text style={[styles.childText, selected && styles.childActive]}>{child.label}</Text>
        </TouchableOpacity>;
      })}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  item: { minHeight: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  itemActive: { backgroundColor: '#2A1515', borderWidth: 1, borderColor: '#4A2020' },
  label: { color: colors.text, fontSize: 15, fontWeight: '800', flex: 1 },
  labelActive: { color: colors.red },
  children: { marginTop: 6, marginLeft: 18, marginBottom: 4, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 10, gap: 4 },
  child: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10 },
  childSelected: { backgroundColor: '#241313' },
  childText: { color: colors.muted, fontWeight: '700' },
  childActive: { color: colors.red }
});
