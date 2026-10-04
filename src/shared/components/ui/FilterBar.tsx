import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useResponsive } from '@/shared/hooks/useResponsive';
import { colors, theme } from '@/theme/theme';

export type FilterOption = { value: string; label: string };

export type FilterConfig = {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** Valor que significa "sem filtro" (ex.: 'TODOS'); define se o filtro conta como ativo. */
  allValue?: string;
};

type Anchor = { x: number; y: number; width: number; height: number };
type PressState = { pressed: boolean; hovered?: boolean };

/**
 * Busca + filtros numa barra só. Cada filtro é um seletor compacto ("Status: Pagas") que abre uma lista;
 * filtros ativos ficam destacados e "Limpar" volta todos ao padrão.
 */
export function FilterBar({ search, filters = [], right }: {
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  filters?: FilterConfig[];
  right?: React.ReactNode;
}) {
  const { isMobile } = useResponsive();
  const active = filters.filter((filter) => filter.allValue !== undefined && filter.value !== filter.allValue);
  const clearAll = () => filters.forEach((filter) => { if (filter.allValue !== undefined && filter.value !== filter.allValue) filter.onChange(filter.allValue); });

  return <View style={[styles.bar, isMobile && styles.barMobile]}>
    {search ? <SearchInput {...search} /> : null}
    {filters.length || right ? <View style={[styles.filters, isMobile && styles.filtersMobile]}>
      {filters.map((filter) => <FilterSelect key={filter.key} filter={filter} />)}
      {active.length ? <Pressable onPress={clearAll} accessibilityRole="button" accessibilityLabel="Limpar filtros" style={(state) => [styles.clear, (state as PressState).hovered && styles.clearHover]}>
        <MaterialCommunityIcons name="close" size={14} color={colors.muted} />
        <Text style={styles.clearText}>Limpar</Text>
      </Pressable> : null}
      {right}
    </View> : null}
  </View>;
}

function SearchInput({ value, onChange, placeholder = 'Pesquisar' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const [focused, setFocused] = React.useState(false);
  const { isMobile } = useResponsive();
  return <View style={[styles.search, isMobile && styles.searchMobile, focused && styles.searchFocused]}>
    <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.subtle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityLabel={placeholder}
      style={styles.searchInput}
    />
    {value ? <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8}>
      <MaterialCommunityIcons name="close-circle" size={17} color={colors.subtle} />
    </Pressable> : null}
  </View>;
}

function FilterSelect({ filter }: { filter: FilterConfig }) {
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<Anchor>({ x: 0, y: 0, width: 0, height: 0 });
  const ref = React.useRef<View>(null);
  const { width, height } = useResponsive();
  const selected = filter.options.find((option) => option.value === filter.value);
  const isActive = filter.allValue !== undefined && filter.value !== filter.allValue;
  const panelWidth = Math.min(Math.max(anchor.width, 220), width - 24);
  const left = Math.max(12, Math.min(anchor.x, width - panelWidth - 12));
  const panelHeight = Math.min(filter.options.length * 42 + 12, 360);
  const below = anchor.y + anchor.height + 6;
  const top = below + panelHeight <= height - 12 ? below : Math.max(12, anchor.y - panelHeight - 6);

  function openMenu() {
    ref.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
      setOpen(true);
    });
  }

  function choose(value: string) {
    setOpen(false);
    filter.onChange(value);
  }

  return <>
    <View ref={ref} collapsable={false}>
      <Pressable
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={`${filter.label}: ${selected?.label ?? filter.value}`}
        style={(state) => [styles.select, isActive && styles.selectActive, (state as PressState).hovered && styles.selectHover]}
      >
        <Text numberOfLines={1} style={styles.selectLabel}>{filter.label}:</Text>
        <Text numberOfLines={1} style={[styles.selectValue, isActive && styles.selectValueActive]}>{selected?.label ?? '—'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={isActive ? colors.red : colors.muted} />
      </Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
        <View style={[styles.panel, { left, top, width: panelWidth, maxHeight: panelHeight }]}>
          <ScrollView>
            {filter.options.map((option) => {
              const current = option.value === filter.value;
              return <Pressable
                key={option.value}
                onPress={() => choose(option.value)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: current }}
                style={(state) => [styles.option, (state as PressState).hovered && styles.optionHover]}
              >
                <Text numberOfLines={1} style={[styles.optionText, current && styles.optionTextActive]}>{option.label}</Text>
                {current ? <MaterialCommunityIcons name="check" size={16} color={colors.red} /> : null}
              </Pressable>;
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  </>;
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  // Muitos filtros: a busca mantém 360px e os filtros descem para a linha de baixo em vez de estourar.
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 },
  barMobile: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  searchMobile: { minWidth: 0 },
  search: { flex: 1, minWidth: 360, height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, paddingHorizontal: 12 },
  searchFocused: { borderColor: colors.redBorder },
  searchInput: { flex: 1, height: 40, color: colors.text, fontSize: 14, fontFamily: theme.font.regular, outlineStyle: 'none' as any },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, flexShrink: 1, maxWidth: '100%' },
  filtersMobile: { flexWrap: 'wrap', flexShrink: 1 },
  select: { height: 42, maxWidth: 260, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, paddingHorizontal: 12, ...webCursor },
  selectHover: { backgroundColor: colors.cardAlt },
  selectActive: { borderColor: colors.redBorder, backgroundColor: colors.redSoft },
  selectLabel: { color: colors.muted, fontSize: 13, fontFamily: theme.font.regular },
  selectValue: { flexShrink: 1, color: colors.text, fontSize: 13, fontFamily: theme.font.medium },
  selectValueActive: { color: colors.text },
  clear: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: theme.radius.md, ...webCursor },
  clearHover: { backgroundColor: colors.cardHover },
  clearText: { color: colors.muted, fontSize: 13, fontFamily: theme.font.medium },
  overlay: { flex: 1 },
  panel: { position: 'absolute', borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.dark, paddingVertical: 6, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' as any },
  option: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, ...webCursor },
  optionHover: { backgroundColor: colors.cardHover },
  optionText: { flex: 1, color: colors.muted, fontSize: 14, fontFamily: theme.font.regular },
  optionTextActive: { color: colors.text, fontFamily: theme.font.medium }
});
