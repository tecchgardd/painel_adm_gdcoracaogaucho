import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet, TextInput, Image, ImageSourcePropType, Modal, ScrollView, SafeAreaView, Platform, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/shared/hooks/useResponsive';
import { Sidebar } from '@/shared/components/navigation/Sidebar';
import { BottomTabs } from '@/shared/components/navigation/BottomTabs';
import { colors, theme } from '@/theme/theme';
import { buttonTones, statusTones } from '@/theme/tones';
import { normalizeStatus } from '@/shared/utils/situacao';

const { radius } = theme;

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
  if (activeElement && 'blur' in activeElement) {
    (activeElement as HTMLElement).blur();
  }
}

export function Logo({ size = 92 }: { size?: number }) {
  return <Image source={require('../../../../assets/logo-oficial.jpeg')} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
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

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <View style={styles.header}>
    <View style={styles.headerCopy}>
      <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text numberOfLines={2} style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
    {right ? <View style={styles.headerRight}>{right}</View> : null}
  </View>;
}

export function Header(props: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <AppHeader {...props} />;
}

/** Bloco com título, ação opcional à direita e conteúdo; base dos painéis do dashboard. */
export function Panel({ title, icon, action, children, style }: {
  title?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
  style?: any;
}) {
  return <View style={[styles.panel, style]}>
    {title || action ? <View style={styles.panelHeader}>
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={colors.muted} /> : null}
      {title ? <Text numberOfLines={1} style={styles.panelTitle}>{title}</Text> : <View style={{ flex: 1 }} />}
      {action ? <TouchableOpacity onPress={action.onPress} accessibilityRole="link" accessibilityLabel={action.label} style={styles.panelAction}>
        <Text style={styles.panelActionText}>{action.label}</Text>
        <MaterialCommunityIcons name="arrow-right" size={14} color={colors.red} />
      </TouchableOpacity> : null}
    </View> : null}
    {children}
  </View>;
}

export function AppCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Card(props: { children: React.ReactNode; style?: any }) {
  return <AppCard {...props} />;
}

/** Indicador compacto; as telas usam sempre 4 por linha (2x2 fora do desktop). */
export function StatCard({ title, value, tone = 'red', onPress }: { title: string; value: string; tone?: 'red' | 'green' | 'yellow'; onPress?: () => void }) {
  const { isDesktop } = useResponsive();
  const fg = tone === 'green' ? '#4CB85C' : tone === 'yellow' ? colors.yellow : colors.red;
  const width = isDesktop ? '23.5%' : '48.5%';
  const content = <>
    <View style={styles.statTop}><View style={[styles.dot, { backgroundColor: fg }]} /><Text numberOfLines={1} style={styles.statTitle}>{title}</Text></View>
    <Text numberOfLines={1} style={styles.statValue}>{value}</Text>
    {onPress ? <Text style={styles.small}>Filtrar</Text> : null}
  </>;
  return onPress
    ? <TouchableOpacity activeOpacity={0.82} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}: ${value}`} style={[styles.stat, { width }]}>{content}</TouchableOpacity>
    : <View style={[styles.stat, { width }]}>{content}</View>;
}

export function AppButton({ title, onPress, tone = 'red', disabled = false }: { title: string; onPress?: () => void; tone?: 'red' | 'green' | 'dark' | 'soft'; disabled?: boolean }) {
  const { bg, border, text } = buttonTones[tone];
  return <TouchableOpacity activeOpacity={0.85} disabled={disabled || !onPress} onPress={onPress} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || !onPress }} style={[styles.button, { backgroundColor: bg, borderColor: border }, (disabled || !onPress) && styles.buttonDisabled]}><Text numberOfLines={2} style={[styles.buttonText, { color: text }]}>{title}</Text></TouchableOpacity>;
}

export function Button(props: { title: string; onPress?: () => void; tone?: 'red' | 'green' | 'dark' | 'soft'; disabled?: boolean }) {
  return <AppButton {...props} />;
}

export function FormField({ label, hint, error, required = false, multiline = false, ...props }: React.ComponentProps<typeof TextInput> & { label: string; hint?: string; error?: string; required?: boolean; multiline?: boolean }) {
  const [focused, setFocused] = React.useState(false);
  return <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.fieldRequired}> *</Text> : null}</Text>
    <TextInput
      placeholderTextColor={colors.subtle}
      multiline={multiline}
      accessibilityLabel={label}
      {...props}
      onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
      style={[styles.fieldInput, multiline && styles.fieldMultiline, focused && styles.fieldFocused, !!error && styles.fieldInvalid, props.editable === false && styles.fieldDisabled, props.style]}
    />
    {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
  </View>;
}

/** Linha "rótulo / valor" para modais de detalhe; agrupe várias dentro de `InfoList`. */
export function InfoRow({ label, value, strong = false }: { label: string; value?: React.ReactNode; strong?: boolean }) {
  const empty = value === undefined || value === null || value === '';
  return <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    {typeof value === 'string' || typeof value === 'number' || empty
      ? <Text selectable style={[styles.infoValue, strong && styles.infoValueStrong, empty && styles.infoEmpty]}>{empty ? 'Não informado' : String(value)}</Text>
      : value}
  </View>;
}

export function InfoList({ children }: { children: React.ReactNode }) {
  // Linhas usam borda superior; a primeira fica escondida pelo marginTop negativo + overflow hidden.
  return <View style={styles.infoList}><View style={styles.infoListInner}>{children}</View></View>;
}

/** Bloco de formulário com título; separa grupos (dados pessoais, endereço...) dentro de um modal. */
export function FormSection({ title, description, first = false, children }: { title: string; description?: string; first?: boolean; children: React.ReactNode }) {
  return <View style={[styles.formSection, first && styles.formSectionFirst]}>
    <Text style={styles.formSectionTitle}>{title}</Text>
    {description ? <Text style={styles.formSectionDescription}>{description}</Text> : null}
    {children}
  </View>;
}

/** Campos lado a lado fora do mobile; empilhados no mobile. Itens nulos são ignorados. */
export function FormRow({ children }: { children: React.ReactNode }) {
  const { isMobile } = useResponsive();
  const items = React.Children.toArray(children).filter(Boolean);
  if (isMobile) return <>{items}</>;
  return <View style={styles.formRow}>
    {items.map((child, index) => <View key={index} style={styles.formRowItem}>{child}</View>)}
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

export function ActionMenu({ actions, variant = 'default' }: { actions: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; tone?: 'default' | 'danger' }[]; variant?: 'default' | 'ghost' }) {
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
      style={variant === 'ghost' ? styles.iconButtonGhost : styles.iconButton}
      accessibilityRole="button"
      accessibilityLabel="Mais opções"
    >
      <MaterialCommunityIcons name="dots-vertical" color={variant === 'ghost' ? colors.muted : colors.text} size={20} />
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

export type ModalSize = 'sm' | 'md' | 'lg';
const modalWidths: Record<ModalSize, number> = { sm: 460, md: 640, lg: 860 };

export function ModalContent({
  children,
  onClose,
  title,
  subtitle,
  footer,
  size = 'md',
  position: _position = 'bottom'
}: {
  children: React.ReactNode;
  position?: 'bottom' | 'center';
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  size?: ModalSize;
}) {
  // `position` is kept for backward compatibility with existing call sites (many pass
  // position="center" explicitly) but modals are now always centered per the design system.
  const { width, height, isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const panelWidth = isMobile ? width - 24 : Math.min(width - 48, modalWidths[size]);
  const panelMaxHeight = Math.max(320, height - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - (isMobile ? 24 : 64));
  return <View style={[styles.modalOverlay, { paddingHorizontal: isMobile ? 12 : 24 }]}>
    <View style={[styles.modalPanel, { maxHeight: panelMaxHeight, width: panelWidth }]}>
      {(title || onClose) && <View style={styles.modalHeader}>
        <View style={styles.modalHeaderCopy}>
          {title ? <Text numberOfLines={1} style={styles.modalTitle}>{title}</Text> : null}
          {subtitle ? <Text numberOfLines={2} style={styles.modalSubtitle}>{subtitle}</Text> : null}
        </View>
        {onClose ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={(state) => [styles.modalClose, (state as { hovered?: boolean }).hovered && styles.modalCloseHover]}
        ><MaterialCommunityIcons name="close" color={colors.muted} size={20} /></Pressable> : null}
      </View>}
      <ScrollView
        style={styles.modalScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={!isMobile}
        contentContainerStyle={[styles.modalPanelContent, footer ? styles.modalPanelContentWithFooter : null]}
      >
        {children}
      </ScrollView>
      {footer ? <View style={[styles.modalFooter, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>{footer}</View> : null}
    </View>
  </View>;
}

export function AppModal({
  visible,
  onClose,
  children,
  position = 'bottom',
  title,
  subtitle,
  footer,
  size = 'md'
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'bottom' | 'center';
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  /** sm: confirmações · md: detalhes e formulários (padrão) · lg: formulários longos e documentos. */
  size?: ModalSize;
}) {
  const { isMobile } = useResponsive();
  React.useEffect(() => {
    if (visible) blurActiveElement();
  }, [visible]);

  function close() {
    blurActiveElement();
    onClose();
  }

  return <Modal visible={visible} transparent animationType={isMobile && Platform.OS !== 'web' ? 'slide' : 'fade'} presentationStyle="overFullScreen" onRequestClose={close}>
    <ModalContent position={position} onClose={close} title={title} subtitle={subtitle} footer={footer} size={size}>{children}</ModalContent>
  </Modal>;
}

export function StatusBadge({ status }: { status: string }) {
  // Normaliza acentos e espaços: 'JÁ_UTILIZADO' e 'Confirmada' acham a mesma cor de 'JA_UTILIZADO' e 'CONFIRMADA'.
  const tone = statusTones[normalizeStatus(status)] ?? colors.red;
  const label = String(status).replace(/_/g, ' ');
  return <View style={[styles.badge, { backgroundColor: tone + '24', borderColor: tone + '59' }]} accessibilityLabel={`Status: ${label}`}>
    <View style={[styles.badgeDot, { backgroundColor: tone }]} />
    <Text numberOfLines={1} style={[styles.badgeText, { color: tone }]}>{label}</Text>
  </View>;
}

/** Card de item de lista. `actions` (ex.: <ActionMenu variant="ghost" />) fica dentro do card, no canto direito. */
/**
 * Card de item de lista. `actions` (ex.: <ActionMenu variant="ghost" />) fica dentro do card, no canto
 * direito, como irmão da área clicável — nunca dentro dela, para não aninhar <button> na web.
 */
export function ListCard({ title, subtitle, status, onPress, image, actions }: { title: string; subtitle: string; status?: string; onPress?: () => void; image?: ImageSourcePropType; actions?: React.ReactNode }) {
  const [hovered, setHovered] = React.useState(false);
  return <View style={[styles.listCard, hovered && styles.listCardHover]}>
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      style={({ pressed }) => [styles.listMain, pressed && styles.listCardPressed]}
    >
      {image ? <Image source={image} style={styles.thumb} /> : null}
      <View style={styles.listBody}>
        <Text numberOfLines={2} style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text numberOfLines={3} style={styles.listSubtitle}>{subtitle}</Text> : null}
        {status ? <View style={styles.listStatus}><StatusBadge status={status} /></View> : null}
      </View>
    </Pressable>
    {actions ? <View style={styles.listActions}>{actions}</View> : null}
  </View>;
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, paddingTop: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: colors.text, fontSize: 24, lineHeight: 32, fontFamily: theme.font.semiBold },
  headerSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, fontFamily: theme.font.regular, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  panel: { backgroundColor: colors.dark, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.borderSoft, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { flex: 1, color: colors.text, fontSize: 15, fontFamily: theme.font.semiBold },
  panelAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 4 },
  panelActionText: { color: colors.red, fontSize: 12, fontFamily: theme.font.medium },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  avatarText: { color: colors.text, fontFamily: theme.font.semiBold },
  stat: { minHeight: 96, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, marginBottom: 12, justifyContent: 'space-between' },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statTitle: { flex: 1, color: colors.muted, fontSize: 12, fontFamily: theme.font.medium },
  statValue: { color: colors.text, fontSize: 22, lineHeight: 30, fontFamily: theme.font.semiBold, marginTop: 6 },
  small: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.regular, marginTop: 2 },
  button: { minHeight: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 14, lineHeight: 18, fontFamily: theme.font.semiBold, maxWidth: '100%', textAlign: 'center' },
  fieldWrap: { marginTop: 14 },
  fieldLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, marginBottom: 6 },
  fieldInput: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, paddingHorizontal: 14, color: colors.text, fontSize: 14, fontFamily: theme.font.regular, outlineStyle: 'none' as any },
  fieldFocused: { borderColor: colors.redBorder, backgroundColor: colors.card },
  fieldDisabled: { opacity: 0.6 },
  fieldHint: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.regular, marginTop: 5 },
  fieldRequired: { color: colors.red },
  fieldInvalid: { borderColor: colors.red },
  fieldError: { color: colors.red, fontSize: 12, fontFamily: theme.font.medium, marginTop: 5 },
  formSection: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  formSectionFirst: { marginTop: 0, paddingTop: 0, borderTopWidth: 0 },
  formSectionTitle: { color: colors.text, fontSize: 14, fontFamily: theme.font.semiBold },
  formSectionDescription: { color: colors.subtle, fontSize: 12, lineHeight: 17, fontFamily: theme.font.regular, marginTop: 2 },
  formRow: { flexDirection: 'row', gap: 12 },
  infoList: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardAlt, paddingHorizontal: 14, overflow: 'hidden' },
  infoListInner: { marginTop: -1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 46, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  infoLabel: { color: colors.muted, fontSize: 13, fontFamily: theme.font.regular },
  infoValue: { flexShrink: 1, color: colors.text, fontSize: 14, fontFamily: theme.font.medium, textAlign: 'right' },
  infoValueStrong: { fontSize: 16, fontFamily: theme.font.semiBold },
  infoEmpty: { color: colors.subtle },
  formRowItem: { flex: 1, minWidth: 0 },
  fieldMultiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  searchWrap: { height: 42, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, paddingHorizontal: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, fontFamily: theme.font.regular, height: 40, outlineStyle: 'none' as any },
  iconButtonGhost: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  fab: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.red, borderWidth: 1, borderColor: colors.redDark },
  choiceGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flexShrink: 1, maxWidth: '100%' },
  choiceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, paddingHorizontal: 14, outlineStyle: 'none' as any },
  choiceChipActive: { backgroundColor: colors.red, borderColor: colors.red },
  choiceChipActiveGreen: { backgroundColor: colors.green, borderColor: colors.green },
  choiceChipText: { color: colors.muted, fontSize: 13, fontFamily: theme.font.semiBold },
  choiceChipTextActive: { color: '#fff' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.08)', zIndex: 9000, elevation: 9000 },
  menuPanel: { position: 'absolute', backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', zIndex: 9001, elevation: 9001, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  menuPanelDesktop: { borderRadius: 14 },
  menuPanelMobile: { borderRadius: 18 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#282828' },
  menuText: { color: colors.text, fontSize: 14, fontFamily: theme.font.semiBold },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20, backgroundColor: 'rgba(0,0,0,.7)', zIndex: 10000, elevation: 10000 },
  modalPanel: { width: '100%', backgroundColor: colors.dark, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.55)' as any },
  modalHeader: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20, paddingRight: 12, paddingVertical: 12, minHeight: 60, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  modalHeaderCopy: { flex: 1, minWidth: 0 },
  modalTitle: { color: colors.text, fontSize: 17, lineHeight: 24, fontFamily: theme.font.semiBold },
  modalSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, fontFamily: theme.font.regular, marginTop: 1 },
  modalClose: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : null) },
  modalCloseHover: { backgroundColor: colors.cardHover },
  modalScroll: { flex: 1, ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : null) },
  modalPanelContent: { padding: 20, paddingBottom: 28 },
  modalPanelContentWithFooter: { paddingBottom: 20 },
  modalFooter: { flexShrink: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.dark },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontFamily: theme.font.medium, textTransform: 'capitalize' },
  listCard: { minHeight: 88, flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.lg, backgroundColor: colors.dark, borderWidth: 1, borderColor: colors.borderSoft },
  listMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : null) },
  listCardHover: { borderColor: colors.border, backgroundColor: colors.cardAlt },
  listCardPressed: { opacity: 0.9 },
  listBody: { flex: 1, minWidth: 0 },
  listStatus: { marginTop: 10 },
  listActions: { paddingTop: 8, paddingRight: 6 },
  listTitle: { color: colors.text, fontSize: 15, lineHeight: 21, fontFamily: theme.font.semiBold },
  listSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, fontFamily: theme.font.regular, marginTop: 4 },
  thumb: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#333' }
});

export const AppBottomTabs = BottomTabs;

export { FilterBar, type FilterConfig, type FilterOption } from './FilterBar';
export { Pagination } from './Pagination';
