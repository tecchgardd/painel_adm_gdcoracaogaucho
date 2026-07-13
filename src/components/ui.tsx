import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet, TextInput, Image, ImageSourcePropType, Modal, ScrollView, SafeAreaView, Platform, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsive } from '@/hooks/useResponsive';
import { Sidebar } from '@/components/navigation/Sidebar';
import { BottomTabs } from '@/components/navigation/BottomTabs';
import { colors, theme } from '@/theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
          contentContainerStyle={[styles.appScrollContent, { maxWidth, paddingHorizontal: horizontalPadding, paddingBottom: bottomPadding }]}
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

export function StatCard({ title, value, tone = 'red' }: { title: string; value: string; tone?: 'red' | 'green' | 'yellow' }) {
  const { numColumns } = useResponsive();
  const bg = tone === 'green' ? '#17351D' : tone === 'yellow' ? '#3A3115' : '#3A1717';
  const fg = tone === 'green' ? colors.green : tone === 'yellow' ? colors.yellow : colors.red;
  const width = numColumns >= 3 ? '32%' : '48.5%';
  return <View style={[styles.stat, { width, backgroundColor: bg, borderColor: fg + '66' }]}><View style={[styles.dot, { backgroundColor: fg }]} /><Text style={styles.statTitle}>{title}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.small}>Ver detalhes</Text></View>;
}

export function AppButton({ title, onPress, tone = 'red' }: { title: string; onPress?: () => void; tone?: 'red' | 'green' | 'dark' }) {
  const bg = tone === 'green' ? colors.green : tone === 'dark' ? colors.card : colors.red;
  return <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.button, { backgroundColor: bg }]}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.buttonText}>{title}</Text></TouchableOpacity>;
}

export function Button(props: { title: string; onPress?: () => void; tone?: 'red' | 'green' | 'dark' }) {
  return <AppButton {...props} />;
}

export function AppInput(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#999" {...props} style={[styles.input, props.style]} />;
}

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return <AppInput {...props} />;
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

export function FloatingActionButton({ onPress }: { onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={styles.fab} activeOpacity={0.86}>
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
    <TouchableOpacity activeOpacity={0.8} onPress={openMenu} style={styles.iconButton}>
      <MaterialCommunityIcons name="dots-vertical" color={colors.text} size={22} />
    </TouchableOpacity>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { blurActiveElement(); setOpen(false); }}>
      <Pressable style={styles.menuOverlay} onPress={() => { blurActiveElement(); setOpen(false); }}>
        <View style={[styles.menuPanel, isMobile ? styles.menuPanelMobile : styles.menuPanelDesktop, { width: panelWidth, left, top }]}>
          {actions.map((action) => <TouchableOpacity key={action.label} style={styles.menuItem} onPress={() => run(action.onPress)}>
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
  position = 'bottom',
  onClose,
  title,
  footer
}: {
  children: React.ReactNode;
  position?: 'bottom' | 'center';
  onClose?: () => void;
  title?: string;
  footer?: React.ReactNode;
}) {
  const { width, height, isMobile, isTablet } = useResponsive();
  const centered = !isMobile;
  const panelWidth = isMobile ? width : isTablet ? Math.min(width - 32, 720) : Math.min(width - 48, 800);
  const panelMaxHeight = Math.max(320, isMobile ? height * 0.9 : height * 0.86);
  return <View style={[styles.modalOverlay, isMobile && styles.modalOverlayMobile, { justifyContent: centered ? 'center' : 'flex-end', alignItems: 'center', paddingVertical: centered ? 20 : 0 }]}>
    <View style={[
      styles.modalPanel,
      isMobile ? styles.modalPanelMobile : styles.modalPanelDesktop,
      { maxHeight: panelMaxHeight, width: panelWidth }
    ]}>
      {onClose && <View style={styles.modalHeader}>
        {isMobile ? <TouchableOpacity style={styles.modalBack} onPress={onClose}>
          <MaterialCommunityIcons name="chevron-left" color={colors.text} size={24} />
          <Text style={styles.modalBackText}>Voltar</Text>
        </TouchableOpacity> : <View style={styles.modalHeaderSpacer} />}
        {title ? <Text numberOfLines={1} style={styles.modalTitle}>{title}</Text> : <View style={styles.modalHeaderSpacer} />}
        <TouchableOpacity accessibilityLabel="Fechar modal" style={styles.modalClose} onPress={onClose}><MaterialCommunityIcons name="close" color="#fff" size={22} /></TouchableOpacity>
      </View>}
      <ScrollView
        style={styles.modalScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={!isMobile}
        contentContainerStyle={[styles.modalPanelContent, footer ? styles.modalPanelContentWithFooter : null]}
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.modalFooter}>{footer}</View> : null}
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
  const tone = status === 'ATIVO' || status === 'PAGO' || status === 'CONFIRMADO' || status === 'ENTREGUE' ? colors.green : status === 'PENDENTE' || status === 'FUTURO' ? colors.yellow : colors.red;
  return <View style={[styles.badge, { backgroundColor: tone }]}><Text style={styles.badgeText}>{status}</Text></View>;
}

export function ListCard({ title, subtitle, status, onPress, image }: { title: string; subtitle: string; status?: string; onPress?: () => void; image?: ImageSourcePropType }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.listCard}>{image && <Image source={image} style={styles.thumb} />}<View style={{ flex: 1 }}><Text style={styles.listTitle}>{title}</Text><Text style={styles.listSubtitle}>{subtitle}</Text></View>{status && <StatusBadge status={status} />}</TouchableOpacity>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  appRoot: { flex: 1, flexDirection: 'row', backgroundColor: colors.black },
  screen: { flex: 1, backgroundColor: colors.black, position: 'relative' },
  responsiveContainer: { flex: 1, alignSelf: 'center' },
  appScroll: { flex: 1, ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : null) },
  appScrollContent: { flexGrow: 1, width: '100%', alignSelf: 'center', paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 10 },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  stat: { minHeight: 112, maxHeight: 130, borderRadius: 14, padding: 13, borderWidth: 1, marginBottom: 12, justifyContent: 'space-between' },
  dot: { width: 24, height: 24, borderRadius: 8 },
  statTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 3 },
  small: { color: colors.muted, fontSize: 11, marginTop: 2 },
  button: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '800', maxWidth: '100%' },
  input: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#FAFAFA', paddingHorizontal: 14, color: '#111', marginTop: 8 },
  fieldWrap: { marginTop: 12 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  fieldInput: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#111', paddingHorizontal: 14, color: colors.text, outlineStyle: 'none' as any },
  fieldMultiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  searchWrap: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, height: 46, outlineStyle: 'none' as any },
  iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  fab: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.red, borderWidth: 1, borderColor: colors.redDark },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.08)', zIndex: 9000, elevation: 9000 },
  menuPanel: { position: 'absolute', backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', zIndex: 9001, elevation: 9001, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  menuPanelDesktop: { borderRadius: 14 },
  menuPanelMobile: { borderRadius: 18 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#282828' },
  menuText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)', zIndex: 10000, elevation: 10000 },
  modalOverlayMobile: { justifyContent: 'flex-end', paddingTop: 34 },
  modalPanel: { width: '100%', backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  modalPanelDesktop: { borderRadius: 22 },
  modalPanelMobile: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: { height: 56, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalHeaderSpacer: { width: 86 },
  modalBack: { minWidth: 86, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  modalBackText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  modalTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 15, fontWeight: '900' },
  modalClose: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  modalScroll: { flex: 1, ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : null) },
  modalPanelContent: { padding: 18, paddingTop: 16, paddingBottom: 24 },
  modalPanelContentWithFooter: { paddingBottom: 16 },
  modalFooter: { flexShrink: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.dark },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  listCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  listTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  listSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  thumb: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#333' }
});

export const AppBottomTabs = BottomTabs;
