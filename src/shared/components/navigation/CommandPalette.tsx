import { useEffect, useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { filterNavigationByRole, flattenNavigation, navigationItems, searchNavigation, type FlatNavItem } from '@/shared/components/navigation/navigation.config';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { colors, theme } from '@/theme/theme';

export const commandShortcutLabel = Platform.OS === 'web' && typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K';

/** Atalho global Ctrl/⌘+K (web) para abrir a busca rápida. */
export function useCommandPaletteShortcut() {
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!useUiStore.getState().commandPaletteOpen);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);
}

export function CommandPalette() {
  const open = useUiStore((state) => state.commandPaletteOpen);
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const role = useAuthStore((state) => state.role);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const items = useMemo(() => flattenNavigation(filterNavigationByRole(navigationItems, role)), [role]);
  const results = useMemo(() => searchNavigation(items, query), [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlight(0);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function go(item?: FlatNavItem) {
    if (!item) return;
    setOpen(false);
    router.push(item.path as any);
  }

  function onKeyPress(key: string) {
    if (key === 'ArrowDown') setHighlight((current) => Math.min(current + 1, results.length - 1));
    else if (key === 'ArrowUp') setHighlight((current) => Math.max(current - 1, 0));
    else if (key === 'Escape') setOpen(false);
  }

  return <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
    <Pressable style={styles.overlay} onPress={() => setOpen(false)} accessibilityLabel="Fechar busca">
      <Pressable style={styles.panel} onPress={() => undefined}>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Ir para…"
            placeholderTextColor={colors.subtle}
            style={styles.input}
            onKeyPress={(event) => onKeyPress(event.nativeEvent.key)}
            onSubmitEditing={() => go(results[highlight])}
            returnKeyType="go"
            accessibilityLabel="Buscar página"
          />
          <Text style={styles.kbd}>Esc</Text>
        </View>
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {results.length ? results.map((item, index) => {
            const selected = index === highlight;
            return <Pressable
              key={item.path}
              onPress={() => go(item)}
              onHoverIn={() => setHighlight(index)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={[styles.result, selected && styles.resultSelected]}
            >
              <View style={[styles.resultIcon, selected && styles.resultIconSelected]}>
                <MaterialCommunityIcons name={item.icon} size={18} color={selected ? colors.red : colors.muted} />
              </View>
              <Text numberOfLines={1} style={styles.resultLabel}>{item.label}</Text>
              {item.parent ? <Text numberOfLines={1} style={styles.resultParent}>{item.parent}</Text> : null}
            </Pressable>;
          }) : <Text style={styles.empty}>Nenhuma página encontrada.</Text>}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.6)', alignItems: 'center', paddingTop: '12%' as any, paddingHorizontal: 16 },
  panel: { width: '100%', maxWidth: 560, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.dark, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 16 } },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 56, borderBottomWidth: 1, borderBottomColor: colors.border },
  input: { flex: 1, height: 54, color: colors.text, fontSize: 15, fontFamily: theme.font.regular, outlineStyle: 'none' as any },
  kbd: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.medium, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  results: { maxHeight: 360, padding: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, borderRadius: 10, paddingHorizontal: 10 },
  resultSelected: { backgroundColor: colors.cardHover },
  resultIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  resultIconSelected: { backgroundColor: colors.redSoft },
  resultLabel: { flex: 1, color: colors.text, fontSize: 14, fontFamily: theme.font.medium },
  resultParent: { color: colors.subtle, fontSize: 12, fontFamily: theme.font.regular },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 28, fontFamily: theme.font.regular }
});
