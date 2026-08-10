# Design System, Navegação e Login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the painel-admin mobile app onto the new dark/premium design system (colors, Poppins typography, centered modals, button variants), restructure the bottom tab bar to the 5 tabs from the approved prototype, and rebuild the Login and Menu screens against the real auth store — with no changes to API contracts or business logic.

**Architecture:** The app already has a working dark theme, a single shared-primitives file (`src/components/ui.tsx`), a token file (`src/theme/theme.ts`), and real services wired to the backend. This plan only touches the token layer, the shared primitives, navigation config, and the Login/Menu screens — CRUD screens (eventos, cursos, alunos, vendas, etc.) inherit the new tokens automatically through the shared primitives but are not otherwise touched in this phase.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router, TypeScript (strict), Zustand, Vitest. New dependencies added in this plan: `@expo-google-fonts/poppins`, `expo-local-authentication`.

## Global Constraints

- Path alias `@/*` → `src/*` (existing `tsconfig.json`) — use it in all new imports.
- TypeScript strict, no unnecessary `any`.
- `npm run validate` (typecheck + lint + doctor) must pass before any task is considered done.
- Storage: web uses `AsyncStorage`, native uses `expo-secure-store` — this rule applies to auth tokens only (already handled in `src/services/api.ts`, do not duplicate). Non-sensitive local preferences (remembered e-mail, biometria opt-in) use `AsyncStorage` on every platform, matching the existing pattern in `src/services/auth.service.ts` (`AUTH_USER_STORAGE_KEY`).
- Never persist a password to any storage.
- No hardcoded secrets/tokens.
- No comments except where the *why* is non-obvious; never explain *what* the code does.
- Exact color tokens (source: approved prototype):
  `bg #08090A · surface #121315 · surface2 #191A1D · border #2B2C31 · text #F7F3EA · textMuted #9B9DA6 · red #D8322F · redDark #641B1B · goldAccent #C8902B · goldAccentDark #6F4F1D · green #2F8A3A · blue #3D82C7 · amber #D79B21`.
- `colors.gold` (`#D4A62A`) is a **different, pre-existing token** used only by the PDF ticket document (`src/components/documents/EventTicket/styles.ts`) — do not change its value or reuse its name for the new UI accent color; the new accent tokens are named `goldAccent`/`goldAccentDark` to avoid collision.
- Keep every existing key in `theme.colors` (do not delete `yellow`, `cardAlt`, `info`, `infoBg`, `infoText`, `white`, `gold`) — many out-of-scope screens depend on them by name.

## File Structure

- `src/theme/theme.ts` — **modify**: new hex values for the tokens already in scope, add `goldAccent`, `goldAccentDark`, `blue`, `amber`, add a `font` map for Poppins family names.
- `src/theme/tones.ts` — **create**: pure (no React Native import beyond `./theme`) color-mapping tables (`buttonTones`, `statusTones`) extracted so they're unit-testable; consumed by `src/components/ui.tsx`.
- `src/theme/tones.test.ts` — **create**: unit tests for the tables above.
- `app/_layout.tsx` — **modify**: load Poppins font weights alongside the existing icon font.
- `src/components/ui.tsx` — **modify**: `AppButton`/`Button` gain a `soft` tone and render `dark` as an outline instead of a solid fill; `ModalContent`/`AppModal` are always centered (drop the mobile bottom-sheet branch); `StatusBadge` consumes the extracted `statusTones` table; new `Avatar` export; `AppInput`/`Input` removed (only consumer is the login screen, replaced in Task 5).
- `src/utils/rememberedEmail.ts` — **create**: AsyncStorage-backed helpers to remember/forget the last-used login e-mail.
- `src/utils/rememberedEmail.test.ts` — **create**.
- `src/services/biometric.service.ts` — **create**: thin wrapper around `expo-local-authentication` plus an AsyncStorage-backed "biometria habilitada" flag.
- `src/services/biometric.service.test.ts` — **create**.
- `app/login.tsx` — **modify** (full re-skin): dark layout matching the prototype, password visibility toggle, "Lembrar acesso", "Esqueci minha senha" info modal, biometria entry point.
- `src/navigation.config.ts` — **modify**: `mobileTabs` becomes the 5 tabs from the prototype (Dashboard, Scanner, Eventos, Gestão, Menu).
- `src/components/navigation/BottomTabs.tsx` — **modify**: apply Poppins to tab labels (colors already flow from the token file, no color logic changes needed).
- `app/(admin)/_layout.tsx` — **modify**: register the 3 new Menu destination routes as hidden tabs; add `/menu` to the CHECKIN role's allowed routes (pre-existing gap — CHECKIN could not reach any screen with a logout action).
- `app/(admin)/menu.tsx` — **modify**: user header (avatar/name/email/role), restyled list, adds "Meu perfil"/"Ajuda"/"Sobre o app", keeps every existing destination (Colaboradores, Configurações, Empresas, Relatórios, Fotos, Sair da conta).
- `app/(admin)/perfil.tsx` — **create**: read-only profile screen sourced from `useAuthStore`.
- `app/(admin)/ajuda.tsx` — **create**: static help screen.
- `app/(admin)/sobre.tsx` — **create**: static about screen.

**Deferred from the spec's component inventory (no task in this plan):** `MetricCard` (evolution of the existing `StatCard`) and the `StatCard`-based dashboard cards only exist on the Dashboard, which is out of scope for this phase — restyling `StatCard` now would touch dashboard-only code with no screen in this phase to verify it against. `FilterChip` needs no code change: it's the existing `ChoiceChip`, which already reads all its colors from `theme.colors` and is restyled automatically by Task 1's token change. `EmptyState`/`LoadingState`/`ErrorState` (in `src/components/crud/`) inherit the same way.

---

### Task 1: Design tokens and Poppins typography

**Files:**
- Modify: `src/theme/theme.ts`
- Modify: `app/_layout.tsx`
- Modify: `package.json` (via `npx expo install`)

**Interfaces:**
- Produces: `theme.colors.{black,dark,card,cardAlt,border,text,muted,red,redDark,green,goldAccent,goldAccentDark,blue,amber,yellow,gold,white,info,infoBg,infoText}` (all strings), `theme.font.{regular,medium,semiBold,bold}` (Poppins family name strings), `theme.radius`, `theme.layout` (unchanged). Consumed by every later task in this plan.

- [ ] **Step 1: Install the Poppins font package**

Run: `npx expo install @expo-google-fonts/poppins`

- [ ] **Step 2: Replace the token values in `src/theme/theme.ts`**

Replace the whole file with:

```ts
import { Platform } from 'react-native';

export const theme = {
  colors: {
    red: '#D8322F',
    redDark: '#641B1B',
    green: '#2F8A3A',
    yellow: '#D79B21',
    amber: '#D79B21',
    gold: '#D4A62A',
    goldAccent: '#C8902B',
    goldAccentDark: '#6F4F1D',
    blue: '#3D82C7',
    info: '#16738A',
    infoBg: '#102D34',
    infoText: '#C6F4FF',
    black: '#08090A',
    dark: '#121315',
    card: '#191A1D',
    cardAlt: '#15161A',
    text: '#F7F3EA',
    muted: '#9B9DA6',
    border: '#2B2C31',
    white: '#F7F3EA'
  },
  font: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold'
  },
  layout: {
    mobileMaxWidth: 430,
    adminMaxWidth: 900,
    modalMaxWidth: 480
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22
  }
};

export const colors = theme.colors;
export const isWeb = Platform.OS === 'web';
export const isDesktopWidth = (width: number) => isWeb && width >= 768;
export const isMobileWidth = (width: number) => width < 768;
export const isDesktop = isDesktopWidth;
export const isMobile = isMobileWidth;
```

- [ ] **Step 3: Load the Poppins weights in the root layout**

Replace `app/_layout.tsx` with:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold
} from '@expo-google-fonts/poppins';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold
  });
  if (!fontsLoaded) return null;
  return <SafeAreaProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false }} /></SafeAreaProvider>;
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run web` and confirm the app still boots to the login screen (visual re-skin happens in Task 5 — at this point it should just boot without a white screen/crash, since fonts must finish loading before `Stack` renders).

- [ ] **Step 5: Commit**

```bash
git add src/theme/theme.ts app/_layout.tsx package.json package-lock.json
git commit -m "feat(theme): apply new dark palette tokens and load Poppins"
```

---

### Task 2: Shared UI primitives — button variants, centered modal, Avatar

**Files:**
- Create: `src/theme/tones.ts`
- Test: `src/theme/tones.test.ts`
- Modify: `src/components/ui.tsx`

**Interfaces:**
- Consumes: `theme`/`colors` from Task 1 (`colors.red`, `colors.green`, `colors.border`, `colors.text`, `colors.card`, `colors.amber`, `colors.blue`, `colors.goldAccent`).
- Produces: `buttonTones: Record<'red'|'green'|'dark'|'soft', { bg: string; border: string; text: string }>`, `statusTones: Record<string, string>` (both from `src/theme/tones.ts`); `Avatar({ name, size }: { name?: string; size?: number })` and updated `Button`/`AppButton` (now accepts `tone: 'red'|'green'|'dark'|'soft'`) exported from `src/components/ui.tsx`, consumed by Tasks 5 and 7.

- [ ] **Step 1: Write the failing test for the extracted tone tables**

Create `src/theme/tones.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buttonTones, statusTones } from './tones';

describe('buttonTones', () => {
  it('renderiza o tom primário preenchido com a cor de marca', () => {
    expect(buttonTones.red.bg).toBe(buttonTones.red.border);
    expect(buttonTones.red.text).toBe('#FFFFFF');
  });

  it('renderiza o tom secundário como contorno (sem preenchimento)', () => {
    expect(buttonTones.dark.bg).toBe('transparent');
    expect(buttonTones.dark.border).not.toBe('transparent');
  });

  it('renderiza o tom suave com preenchimento sutil', () => {
    expect(buttonTones.soft.bg).not.toBe('transparent');
    expect(buttonTones.soft.bg).not.toBe(buttonTones.red.bg);
  });
});

describe('statusTones', () => {
  it('usa verde para status pagos/confirmados', () => {
    expect(statusTones.PAGO).toBe(statusTones.CONFIRMADO);
    expect(statusTones.ATIVO).toBe(statusTones.PAGO);
  });

  it('usa a mesma cor para pendente e futuro', () => {
    expect(statusTones.PENDENTE).toBe(statusTones.FUTURO);
  });

  it('define uma cor para cortesia', () => {
    expect(statusTones.CORTESIA).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/theme/tones.test.ts`
Expected: FAIL — `Cannot find module './tones'`.

- [ ] **Step 3: Implement `src/theme/tones.ts`**

```ts
import { colors } from './theme';

export const buttonTones = {
  red: { bg: colors.red, border: colors.red, text: '#FFFFFF' },
  green: { bg: colors.green, border: colors.green, text: '#FFFFFF' },
  dark: { bg: 'transparent', border: colors.border, text: colors.text },
  soft: { bg: colors.card, border: colors.border, text: colors.text }
} as const;

export type ButtonTone = keyof typeof buttonTones;

export const statusTones: Record<string, string> = {
  ATIVO: colors.green,
  PAGO: colors.green,
  CONFIRMADO: colors.green,
  ENTREGUE: colors.green,
  PENDENTE: colors.amber,
  FUTURO: colors.amber,
  PROCESSANDO: colors.blue,
  FALHOU: '#D32F2F',
  CANCELADO: '#666666',
  EXPIRADO: '#D66A00',
  ESTORNADO: '#7137A8',
  PARCIALMENTE_ESTORNADO: '#9B6BC0',
  CONTESTADO: '#D84B20',
  CONTESTACAO_PERDIDA: '#8B1010',
  CORTESIA: colors.goldAccent
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/theme/tones.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Wire the new tone tables into the Button component**

In `src/components/ui.tsx`, add the import (top of file, alongside the other `@/theme` import):

```ts
import { buttonTones, statusTones } from '@/theme/tones';
```

Replace the `AppButton`/`Button` block:

```ts
export function AppButton({ title, onPress, tone = 'red', disabled = false }: { title: string; onPress?: () => void; tone?: 'red' | 'green' | 'dark' | 'soft'; disabled?: boolean }) {
  const { bg, border, text } = buttonTones[tone];
  return <TouchableOpacity activeOpacity={0.85} disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: bg, borderColor: border }, disabled && styles.buttonDisabled]}><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.buttonText, { color: text }]}>{title}</Text></TouchableOpacity>;
}

export function Button(props: { title: string; onPress?: () => void; tone?: 'red' | 'green' | 'dark' | 'soft'; disabled?: boolean }) {
  return <AppButton {...props} />;
}
```

Update the `button`/`buttonText` entries in `styles`:

```ts
  button: { minHeight: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 14, fontWeight: '800', maxWidth: '100%' },
```

(Remove the old `backgroundColor` computation and the hardcoded `color: '#fff'` — both are now supplied per-tone above.)

- [ ] **Step 6: Make `StatusBadge` consume the extracted table**

Replace the `StatusBadge` function body:

```ts
export function StatusBadge({ status }: { status: string }) {
  const tone = statusTones[String(status).toUpperCase()] ?? colors.red;
  return <View style={[styles.badge, { backgroundColor: tone }]} accessibilityLabel={`Status: ${status}`}><Text style={styles.badgeText}>{status}</Text></View>;
}
```

Delete the inline `tones` object that used to live inside this function.

- [ ] **Step 7: Add the `Avatar` primitive**

Add near `Logo`:

```ts
export function Avatar({ name, size = 44 }: { name?: string; size?: number }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{initial}</Text>
  </View>;
}
```

Add to `styles`:

```ts
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  avatarText: { color: colors.text, fontWeight: '800' },
```

- [ ] **Step 8: Make `ModalContent`/`AppModal` always centered**

Replace the `ModalContent` function:

```ts
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
```

Remove the now-unused style keys from `styles`: `modalOverlayMobile`, `modalPanelMobile`, `modalBack`, `modalBackText`.

- [ ] **Step 9: Remove the now-dead light-theme `Input`/`AppInput`**

Leave `AppInput`/`Input` in place for this step — they are removed in Task 5 together with the login screen rewrite that is their only remaining consumer (removing them here would break typecheck before Task 5 runs).

- [ ] **Step 10: Verify**

Run: `npx vitest run src/theme/tones.test.ts` — PASS.
Run: `npm run typecheck` — no errors.
Run: `npm run lint` — no errors.

- [ ] **Step 11: Manual verification**

Run: `npm run web`. Open any existing screen with a modal that previously used the bottom-sheet default on mobile width (e.g. `/(admin)/bailes` → tap a card to open its detail modal, or `/(admin)/colaboradores` → tap a card). Confirm the modal now opens centered with rounded corners on all sides and a visible X button, and that it still fits inside a narrow (375px) viewport without overflowing.

- [ ] **Step 12: Commit**

```bash
git add src/theme/tones.ts src/theme/tones.test.ts src/components/ui.tsx
git commit -m "feat(ui): add button variants, centered modal and Avatar primitive"
```

---

### Task 3: Remembered-email utility

**Files:**
- Create: `src/utils/rememberedEmail.ts`
- Test: `src/utils/rememberedEmail.test.ts`

**Interfaces:**
- Produces: `getRememberedEmail(): Promise<string | null>`, `setRememberedEmail(email: string): Promise<void>`, `clearRememberedEmail(): Promise<void>` — consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/utils/rememberedEmail.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from './rememberedEmail';

describe('rememberedEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lê o e-mail salvo pela chave dedicada', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('joao@coracaogaucho.com');
    await expect(getRememberedEmail()).resolves.toBe('joao@coracaogaucho.com');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@cg_admin_remembered_email');
  });

  it('salva o e-mail informado', async () => {
    await setRememberedEmail('joao@coracaogaucho.com');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cg_admin_remembered_email', 'joao@coracaogaucho.com');
  });

  it('remove o e-mail salvo', async () => {
    await clearRememberedEmail();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_remembered_email');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/rememberedEmail.test.ts`
Expected: FAIL — `Cannot find module './rememberedEmail'`.

- [ ] **Step 3: Implement `src/utils/rememberedEmail.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBERED_EMAIL_KEY = '@cg_admin_remembered_email';

export async function getRememberedEmail() {
  return AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
}

export async function setRememberedEmail(email: string) {
  await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
}

export async function clearRememberedEmail() {
  await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/rememberedEmail.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/rememberedEmail.ts src/utils/rememberedEmail.test.ts
git commit -m "feat(auth): add remembered-email storage helper"
```

---

### Task 4: Biometric login service

**Files:**
- Create: `src/services/biometric.service.ts`
- Test: `src/services/biometric.service.test.ts`
- Modify: `package.json` (via `npx expo install`)

**Interfaces:**
- Produces: `isBiometricAvailable(): Promise<boolean>`, `isBiometricEnabled(): Promise<boolean>`, `setBiometricEnabled(enabled: boolean): Promise<void>`, `authenticateWithBiometrics(promptMessage?: string): Promise<boolean>` — consumed by Task 5. This gates the token already stored by `src/services/api.ts`/`auth.service.ts`; it does not call the backend.

- [ ] **Step 1: Install the dependency**

Run: `npx expo install expo-local-authentication`

- [ ] **Step 2: Write the failing test**

Create `src/services/biometric.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  authenticateAsync: vi.fn()
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }
}));

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled
} from './biometric.service';

describe('isBiometricAvailable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna falso quando não há hardware biométrico', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
    await expect(isBiometricAvailable()).resolves.toBe(false);
    expect(LocalAuthentication.isEnrolledAsync).not.toHaveBeenCalled();
  });

  it('retorna falso quando não há biometria cadastrada no aparelho', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);
    await expect(isBiometricAvailable()).resolves.toBe(false);
  });

  it('retorna verdadeiro com hardware e biometria cadastrada', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    await expect(isBiometricAvailable()).resolves.toBe(true);
  });
});

describe('preferência de biometria habilitada', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lê a preferência salva', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('true');
    await expect(isBiometricEnabled()).resolves.toBe(true);
  });

  it('retorna falso quando não há preferência salva', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await expect(isBiometricEnabled()).resolves.toBe(false);
  });

  it('habilita salvando a flag', async () => {
    await setBiometricEnabled(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cg_admin_biometric_enabled', 'true');
  });

  it('desabilita removendo a flag', async () => {
    await setBiometricEnabled(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_biometric_enabled');
  });
});

describe('authenticateWithBiometrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna verdadeiro quando a autenticação é bem-sucedida', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true } as never);
    await expect(authenticateWithBiometrics()).resolves.toBe(true);
  });

  it('retorna falso quando a autenticação falha', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: false } as never);
    await expect(authenticateWithBiometrics()).resolves.toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/services/biometric.service.test.ts`
Expected: FAIL — `Cannot find module './biometric.service'`.

- [ ] **Step 4: Implement `src/services/biometric.service.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const BIOMETRIC_ENABLED_KEY = '@cg_admin_biometric_enabled';

export async function isBiometricAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function isBiometricEnabled() {
  return (await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY)) === 'true';
}

export async function setBiometricEnabled(enabled: boolean) {
  if (enabled) await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
  else await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
}

export async function authenticateWithBiometrics(promptMessage = 'Entrar com biometria') {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancelar' });
  return result.success;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/services/biometric.service.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add src/services/biometric.service.ts src/services/biometric.service.test.ts package.json package-lock.json
git commit -m "feat(auth): add local-authentication biometric gate service"
```

---

### Task 5: Login screen re-skin

**Files:**
- Modify: `app/login.tsx` (full rewrite)
- Modify: `src/components/ui.tsx` (remove the now-unused `AppInput`/`Input`)

**Interfaces:**
- Consumes: `Button`, `AppModal`, `Logo` from `@/components/ui` (Tasks 1–2); `useAuthStore().login` from `@/stores/auth.store` (existing, unchanged signature `(email: string, password: string) => Promise<void>`); `getRememberedEmail`/`setRememberedEmail`/`clearRememberedEmail` from `@/utils/rememberedEmail` (Task 3); `isBiometricAvailable`/`isBiometricEnabled`/`setBiometricEnabled`/`authenticateWithBiometrics` from `@/services/biometric.service` (Task 4); `theme`/`colors` from `@/theme/theme` (Task 1).

- [ ] **Step 1: Remove the dead light-theme input primitives**

In `src/components/ui.tsx`, delete the `AppInput` and `Input` functions (the block starting at `export function AppInput(props: React.ComponentProps<typeof TextInput>)` through the end of `export function Input(...)`), and delete the now-unused `input` key from `styles`. Do not remove `FormField`/`fieldWrap`/`fieldLabel`/`fieldInput`/`fieldMultiline` — those remain in active use by every CRUD form.

- [ ] **Step 2: Rewrite `app/login.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AppModal, Button, Logo } from '@/components/ui';
import { authenticateWithBiometrics, isBiometricAvailable, isBiometricEnabled, setBiometricEnabled } from '@/services/biometric.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';
import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from '@/utils/rememberedEmail';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    (async () => {
      const rememberedEmail = await getRememberedEmail();
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRemember(true);
      }
      const available = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      setBiometricReady(available && enabled);
    })();
  }, []);

  async function entrar() {
    if (!email.trim() || !password) {
      setError('Informe o e-mail e a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      if (remember) await setRememberedEmail(email.trim().toLowerCase());
      else await clearRememberedEmail();
      if (await isBiometricAvailable()) await setBiometricEnabled(true);
      router.replace('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Não foi possível entrar.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function entrarComBiometria() {
    setError(null);
    const success = await authenticateWithBiometrics('Entrar no Coração Gaúcho');
    if (!success) {
      setError('Não foi possível validar sua biometria.');
      return;
    }
    router.replace('/dashboard');
  }

  return <ScrollView
    style={styles.root}
    contentContainerStyle={[styles.container, Platform.OS === 'web' && styles.containerWeb]}
    keyboardShouldPersistTaps="handled"
  >
    <View style={styles.hero}>
      <Logo size={96} />
      <Text style={styles.brand}>CORAÇÃO GAÚCHO</Text>
      <Text style={styles.tagline}>TRADIÇÃO QUE NOS UNE</Text>
    </View>

    <View style={styles.card}>
      <Text style={styles.title}>Acessar plataforma</Text>

      <Text style={styles.label}>E-mail</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="email-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="seu@email.com"
          placeholderTextColor={colors.muted}
          accessibilityLabel="E-mail"
        />
      </View>

      <Text style={styles.label}>Senha</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="lock-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="********"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Senha"
        />
        <TouchableOpacity onPress={() => setShowPassword((value) => !value)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
          <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.row}>
        <TouchableOpacity style={styles.rememberRow} onPress={() => setRemember((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: remember }}>
          <MaterialCommunityIcons name={remember ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={remember ? colors.red : colors.muted} />
          <Text style={styles.rememberText}>Lembrar acesso</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setForgotVisible(true)} accessibilityRole="button" accessibilityLabel="Esqueci minha senha">
          <Text style={styles.link}>Esqueci minha senha</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonSpacing}>
        <Button title={loading ? 'ENTRANDO...' : 'ENTRAR'} onPress={loading ? undefined : entrar} disabled={loading} />
      </View>

      {biometricReady ? <>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button title="Entrar com biometria" tone="dark" onPress={entrarComBiometria} />
      </> : null}
    </View>

    <Text style={styles.version}>Versão 1.0.0</Text>

    <AppModal visible={forgotVisible} onClose={() => setForgotVisible(false)} position="center" title="Esqueci minha senha">
      <Text style={styles.modalText}>
        Entre em contato com um administrador do Coração Gaúcho para redefinir sua senha de acesso.
      </Text>
    </AppModal>
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  containerWeb: { paddingTop: 'max(64px, env(safe-area-inset-top, 0px))' as unknown as number },
  hero: { alignItems: 'center', gap: 6, marginBottom: 28 },
  brand: { fontFamily: theme.font.bold, fontSize: 20, color: colors.text, letterSpacing: 1, marginTop: 12 },
  tagline: { fontFamily: theme.font.medium, fontSize: 11, color: colors.goldAccent, letterSpacing: 2 },
  card: { width: '100%', maxWidth: theme.layout.mobileMaxWidth, backgroundColor: colors.dark, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: colors.border, padding: 22 },
  title: { fontFamily: theme.font.semiBold, fontSize: 18, color: colors.text, marginBottom: 18, textAlign: 'center' },
  label: { fontFamily: theme.font.medium, fontSize: 12, color: colors.muted, marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14 },
  input: { flex: 1, height: 46, color: colors.text, fontFamily: theme.font.regular, fontSize: 14, outlineStyle: 'none' as never },
  error: { fontFamily: theme.font.medium, color: colors.red, fontSize: 13, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rememberText: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 13 },
  link: { fontFamily: theme.font.semiBold, color: colors.red, fontSize: 13 },
  buttonSpacing: { marginTop: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 12 },
  version: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 12, marginTop: 24 },
  modalText: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 14, lineHeight: 20 }
});
```

Note: no gaúcho-horseman background artwork is used — there is no licensed image asset for it in the repo. The hero section uses the logo/wordmark on the flat dark background instead. Flag this as a follow-up if the user can supply/approve an actual illustration asset.

- [ ] **Step 3: Verify**

Run: `npm run typecheck` — no errors (this also confirms no other file still imports the removed `Input`/`AppInput`, since Step 1 of this task established `app/login.tsx` was their only consumer).
Run: `npm run lint` — no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run web`, open `/login`:
- Confirm the dark card layout matches the prototype (logo, tagline, e-mail/senha fields with icons, checkbox, links, ENTRAR button).
- Type a password and confirm the eye icon toggles visibility.
- Check "Lembrar acesso", log in with valid credentials, reload the page, confirm the e-mail field is pre-filled and the checkbox is checked.
- Log out, confirm the biometria button is absent on web (no biometric hardware) — this is expected, `isBiometricAvailable()` resolves to `false` under Expo's web shim.
- Tap "Esqueci minha senha", confirm the centered info modal opens and closes.

- [ ] **Step 5: Commit**

```bash
git add app/login.tsx src/components/ui.tsx
git commit -m "feat(login): re-skin login screen with dark theme, remember access and biometria"
```

---

### Task 6: Bottom tab navigation restructure

**Files:**
- Modify: `src/navigation.config.ts`
- Modify: `src/components/navigation/BottomTabs.tsx`
- Modify: `app/(admin)/_layout.tsx`

**Interfaces:**
- Produces: `mobileTabs: NavItem[]` with exactly 5 entries (`Dashboard`, `Scanner`, `Eventos`, `Gestão`, `Menu`), consumed by `BottomTabs.tsx` (unchanged consumer, already imports `mobileTabs`/`filterNavigationByRole`).

- [ ] **Step 1: Update `mobileTabs` in `src/navigation.config.ts`**

Replace the `mobileTabs` array:

```ts
export const mobileTabs: NavItem[] = [
  { label: 'Dashboard', icon: 'home-outline', path: '/dashboard', roles: ['ADMIN', 'STAFF'] },
  { label: 'Scanner', icon: 'qrcode-scan', path: '/scanner', roles: ['ADMIN', 'STAFF', 'CHECKIN'] },
  { label: 'Eventos', icon: 'calendar-month-outline', path: '/eventos', roles: ['ADMIN', 'STAFF'] },
  { label: 'Gestão', icon: 'view-grid-plus-outline', path: '/gestao', roles: ['ADMIN', 'STAFF'] },
  { label: 'Menu', icon: 'menu', path: '/menu', roles: ['ADMIN', 'STAFF', 'CHECKIN'] }
];
```

- [ ] **Step 2: Apply Poppins to tab labels in `BottomTabs.tsx`**

In `src/components/navigation/BottomTabs.tsx`, add the theme import:

```ts
import { colors, theme } from '@/theme/theme';
```

(replaces the existing `import { colors } from '@/theme/theme';`)

Update the `label`/`labelActive` style entries:

```ts
  label: {
    fontFamily: theme.font.bold,
    color: colors.muted,
    fontSize: 10
  },
  labelActive: {
    color: colors.red
  }
```

- [ ] **Step 3: Let CHECKIN users reach the Menu tab (existing gap)**

In `app/(admin)/_layout.tsx`, update the allow-list:

```ts
const checkinAllowed = ['/scanner', '/historico-validacoes', '/menu'];
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck` — no errors.
Run: `npm run lint` — no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run web`, log in, confirm the bottom tab bar shows exactly Dashboard, Scanner, Eventos, Gestão, Menu (in that order), that the active tab renders in red and inactive tabs in gray, and that navigating between all 5 tabs works. Log in as a `STAFF`-role account if one is available and confirm the same 5 tabs are visible (no `CHECKIN`-only restriction applies to STAFF).

- [ ] **Step 6: Commit**

```bash
git add src/navigation.config.ts src/components/navigation/BottomTabs.tsx "app/(admin)/_layout.tsx"
git commit -m "feat(nav): restructure bottom tabs to Dashboard/Scanner/Eventos/Gestão/Menu"
```

---

### Task 7: Menu re-skin and new static screens

**Files:**
- Modify: `app/(admin)/menu.tsx`
- Create: `app/(admin)/perfil.tsx`
- Create: `app/(admin)/ajuda.tsx`
- Create: `app/(admin)/sobre.tsx`
- Modify: `app/(admin)/_layout.tsx`

**Interfaces:**
- Consumes: `Avatar`, `AppModal`, `Button`, `Header`, `Screen`, `Logo` from `@/components/ui` (Task 2); `useAuthStore` (`user`, `role` — existing, unchanged); `logout` from `@/services/auth.service` (existing, unchanged).

- [ ] **Step 1: Register the new routes as hidden tabs**

In `app/(admin)/_layout.tsx`, add `'perfil'`, `'ajuda'`, `'sobre'` to the array passed to `.map()` in the hidden-routes line:

```tsx
    {['menu','bailes','cursos','cadastros','clientes','pedidos','ingressos','vendas','colaboradores','alunos','pagamentos','cortesias','historico-validacoes','relatorios','fotos','configuracoes','empresas','perfil','ajuda','sobre'].map((name) => <Tabs.Screen key={name} name={name} options={hidden} />)}
```

- [ ] **Step 2: Rewrite `app/(admin)/menu.tsx`**

```tsx
import { useState } from 'react';
import type React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AppModal, Avatar, Button, Screen } from '@/components/ui';
import { logout as logoutSession } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';

type MenuItem = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path?: string;
  danger?: boolean;
  adminOnly?: boolean;
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Atendimento',
  CHECKIN: 'Check-in'
};

const menuItems: MenuItem[] = [
  { title: 'Meu perfil', subtitle: 'Seus dados de acesso', icon: 'account-outline', path: '/perfil' },
  { title: 'Colaboradores', subtitle: 'Gerenciar colaboradores e acessos', icon: 'account-multiple-outline', path: '/colaboradores', adminOnly: true },
  { title: 'Configurações', subtitle: 'Preferências do painel', icon: 'cog-outline', path: '/configuracoes' },
  { title: 'Empresas', subtitle: 'Cadastro de patrocinadores e apoiadores', icon: 'office-building-outline', path: '/empresas' },
  { title: 'Relatórios', subtitle: 'Indicadores completos e exportações', icon: 'chart-bar', path: '/relatorios' },
  { title: 'Fotos', subtitle: 'Uploads em lote e galeria Cloudinary', icon: 'image-multiple-outline', path: '/fotos' },
  { title: 'Ajuda', subtitle: 'Suporte e dúvidas sobre o painel', icon: 'help-circle-outline', path: '/ajuda' },
  { title: 'Sobre o app', subtitle: 'Versão e créditos', icon: 'information-outline', path: '/sobre' },
  { title: 'Sair da conta', subtitle: 'Encerrar sessão administrativa', icon: 'logout', danger: true }
];

export default function Menu() {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const displayName = user?.nome ?? user?.name ?? 'Usuário';

  function handlePress(item: MenuItem) {
    if (item.danger) {
      setConfirmLogout(true);
      return;
    }
    if (item.path) router.push(item.path as never);
  }

  async function logout() {
    setConfirmLogout(false);
    await logoutSession();
    router.replace('/login');
  }

  const visibleItems = menuItems.filter((item) => !item.adminOnly || role === 'ADMIN');

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
          <View style={styles.half}><Button title="Sair" onPress={logout} /></View>
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
```

- [ ] **Step 3: Create `app/(admin)/perfil.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Atendimento',
  CHECKIN: 'Check-in'
};

export default function Perfil() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const displayName = user?.nome ?? user?.name ?? 'Usuário';

  return (
    <Screen variant="admin">
      <Header title="Meu perfil" />
      <View style={styles.card}>
        <Field label="Nome" value={displayName} />
        <Field label="E-mail" value={user?.email ?? '-'} />
        <Field label="Cargo" value={role ? (roleLabels[role] ?? role) : '-'} />
      </View>
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 16 },
  field: { gap: 4 },
  label: { fontFamily: theme.font.medium, color: colors.muted, fontSize: 12 },
  value: { fontFamily: theme.font.semiBold, color: colors.text, fontSize: 16 }
});
```

- [ ] **Step 4: Create `app/(admin)/ajuda.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '@/components/ui';
import { colors, theme } from '@/theme/theme';

export default function Ajuda() {
  return (
    <Screen variant="admin">
      <Header title="Ajuda" />
      <View style={styles.card}>
        <Text style={styles.text}>
          Precisa de suporte para usar o painel administrativo? Entre em contato com um
          administrador do Coração Gaúcho para tirar dúvidas ou reportar problemas.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  text: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 14, lineHeight: 21 }
});
```

- [ ] **Step 5: Create `app/(admin)/sobre.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Header, Logo, Screen } from '@/components/ui';
import { colors, theme } from '@/theme/theme';

export default function Sobre() {
  return (
    <Screen variant="admin">
      <Header title="Sobre o app" />
      <View style={styles.card}>
        <Logo size={64} />
        <Text style={styles.name}>Coração Gaúcho</Text>
        <Text style={styles.tagline}>Tradição que nos une</Text>
        <Text style={styles.version}>Versão 1.0.0</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 24 },
  name: { fontFamily: theme.font.semiBold, color: colors.text, fontSize: 18, marginTop: 8 },
  tagline: { fontFamily: theme.font.medium, color: colors.goldAccent, fontSize: 12, letterSpacing: 1 },
  version: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 13, marginTop: 10 }
});
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck` — no errors.
Run: `npm run lint` — no errors.
Run: `npm run doctor` — no new warnings introduced by this plan.

- [ ] **Step 7: Manual verification**

Run: `npm run web`, log in, open the Menu tab:
- Confirm the header shows the avatar (initial letter), name, e-mail and role/cargo of the logged-in user.
- Confirm the list shows Meu perfil, Colaboradores (only if the account is ADMIN), Configurações, Empresas, Relatórios, Fotos, Ajuda, Sobre o app, and the red "Sair da conta".
- Open Meu perfil, Ajuda, Sobre o app — confirm each renders without a crash and without any placeholder/mock data.
- Tap "Sair da conta", confirm the centered confirmation modal appears, cancel it, then confirm again and verify it logs out and redirects to `/login`.
- Log in with a non-ADMIN account if available and confirm "Colaboradores" is not listed.

- [ ] **Step 8: Commit**

```bash
git add "app/(admin)/menu.tsx" "app/(admin)/perfil.tsx" "app/(admin)/ajuda.tsx" "app/(admin)/sobre.tsx" "app/(admin)/_layout.tsx"
git commit -m "feat(menu): re-skin menu with user header and add perfil/ajuda/sobre screens"
```

---

## Final full-suite verification (after all 7 tasks)

- [ ] Run `npm run validate` (typecheck + lint + doctor) — must pass with zero errors.
- [ ] Run `npm run test` — all existing and new Vitest suites must pass.
- [ ] Manual end-to-end pass on `npm run web`: login (with and without "Lembrar acesso"), logout, navigate all 5 tabs, open at least one restyled modal on a narrow viewport, open all 3 new Menu destination screens.

## Pendências a reportar ao final (carried over from the spec, do not attempt to build)

- No password-reset endpoint exists in the backend — "Esqueci minha senha" only shows contact instructions.
- No notifications endpoint exists in the backend — omitted from the Menu.
- No licensed gaúcho-horseman illustration asset is available — the login hero uses the existing logo/wordmark instead of the prototype's background art.
