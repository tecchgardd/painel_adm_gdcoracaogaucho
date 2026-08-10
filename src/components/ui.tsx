import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet, TextInput, Image, ImageSourcePropType, Modal, ScrollView, SafeAreaView, Platform, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/useResponsive';
import { Sidebar } from '@/components/navigation/Sidebar';
import { BottomTabs } from '@/components/navigation/BottomTabs';
import { colors, theme } from '@/theme/theme';
import { buttonTones, statusTones } from '@/theme/tones';

const { radius } = theme;

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
  if (activeElement && 'blur' in activeElement) {
    (activeElement as HTMLElement).blur();
  }
}

export function Logo({ size = 92 }: { size?: number }) {
  return <Image source={require('../../assets/logo-oficial.jpeg')} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
}

export function Avatar({ name, size = 44 }: { name?: string; size?: number }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{initial}</Text>
  </View>;
}

export function ResponsiveContainer({ children, variant = 'mobile' }: { children: React.ReactNode; variant?: 'mobile' | 'admin' }) {
  const { contentMaxWidth } = useResponsive();
  const maxWidth = variant === 'mobile' ? theme.layout.mobileMaxWidth : contentMaxWidth;
  return <View style={[styles.responsiveContainer, { maxWidth, width: '100%' }]}>{children}</View>;
}

export function AppScreen({ children, variant = 'mobile' }: { children: React.ReactNode; variant?: 'mobile' | 'admin' }) {
  const responsive = useResponsive();
  const insets = useSafeAreaInsets();
  const adminVariant = variant === 'admin' || responsive.isTablet || responsive.isDesktop;
  const maxWidth = adminVariant ? responsive.contentMaxWidth : theme.layout.mobileMaxWidth;
  const horizontalPadding = responsive.isMobile ? 16 : responsive.isTablet ? 24 : 32;
  const bottomPadding = responsive.isMobile ? Math.max(112, 104 + insets.bottom) : 48;
  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.appRoot}>
      {!responsive.isMobile && <Sidebar />}
      <View style={styles.screen}>
        <ScrollView
          style={styles.appScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.appScrollContent,
            Platform.OS === 'web' && styles.appScrollContentWeb,
            { maxWidth, paddingHorizontal: horizontalPadding, paddingBottom: bottomPadding }
          ]}
        >
          {children}
        </ScrollView>
        {responsive.isMobile && <BottomTabs />}
      </View>
    </View>
  </SafeAreaView>;
}

export function Screen({ children, light = false, variant = 'mobile' }: { children: React.ReactNode; light?: boolean; variant?: 'mobile' | 'admin' }) {
  return <AppScreen variant={variant}>{children}</AppScreen>;
}

export function AppHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return <View style={styles.header}><Text style={styles.headerTitle}>{title}</Text>{right}</View>;
}

export function Header(props: { title: string; right?: React.ReactNode }) {
  return <AppHeader {...props} />;
}

export function AppCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Card(props: { children: React.ReactNode; style?: any }) {
  return <AppCard {...props} />;
}

export function StatCard({ title, value, tone = 'red', onPress }: { title: string; value: string; tone?: 'red' | 'green' | 'yellow'; onPress?: () => void }) {
  const { numColumns } = useResponsive();
  const bg = tone === 'green' ? '#17351D' : tone === 'yellow' ? '#3A3115' : '#3A1717';
  const fg = tone === 'green' ? colors.green : tone === 'yellow' ? colors.yellow : colors.red;
  const width = numColumns >= 3 ? '32%' : '48.5%';
  const content = <><View style={[styles.dot, { backgroundColor: fg }]} /><Text style={styles.statTitle}>{title}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.small}>Ver detalhes</Text></>;
  return onPress
    ? <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.stat, { width, backgroundColor: bg, borderColor: fg + '66' }]}>{content}</TouchableOpacity>
    : <View style={[styles.stat, { width, backgroundColor: bg, borderColor: fg + '66' }]}>{content}</View>;
}

export function AppButton({ title, onPress, tone = 'red', disabled = false }: { title: string; onPress?: () => void; tone?: 'red' | 'green' | 'dark' | 'soft'; disabled?: boolean }) {
  const { bg, border, text } = buttonTones[tone];
  return <TouchableOpacity activeOpacity={0.85} disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: bg, borderColor: border }, disabled && styles.buttonDisabled]}><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.buttonText, { color: text }]}>{title}</Text></TouchableOpacity>;
}

export function Button(props: { title: string; onPress?: () => void; tone?: 'red' | 'green' | 'dark' | 'soft'; disabled?: boolean }) {
  return <AppButton {...props} />;
}

export function FormField({ label, multiline = false, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      placeholderTextColor={colors.muted}
      multiline={multiline}
      {...props}
      style={[styles.fieldInput, multiline && styles.fieldMultiline, props.style]}
    />
  </View>;
}

export function SearchBar({ value, onChangeText, placeholder = 'Pesquisar' }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return <View style={styles.searchWrap}>
    <MaterialCommunityIcons name="magnify" color={colors.muted} size={22} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.searchInput} />
    {value ? <TouchableOpacity onPress={() => onChangeText('')}><MaterialCommunityIcons name="close-circle" color={colors.muted} size={20} /></TouchableOpacity> : null}
  </View>;
}

export function FloatingActionButton({ onPress, accessibilityLabel = 'Adicionar' }: { onPress: () => void; accessibilityLabel?: string }) {
  return <TouchableOpacity
    onPress={onPress}
    style={styles.fab}
    activeOpacity={0.86}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <MaterialCommunityIcons name="plus" color="#fff" size={24} />
  </TouchableOpacity>;
}

export function ActionMenu({ actions }: { actions: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; tone?: 'default' | 'danger' }[] }) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<View>(null);
  const [anchor, setAnchor] = React.useState({ x: 0, y: 0, width: 40, height: 40 });
  const { width, height, isMobile } = useResponsive();
  const panelWidth = isMobile ? Math.min(width - 24, 320) : 240;
  const panelHeight = actions.length * 50 + 4;
  const left = Math.max(12, Math.min(anchor.x + anchor.width - panelWidth, width - panelWidth - 12));
  const belowTop = anchor.y + anchor.height + 6;
  const aboveTop = anchor.y - panelHeight - 6;
  const top = belowTop + panelHeight <= height - 12 ? belowTop : Math.max(12, aboveTop);
  function run(action: () => void) {
    blurActiveElement();
    setOpen(false);
    setTimeout(action, 80);
  }
  function openMenu() {
    blurActiveElement();
    buttonRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
      setOpen(true);
    });
  }
  return <>
    <View ref={buttonRef} collapsable={false}>
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={openMenu}
      style={styles.iconButton}
      accessibilityRole="button"
      accessibilityLabel="Mais opções"
    >
      <MaterialCommunityIcons name="dots-vertical" color={colors.text} size={22} />
    </TouchableOpacity>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { blurActiveElement(); setOpen(false); }}>
      <Pressable style={styles.menuOverlay} onPress={() => { blurActiveElement(); setOpen(false); }}>
        <View style={[styles.menuPanel, isMobile ? styles.menuPanelMobile : styles.menuPanelDesktop, { width: panelWidth, left, top }]}>
          {actions.map((action) => <TouchableOpacity key={action.label} style={styles.menuItem} onPress={() => run(action.onPress)} accessibilityRole="menuitem" accessibilityLabel={action.label}>
            <MaterialCommunityIcons name={action.icon} color={action.tone === 'danger' ? colors.red : colors.text} size={22} />
            <Text style={[styles.menuText, action.tone === 'danger' && { color: colors.red }]}>{action.label}</Text>
          </TouchableOpacity>)}
        </View>
      </Pressable>
    </Modal>
  </>;
}

export function ModalContent({
  children,
  onClose,
  title,
  footer,
  position: _position = 'bottom'
}: {
  children: React.ReactNode;
  position?: 'bottom' | 'center';
  onClose?: () => void;
  title?: string;
  footer?: React.ReactNode;
}) {
  // `position` is kept for backward compatibility with existing call sites (many pass
  // position="center" explicitly) but modals are now always centered per the design system.
  const { width, height, isMobile, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const panelWidth = isMobile ? Math.min(width - 32, theme.layout.mobileMaxWidth) : isTablet ? Math.min(width - 32, 720) : Math.min(width - 48, 800);
  const panelMaxHeight = Math.max(320, height - Math.max(insets.top, 16) - Math.max(insets.bottom, 16) - 40);
  return <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 }]}>
    <View style={[styles.modalPanel, styles.modalPanelDesktop, { maxHeight: panelMaxHeight, width: panelWidth }]}>
      {(title || onClose) && <View style={styles.modalHeader}>
        <View style={styles.modalHeaderSpacer} />
        {title ? <Text numberOfLines={1} style={styles.modalTitle}>{title}</Text> : <View style={styles.modalHeaderSpacer} />}
        {onClose ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar modal" style={styles.modalClose} onPress={onClose}><MaterialCommunityIcons name="close" color={colors.text} size={20} /></TouchableOpacity> : <View style={styles.modalHeaderSpacer} />}
      </View>}
      <ScrollView
        style={styles.modalScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={!isMobile}
        contentContainerStyle={[styles.modalPanelContent, footer ? styles.modalPanelContentWithFooter : null]}
      >
        {children}
      </ScrollView>
      {footer ? <View style={[styles.modalFooter, { paddingBottom: Math.max(12, insets.bottom + 8) }]}>{footer}</View> : null}
    </View>
  </View>;
}

export function AppModal({
  visible,
  onClose,
  children,
  position = 'bottom',
  title,
  footer
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'bottom' | 'center';
  title?: string;
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (visible) blurActiveElement();
  }, [visible]);

  function close() {
    blurActiveElement();
    onClose();
  }

  return <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={close}>
    <ModalContent position={position} onClose={close} title={title} footer={footer}>{children}</ModalContent>
  </Modal>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTones[String(status).toUpperCase()] ?? colors.red;
  return <View style={[styles.badge, { backgroundColor: tone }]} accessibilityLabel={`Status: ${status}`}><Text style={styles.badgeText}>{status}</Text></View>;
}

export function ListCard({ title, subtitle, status, onPress, image }: { title: string; subtitle: string; status?: string; onPress?: () => void; image?: ImageSourcePropType }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.listCard}>{image && <Image source={image} style={styles.thumb} />}<View style={{ flex: 1 }}><Text style={styles.listTitle}>{title}</Text><Text style={styles.listSubtitle}>{subtitle}</Text></View>{status && <StatusBadge status={status} />}</TouchableOpacity>;
}

export function ChoiceChip({ label, active, onPress, icon, tone = 'red' }: { label: string; active: boolean; onPress: () => void; icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']; tone?: 'red' | 'green' }) {
  return <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={label}
    style={[styles.choiceChip, active && (tone === 'green' ? styles.choiceChipActiveGreen : styles.choiceChipActive)]}
  >
    {icon && <MaterialCommunityIcons name={icon} size={16} color={active ? '#fff' : colors.muted} />}
    <Text numberOfLines={1} style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{label}</Text>
  </TouchableOpacity>;
}

export function ChoiceGroup({ options, value, onChange, tone = 'red' }: { options: { value: string; label: string; icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[]; value: string; onChange: (value: string) => void; tone?: 'red' | 'green' }) {
  return <View style={styles.choiceGroup}>
    {options.map((option) => <ChoiceChip key={option.value} label={option.label} icon={option.icon} tone={tone} active={value === option.value} onPress={() => onChange(option.value)} />)}
  </View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden', backgroundColor: colors.black },
  appRoot: { flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.black },
  screen: { flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden', backgroundColor: colors.black, position: 'relative' },
  responsiveContainer: { flex: 1, alignSelf: 'center' },
  appScroll: { flex: 1, width: '100%', maxWidth: '100%', ...(Platform.OS === 'web' ? { overflowX: 'hidden' as any, overflowY: 'auto' as any, overscrollBehaviorX: 'none' as any } : null) },
  appScrollContent: { flexGrow: 1, width: '100%', minWidth: 0, alignSelf: 'center', paddingTop: 10 },
  appScrollContentWeb: { paddingTop: 'max(10px, env(safe-area-inset-top, 0px))' as any },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 10 },
  headerTitle: { color: colors.text, fontSize: 22, fontFamily: theme.font.semiBold },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  avatarText: { color: colors.text, fontFamily: theme.font.semiBold },
  stat: { minHeight: 112, maxHeight: 130, borderRadius: 14, padding: 13, borderWidth: 1, marginBottom: 12, justifyContent: 'space-between' },
  dot: { width: 24, height: 24, borderRadius: 8 },
  statTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 3 },
  small: { color: colors.muted, fontSize: 11, marginTop: 2 },
  button: { minHeight: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 14, fontFamily: theme.font.semiBold, maxWidth: '100%' },
  fieldWrap: { marginTop: 12 },
  fieldLabel: { color: colors.text, fontSize: 13, fontFamily: theme.font.medium, marginBottom: 7 },
  fieldInput: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#111', paddingHorizontal: 14, color: colors.text, outlineStyle: 'none' as any },
  fieldMultiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  searchWrap: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, height: 46, outlineStyle: 'none' as any },
  iconButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  fab: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.red, borderWidth: 1, borderColor: colors.redDark },
  choiceGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14 },
  choiceChipActive: { backgroundColor: colors.red, borderColor: colors.red },
  choiceChipActiveGreen: { backgroundColor: colors.green, borderColor: colors.green },
  choiceChipText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  choiceChipTextActive: { color: '#fff' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.08)', zIndex: 9000, elevation: 9000 },
  menuPanel: { position: 'absolute', backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', zIndex: 9001, elevation: 9001, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  menuPanelDesktop: { borderRadius: 14 },
  menuPanelMobile: { borderRadius: 18 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#282828' },
  menuText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)', zIndex: 10000, elevation: 10000 },
  modalPanel: { width: '100%', backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  modalPanelDesktop: { borderRadius: 22 },
  modalHeader: { height: 56, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalHeaderSpacer: { width: 86 },
  modalTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 15, fontFamily: theme.font.semiBold },
  modalClose: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  modalScroll: { flex: 1, ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : null) },
  modalPanelContent: { padding: 18, paddingTop: 16, paddingBottom: 28 },
  modalPanelContentWithFooter: { paddingBottom: 16 },
  modalFooter: { flexShrink: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.dark },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: theme.font.medium },
  listCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  listTitle: { color: colors.text, fontSize: 15, fontFamily: theme.font.semiBold },
  listSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  thumb: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#333' }
});

export const AppBottomTabs = BottomTabs;
