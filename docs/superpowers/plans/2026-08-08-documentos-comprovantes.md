# Documentos de Comprovante (Inscrição, Ingresso, Cupom) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the 3 documents `painel-admin` already generates (ticket/recibo/ficha) to visually reproduce the official Coração Gaúcho reference (comprovante de inscrição, ingresso de baile with the real event flyer, cupom/comprovante de pagamento), using only data already available on the loaded `Sale`, with a real on-screen QR, a real barcode, and PDF export — no backend changes.

**Architecture:** Frontend-only, single repo (`painel-admin`). No new API calls, no new routes, no new screens. `SaleDetailsModal`'s existing "DOCUMENTOS" tab opens a new full-screen `DocumentPreviewModal` (a React Native `Modal`, not an expo-router route) that renders one of the 3 new document components from the `Sale` object already loaded in the modal. `src/services/documents.service.ts` keeps its exact public API (`downloadSaleDocument`, `viewSaleDocument`, `shareSaleDocument`, `sendDocumentByWhatsApp`, `sendDocumentByEmail`) but its 3 internal PDF builders are rewritten to match the new layout. A hand-written, table-verified Code128 encoder (`src/utils/barcode.ts`) feeds both the on-screen barcode and the PDF barcode from one source of truth. Fields the current data model doesn't carry (dias/horários, modalidades, CNPJ) are simply omitted — never invented, never blocking.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, `pdf-lib`, `qrcode` (both already installed). No new dependencies.

## Global Constraints

- Frontend-only — no backend repo, no new endpoint, no schema change. Anything the API doesn't return today is treated as absent and the corresponding line is omitted, never invented.
- No mock data, no hardcoded nome/CPF/datas/preços/local/curso/evento/código/forma de pagamento — everything renders from `Sale`/`sale.raw.*`, already returned by `sales.service.ts`.
- CPF never appears unmasked in these documents — reuse `maskCpf` from `src/utils/format.ts` unchanged.
- QR/barcode payload = the existing raw code (`getDocumentCode(sale, ticketIndex)`), **not** a URL — this stays compatible with the existing scanner (`POST /admin/scanner/validar` expects `{ codigo }`).
- QR/barcode values are deterministic per ticket/sale — never regenerated differently on re-render.
- Cupom money fields use `sale.valorTotal`/`getReceiptItems(sale)` (already the frozen, historical sale value) — never recompute from the event's current price.
- No new npm dependency. QR stays on `qrcode` (`toDataURL` → `<Image>`), barcode is a self-written Code128-B encoder, PDF stays on `pdf-lib`.
- At most 2 "font" treatments: system default font (screen) + `StandardFonts.Helvetica`/`HelveticaBold` (pdf-lib, PDF) — no new font family, no `expo-font` changes.
- Only one new color token: `gold` in `src/theme/theme.ts`. Every other color reuses existing `colors.*`.
- No route/navigation change, no new screen, no auth change — everything happens inside the existing `SaleDetailsModal` flow.
- Design spec: `docs/superpowers/specs/2026-08-08-documentos-comprovantes-design.md` is the source of truth for visual details.

---

### Task 1: Code128-B barcode encoder

**Files:**
- Create: `src/utils/barcode.ts`
- Test: `src/utils/barcode.test.ts`

**Interfaces:**
- Produces: `encodeCode128B(value: string): { width: number; isBar: boolean }[]` — consumed by Task 4 (on-screen barcode) and Task 12 (PDF barcode).

The width table below is Code Set B of the standard Code 128 symbology (verified against the published symbol table — value = ASCII code point minus 32, each pattern is 6 digits of bar/space widths in modules, alternating starting with a bar; START B = `211214`, STOP = `2331112`).

- [ ] **Step 1: Write the failing tests**

Create `src/utils/barcode.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { encodeCode128B } from './barcode';

describe('encodeCode128B', () => {
  it('starts with the Start-B pattern and ends with the Stop pattern', () => {
    const bars = encodeCode128B('A');
    // Start B "211214" (6) + data symbol "A" (6) + checksum symbol (6) + Stop "2331112" (7)
    expect(bars).toHaveLength(6 + 6 + 6 + 7);
    expect(bars.slice(0, 6).map((bar) => bar.width)).toEqual([2, 1, 1, 2, 1, 4]);
    expect(bars.slice(0, 6).map((bar) => bar.isBar)).toEqual([true, false, true, false, true, false]);
  });

  it('computes the correct mod-103 checksum symbol for a known value', () => {
    // value('A') = 65 - 32 = 33; checksum = (104 + 33*1) % 103 = 34 -> pattern "131123"
    const bars = encodeCode128B('A');
    expect(bars.slice(12, 18).map((bar) => bar.width)).toEqual([1, 3, 1, 1, 2, 3]);
  });

  it('is deterministic for the same input', () => {
    expect(encodeCode128B('CGS-2026-00001')).toEqual(encodeCode128B('CGS-2026-00001'));
  });

  it('rejects characters outside the printable ASCII range supported by Code Set B', () => {
    expect(() => encodeCode128B('café')).toThrow();
  });

  it('rejects an empty value', () => {
    expect(() => encodeCode128B('')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- barcode`
Expected: FAIL — `src/utils/barcode.ts` does not exist yet.

- [ ] **Step 3: Implement the encoder**

Create `src/utils/barcode.ts`:

```ts
// Code 128, Code Set B. Each pattern is 6 module widths (bar,space,bar,space,bar,space);
// START_B and STOP are fixed patterns; the checksum uses the standard mod-103 algorithm.
const CODE128B_PATTERNS: Record<number, string> = {
  0: '212222', 1: '222122', 2: '222221', 3: '121223', 4: '121322', 5: '131222', 6: '122213', 7: '122312', 8: '132212', 9: '221213',
  10: '221312', 11: '231212', 12: '112232', 13: '122132', 14: '122231', 15: '113222', 16: '123122', 17: '123221', 18: '223211', 19: '221132',
  20: '221231', 21: '213212', 22: '223112', 23: '312131', 24: '311222', 25: '321122', 26: '321221', 27: '312212', 28: '322112', 29: '322211',
  30: '212123', 31: '212321', 32: '232121', 33: '111323', 34: '131123', 35: '131321', 36: '112313', 37: '132113', 38: '132311', 39: '211313',
  40: '231113', 41: '231311', 42: '112133', 43: '112331', 44: '132131', 45: '113123', 46: '113321', 47: '133121', 48: '313121', 49: '211331',
  50: '231131', 51: '213113', 52: '213311', 53: '213131', 54: '311123', 55: '311321', 56: '331121', 57: '312113', 58: '312311', 59: '332111',
  60: '314111', 61: '221411', 62: '431111', 63: '111224', 64: '111422', 65: '121124', 66: '121421', 67: '141122', 68: '141221', 69: '112214',
  70: '112412', 71: '122114', 72: '122411', 73: '142112', 74: '142211', 75: '241211', 76: '221114', 77: '413111', 78: '241112', 79: '134111',
  80: '111242', 81: '121142', 82: '121241', 83: '114212', 84: '124112', 85: '124211', 86: '411212', 87: '421112', 88: '421211', 89: '212141',
  90: '214121', 91: '412121', 92: '111143', 93: '111341', 94: '131141', 95: '114113'
};
const START_B = '211214';
const STOP = '2331112';
const START_VALUE = 104;

export type BarcodeBar = { width: number; isBar: boolean };

function patternToBars(pattern: string): BarcodeBar[] {
  return pattern.split('').map((digit, index) => ({ width: Number(digit), isBar: index % 2 === 0 }));
}

export function encodeCode128B(value: string): BarcodeBar[] {
  if (!value.length) throw new Error('Valor vazio para geração de código de barras');
  const values = value.split('').map((char) => {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error(`Caractere não suportado no Code128: "${char}"`);
    return code - 32;
  });

  const checksum = (START_VALUE + values.reduce((sum, symbolValue, index) => sum + symbolValue * (index + 1), 0)) % 103;

  const patterns = [START_B, ...values.map((symbolValue) => CODE128B_PATTERNS[symbolValue]), CODE128B_PATTERNS[checksum], STOP];
  return patterns.flatMap(patternToBars);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- barcode`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/barcode.ts src/utils/barcode.test.ts
git commit -m "feat(documents): add verified Code128-B barcode encoder"
```

---

### Task 2: Add the `gold` color token

**Files:**
- Modify: `src/theme/theme.ts`

**Interfaces:**
- Produces: `colors.gold` — consumed by Tasks 9/12.

- [ ] **Step 1: Add the token**

In `src/theme/theme.ts`, add `gold` to the `colors` object (after `yellow: '#F9A825',`):

```ts
    yellow: '#F9A825',
    gold: '#D4A62A',
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/theme/theme.ts
git commit -m "feat(theme): add gold token for the ingresso document"
```

---

### Task 3: Shared primitives — `DocumentDivider`, `DocumentField`, `DocumentLogo`

**Files:**
- Create: `src/components/documents/shared/DocumentDivider.tsx`
- Create: `src/components/documents/shared/DocumentField.tsx`
- Create: `src/components/documents/shared/DocumentLogo.tsx`

**Interfaces:**
- Produces: `<DocumentDivider variant="solid"|"dashed" color={string} />`, `<DocumentField icon={IconName} label={string} value={string|undefined} textColor={string} mutedColor={string} badgeColor={string} />` (renders nothing when `value` is falsy — this is how missing fields degrade gracefully per the design spec §4.4), `<DocumentLogo size={number} />` — consumed by Tasks 9/10/11.

- [ ] **Step 1: `DocumentDivider`**

Create `src/components/documents/shared/DocumentDivider.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

export function DocumentDivider({ variant = 'solid', color }: { variant?: 'solid' | 'dashed'; color: string }) {
  if (variant === 'dashed') {
    return (
      <View style={styles.dashedRow}>
        {Array.from({ length: 40 }, (_, index) => (
          <View key={index} style={[styles.dash, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }
  return <View style={[styles.solid, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  solid: { height: 1, width: '100%' },
  dashedRow: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', height: 1, width: '100%', gap: 4 },
  dash: { width: 4, height: 1 }
});
```

- [ ] **Step 2: `DocumentField`**

Create `src/components/documents/shared/DocumentField.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function DocumentField({
  icon,
  label,
  value,
  textColor,
  mutedColor,
  badgeColor
}: {
  icon: IconName;
  label: string;
  value?: string | null;
  textColor: string;
  mutedColor: string;
  badgeColor: string;
}) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <MaterialCommunityIcons name={icon} size={16} color="#fff" />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
        <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  body: { flex: 1 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  value: { fontSize: 14, fontWeight: '800', marginTop: 2 }
});
```

- [ ] **Step 3: `DocumentLogo`**

Create `src/components/documents/shared/DocumentLogo.tsx`:

```tsx
import { Image, StyleSheet } from 'react-native';

export function DocumentLogo({ size = 92 }: { size?: number }) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    <Image source={require('../../../../assets/logo-oficial.jpeg')} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} resizeMode="cover" />
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center' }
});
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/documents/shared/DocumentDivider.tsx src/components/documents/shared/DocumentField.tsx src/components/documents/shared/DocumentLogo.tsx
git commit -m "feat(documents): add shared divider/field/logo primitives"
```

---

### Task 4: `DocumentBarcode`

**Files:**
- Create: `src/components/documents/shared/DocumentBarcode.tsx`

**Interfaces:**
- Consumes: `encodeCode128B` (Task 1).
- Produces: `<DocumentBarcode value={string} color={string} backgroundColor={string} height={number} unitWidth={number} orientation="horizontal"|"vertical" />` — consumed by Task 10 (`EventTicketStub`).

- [ ] **Step 1: Implement the component**

Create `src/components/documents/shared/DocumentBarcode.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { encodeCode128B } from '@/utils/barcode';

export function DocumentBarcode({
  value,
  color = '#000000',
  backgroundColor = '#FFFFFF',
  height = 70,
  unitWidth = 2,
  orientation = 'horizontal'
}: {
  value: string;
  color?: string;
  backgroundColor?: string;
  height?: number;
  unitWidth?: number;
  orientation?: 'horizontal' | 'vertical';
}) {
  const bars = encodeCode128B(value);
  return (
    <View style={[styles.wrapper, { backgroundColor }, orientation === 'vertical' && styles.vertical]}>
      <View style={styles.row}>
        {bars.map((bar, index) => (
          <View key={index} style={{ width: bar.width * unitWidth, height, backgroundColor: bar.isBar ? color : backgroundColor }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'flex-start' },
  vertical: { transform: [{ rotate: '90deg' }] },
  row: { flexDirection: 'row' }
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/shared/DocumentBarcode.tsx
git commit -m "feat(documents): add on-screen Code128 barcode renderer"
```

---

### Task 5: Real on-screen `DocumentQRCode` (reusing the existing `qrcode` package)

**Files:**
- Modify: `src/components/documents/DocumentQRCode.tsx`

**Interfaces:**
- Produces: `<DocumentQRCode value={string} size={number} />` — renders a real, scannable QR by calling `qrcode`'s `toDataURL` and displaying it as an `<Image>`, memoized per `value` so the same code is never regenerated. Consumed by Tasks 9/10/11.

- [ ] **Step 1: Replace the placeholder implementation**

Replace the full content of `src/components/documents/DocumentQRCode.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import QRCode from 'qrcode';

const qrCache = new Map<string, string>();

export function DocumentQRCode({ value, size = 90 }: { value: string; size?: number }) {
  const [uri, setUri] = useState<string | null>(qrCache.get(value) ?? null);

  useEffect(() => {
    const cached = qrCache.get(value);
    if (cached) {
      setUri(cached);
      return;
    }
    let active = true;
    QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: 240 }).then((dataUrl) => {
      qrCache.set(value, dataUrl);
      if (active) setUri(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" /> : <ActivityIndicator size="small" />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }
});
```

- [ ] **Step 2: Typecheck (one known failure, resolved in Task 13)**

Run: `npm run typecheck`
Expected: FAIL only where `SaleDetailsModal.tsx` still calls `<DocumentQRCode value={...} label="QR de validação" />` (the `label` prop no longer exists). This call site is replaced wholesale in Task 13 — note it and move on.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/DocumentQRCode.tsx
git commit -m "feat(documents): render a real, memoized QR code instead of a placeholder icon"
```

---

### Task 6: `ScaledDocument` responsive preview container

**Files:**
- Create: `src/components/documents/shared/ScaledDocument.tsx`

**Interfaces:**
- Produces: `<ScaledDocument width={number}>{children}</ScaledDocument>` — centers content and scales it down uniformly to fit the available width, never distorts, never crops. Consumed by Task 11 (`DocumentPreviewModal`).

- [ ] **Step 1: Implement the component**

Create `src/components/documents/shared/ScaledDocument.tsx`:

```tsx
import { useState } from 'react';
import type { LayoutChangeEvent, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export function ScaledDocument({ width, children }: { width: number; children: ReactNode }) {
  const [containerWidth, setContainerWidth] = useState(width);
  const [contentHeight, setContentHeight] = useState(0);
  const scale = Math.min(1, containerWidth / width);

  function onContainerLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function onContentLayout(event: LayoutChangeEvent) {
    setContentHeight(event.nativeEvent.layout.height);
  }

  return (
    <View style={styles.outer} onLayout={onContainerLayout}>
      <View style={{ width, height: contentHeight * scale }}>
        <View onLayout={onContentLayout} style={[styles.content, { width, transform: [{ scale }] }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: '100%', alignItems: 'center' },
  content: { transformOrigin: 'top left' }
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/shared/ScaledDocument.tsx
git commit -m "feat(documents): add ScaledDocument responsive preview container"
```

---

### Task 7: Extend `documentUtils.ts` and `Sale` types with pair/companion and observação info

**Files:**
- Modify: `src/types/entities.ts`
- Modify: `src/components/documents/documentUtils.ts`
- Test: `src/components/documents/documentUtils.test.ts` (new)

**Interfaces:**
- Produces: `RegistrationFields.temPar?: boolean`, `RegistrationFields.parNome?: string`, `EventInfo.observacao?: string` (populated by `getRegistrationFields`/`getEventInfo`), and a new `getReceiptTotals(sale: Sale): { subtotal: number; ajusteLabel: 'Taxa de serviço' | 'Desconto' | null; ajusteValor: number }` — consumed by Task 9 (`CourseRegistrationReceipt`), Task 10 (`PaymentReceipt`), and Task 12 (`createRegistrationPdf`/`createReceiptPdf`). `getReceiptTotals` exists so the subtotal/taxa-ou-desconto math is written exactly once instead of duplicated in the screen component and the PDF builder.

The reference shows "TEM PAR"/"PAR" and an "INFORMAÇÕES IMPORTANTES" box sourced from `evento.observacao` on the comprovante — per design spec §5.1 that box's text must come from the event's real `observacao` field and disappear when empty, never a fixed invented string. The API's `Sale.raw.inscricoes[]` isn't typed with pair info today, even though the underlying inscrição record has it — this task only widens the TypeScript type to describe fields the API may already send (no backend change), and reads them defensively. `getEventInfo` already reads from `sale.raw?.evento`, which is typed to carry `observacao` (see `Evento` type) — this task only forwards it.

- [ ] **Step 1: Write the failing test**

Create `src/components/documents/documentUtils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getEventInfo, getReceiptTotals, getRegistrationFields } from './documentUtils';
import type { Sale } from '@/types/entities';

function buildSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: '1', codigo: 'VEN-1', tipo: 'CURSO', status: 'PAGO', nome: 'Gabriel', cpf: '12000079999',
    quantidade: 1, valorUnitario: 30, valorTotal: 30, desconto: 0, createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  } as Sale;
}

describe('getRegistrationFields pair info', () => {
  it('reports temPar true and the partner name when the inscricao has one', () => {
    const sale = buildSale({ raw: { inscricoes: [{ id: 1, nomePar: 'Maria Silva', semPar: false }] } });
    const fields = getRegistrationFields(sale);
    expect(fields.temPar).toBe(true);
    expect(fields.parNome).toBe('Maria Silva');
  });

  it('reports temPar false when semPar is true or there is no inscricao', () => {
    expect(getRegistrationFields(buildSale({ raw: { inscricoes: [{ id: 1, semPar: true }] } })).temPar).toBe(false);
    expect(getRegistrationFields(buildSale({ raw: undefined })).temPar).toBe(false);
  });
});

describe('getEventInfo observacao', () => {
  it('forwards the event observacao when present', () => {
    const sale = buildSale({ raw: { evento: { id: '1', nome: 'Curso', observacao: 'Apresente este comprovante no primeiro dia de aula.' } } });
    expect(getEventInfo(sale).observacao).toBe('Apresente este comprovante no primeiro dia de aula.');
  });

  it('is undefined when the event has no observacao', () => {
    const sale = buildSale({ raw: { evento: { id: '1', nome: 'Curso' } } });
    expect(getEventInfo(sale).observacao).toBeUndefined();
  });
});

describe('getReceiptTotals', () => {
  it('labels a positive gap between valorTotal and the items subtotal as a service fee', () => {
    const sale = buildSale({ valorTotal: 38.5, raw: { items: [{ description: 'Ingresso', quantity: 1, unitPrice: 35, total: 35 }] } });
    const totals = getReceiptTotals(sale);
    expect(totals.subtotal).toBe(35);
    expect(totals.ajusteLabel).toBe('Taxa de serviço');
    expect(totals.ajusteValor).toBe(3.5);
  });

  it('labels a negative gap as a discount and omits the label when there is no gap', () => {
    expect(getReceiptTotals(buildSale({ valorTotal: 90, raw: { items: [{ description: 'Item', quantity: 1, unitPrice: 100, total: 100 }] } })).ajusteLabel).toBe('Desconto');
    expect(getReceiptTotals(buildSale({ valorTotal: 50, raw: { items: [{ description: 'Item', quantity: 1, unitPrice: 50, total: 50 }] } })).ajusteLabel).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- documentUtils`
Expected: FAIL — `temPar`/`parNome`/`observacao` undefined, `raw.inscricoes[].nomePar`/`semPar` not on the type yet, and `getReceiptTotals` does not exist yet.

- [ ] **Step 3: Widen the `Sale.raw.inscricoes` type**

In `src/types/entities.ts`, update the `inscricoes` field inside `Sale.raw`:

```ts
    inscricoes?: {
      id: string | number;
      status?: string;
      quantidadeParticipantes?: number;
      nomePar?: string;
      semPar?: boolean;
    }[];
```

- [ ] **Step 4: Populate the new fields**

In `src/components/documents/documentUtils.ts`, add to the `EventInfo` type:

```ts
export type EventInfo = {
  name: string;
  category: string;
  lot: string;
  date?: string;
  location: string;
  banner?: string | null;
  observacao?: string;
};
```

In `getEventInfo`, add `observacao` to the returned object:

```ts
    banner: evento?.banner ?? evento?.imagemUrl ?? null,
    observacao: evento?.observacao || undefined
  };
}
```

Add to the `RegistrationFields` type:

```ts
  consent: string;
  signature?: string;
  temPar?: boolean;
  parNome?: string;
};
```

In `getRegistrationFields`, add before the returned object:

```ts
  const inscricao = sale.raw?.inscricoes?.[0];
  const temPar = Boolean(inscricao?.nomePar) && inscricao?.semPar !== true;
```

And add `temPar` and `parNome` to the returned object:

```ts
    responsible: customer?.nome ?? sale.nome,
    temPar,
    parNome: temPar ? inscricao?.nomePar : undefined,
    consent:
```

Add the shared totals helper — export it from `documentUtils.ts` alongside the existing exports:

```ts
export function getReceiptTotals(sale: Sale) {
  const items = getReceiptItems(sale);
  const subtotal = Math.round(items.reduce((acc, item) => acc + item.total, 0) * 100) / 100;
  const ajusteValor = Math.round((sale.valorTotal - subtotal) * 100) / 100;
  const ajusteLabel: 'Taxa de serviço' | 'Desconto' | null = ajusteValor > 0 ? 'Taxa de serviço' : ajusteValor < 0 ? 'Desconto' : null;
  return { subtotal, ajusteLabel, ajusteValor: Math.abs(ajusteValor) };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- documentUtils`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/entities.ts src/components/documents/documentUtils.ts src/components/documents/documentUtils.test.ts
git commit -m "feat(documents): expose pair info and shared receipt totals helper"
```

---

### Task 8: `EventTicket` + `EventTicketStub`

**Files:**
- Create: `src/components/documents/EventTicket/EventTicket.tsx`
- Create: `src/components/documents/EventTicket/EventTicketStub.tsx`
- Create: `src/components/documents/EventTicket/styles.ts`

**Interfaces:**
- Consumes: `Sale`, `getEventInfo`/`getDocumentCode` (existing `documentUtils.ts`), `DocumentQRCode` (Task 5), `DocumentBarcode` (Task 4), `colors`/`colors.gold` (Task 2), `formatCurrencyBRL`/`formatDateTime`/`maskCpf` (existing `format.ts`).
- Produces: `<EventTicket sale={Sale} ticketIndex={number} />`, exported `EVENT_TICKET_WIDTH`/`EVENT_TICKET_HEIGHT` — consumed by Task 11.

- [ ] **Step 1: Styles**

Create `src/components/documents/EventTicket/styles.ts`:

```ts
import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const EVENT_TICKET_MAIN_WIDTH = 560;
export const EVENT_TICKET_STUB_WIDTH = 120;
export const EVENT_TICKET_WIDTH = EVENT_TICKET_MAIN_WIDTH + EVENT_TICKET_STUB_WIDTH;
export const EVENT_TICKET_HEIGHT = 380;

export const styles = StyleSheet.create({
  ticket: { flexDirection: 'row', width: EVENT_TICKET_WIDTH, height: EVENT_TICKET_HEIGHT, backgroundColor: colors.black, borderRadius: 16, overflow: 'hidden' },
  main: { width: EVENT_TICKET_MAIN_WIDTH },
  flyer: { width: '100%', height: 200, backgroundColor: colors.dark },
  flyerFallback: { width: '100%', height: 200, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center', gap: 8 },
  flyerFallbackText: { color: colors.white, fontWeight: '900', fontSize: 20, textAlign: 'center', paddingHorizontal: 16 },
  infoBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  infoCol: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: colors.border },
  infoColLast: { borderRightWidth: 0 },
  infoLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  infoValue: { color: colors.white, fontWeight: '800', fontSize: 14, marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  entranceBox: { flex: 1, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  entranceTitle: { color: colors.black, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  entranceHint: { color: colors.black, fontSize: 10, marginTop: 2 },
  stub: { width: EVENT_TICKET_STUB_WIDTH, borderLeftWidth: 1, borderLeftColor: colors.white, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 20 },
  stubCode: { color: colors.white, fontWeight: '800', fontSize: 13, letterSpacing: 2, transform: [{ rotate: '90deg' }] }
});
```

- [ ] **Step 2: `EventTicketStub`**

Create `src/components/documents/EventTicket/EventTicketStub.tsx`:

```tsx
import { Text, View } from 'react-native';
import { DocumentBarcode } from '../shared/DocumentBarcode';
import { styles } from './styles';

export function EventTicketStub({ codigo }: { codigo: string }) {
  return (
    <View style={styles.stub}>
      <DocumentBarcode value={codigo} orientation="vertical" height={50} unitWidth={1.6} />
      <Text style={styles.stubCode}>{codigo}</Text>
    </View>
  );
}
```

- [ ] **Step 3: `EventTicket`**

Create `src/components/documents/EventTicket/EventTicket.tsx`:

```tsx
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { getDocumentCode, getEventInfo } from '../documentUtils';
import { DocumentQRCode } from '../DocumentQRCode';
import { EventTicketStub } from './EventTicketStub';
import { styles } from './styles';

export function EventTicket({ sale, ticketIndex = 0 }: { sale: Sale; ticketIndex?: number }) {
  const [flyerFailed, setFlyerFailed] = useState(false);
  const event = getEventInfo(sale);
  const codigo = getDocumentCode(sale, ticketIndex);
  const dateParts = formatDateTime(event.date).split(' às ');

  return (
    <View style={styles.ticket}>
      <View style={styles.main}>
        {event.banner && !flyerFailed ? (
          <Image source={{ uri: event.banner }} style={styles.flyer} resizeMode="cover" onError={() => setFlyerFailed(true)} />
        ) : (
          <View style={styles.flyerFallback}>
            <Text style={styles.flyerFallbackText}>{event.name}</Text>
          </View>
        )}

        <View style={styles.infoBar}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>DATA</Text><Text style={styles.infoValue}>{dateParts[0] ?? '-'}</Text></View>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>INÍCIO</Text><Text style={styles.infoValue}>{dateParts[1] ?? '-'}</Text></View>
          <View style={[styles.infoCol, styles.infoColLast]}><Text style={styles.infoLabel}>LOCAL</Text><Text style={styles.infoValue}>{event.location}</Text></View>
        </View>
        <View style={styles.infoBar}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>PORTADOR</Text><Text style={styles.infoValue}>{sale.nome}</Text></View>
          <View style={[styles.infoCol, styles.infoColLast]}><Text style={styles.infoLabel}>CPF</Text><Text style={styles.infoValue}>{maskCpf(sale.cpf)}</Text></View>
        </View>
        <View style={styles.infoBar}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>VALOR</Text><Text style={styles.infoValue}>{formatCurrencyBRL(sale.valorUnitario)}</Text></View>
          <View style={[styles.infoCol, styles.infoColLast]}><Text style={styles.infoLabel}>CÓDIGO DO INGRESSO</Text><Text style={styles.infoValue}>{codigo}</Text></View>
        </View>

        <View style={styles.bottomRow}>
          <DocumentQRCode value={codigo} size={64} />
          <View style={styles.entranceBox}>
            <Text style={styles.entranceTitle}>APRESENTE NA ENTRADA</Text>
            <Text style={styles.entranceHint}>Este QR Code é único e pessoal. Não compartilhe.</Text>
          </View>
        </View>
      </View>

      <EventTicketStub codigo={codigo} />
    </View>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/documents/EventTicket
git commit -m "feat(documents): implement EventTicket with the real event flyer and barcode stub"
```

---

### Task 9: `CourseRegistrationReceipt`

**Files:**
- Create: `src/components/documents/CourseRegistrationReceipt/CourseRegistrationReceipt.tsx`
- Create: `src/components/documents/CourseRegistrationReceipt/styles.ts`

**Interfaces:**
- Consumes: `Sale`, `getEventInfo`/`getRegistrationFields` (Task 7), `DocumentField`/`DocumentLogo`/`DocumentQRCode` (Tasks 3/5), `colors` (Task 2), `formatDateTime`/`maskCpf`.
- Produces: `<CourseRegistrationReceipt sale={Sale} />`, exported `COURSE_RECEIPT_WIDTH = 380` — consumed by Task 11.

- [ ] **Step 1: Styles**

Create `src/components/documents/CourseRegistrationReceipt/styles.ts`:

```ts
import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const COURSE_RECEIPT_WIDTH = 380;

export const styles = StyleSheet.create({
  sheet: { width: COURSE_RECEIPT_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden' },
  header: { paddingTop: 22, paddingHorizontal: 20, alignItems: 'center' },
  title: { fontWeight: '900', fontSize: 22, color: '#111111', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontWeight: '800', fontSize: 14, color: colors.green, marginTop: 4, letterSpacing: 1 },
  logoWrap: { alignItems: 'center', marginVertical: 16 },
  confirmBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.green, paddingVertical: 12, overflow: 'hidden' },
  confirmOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  confirmCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontWeight: '900', color: '#fff', fontSize: 15, letterSpacing: 1 },
  paragraph: { textAlign: 'center', color: '#111111', fontSize: 12.5, marginTop: 12, paddingHorizontal: 20 },
  fields: { paddingHorizontal: 20, marginTop: 14 },
  infoBox: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#F4F4F4', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12 },
  infoTitle: { fontWeight: '800', color: colors.green, fontSize: 12.5, marginBottom: 4 },
  infoText: { color: '#5A5A5A', fontSize: 11.5, lineHeight: 16 },
  qrRow: { alignItems: 'flex-end', paddingHorizontal: 20, marginTop: 14 },
  footer: { backgroundColor: colors.green, paddingVertical: 14, marginTop: 18, overflow: 'hidden' },
  footerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  footerText: { color: '#fff', textAlign: 'center', fontStyle: 'italic', fontSize: 12.5 },
  hearts: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: '#fff' }
});
```

- [ ] **Step 2: Component**

Create `src/components/documents/CourseRegistrationReceipt/CourseRegistrationReceipt.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatDateTime, maskCpf } from '@/utils/format';
import { colors } from '@/theme/colors';
import { getDocumentCode, getEventInfo, getRegistrationFields } from '../documentUtils';
import { DocumentField } from '../shared/DocumentField';
import { DocumentLogo } from '../shared/DocumentLogo';
import { DocumentQRCode } from '../DocumentQRCode';
import { styles } from './styles';

export function CourseRegistrationReceipt({ sale }: { sale: Sale }) {
  const event = getEventInfo(sale);
  const fields = getRegistrationFields(sale);

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={styles.title}>COMPROVANTE DE INSCRIÇÃO</Text>
        <Text style={styles.subtitle}>CURSO DE DANÇAS GAÚCHAS</Text>
        <View style={styles.logoWrap}>
          <DocumentLogo size={130} />
        </View>
      </View>

      <View style={styles.confirmBanner}>
        <View style={styles.confirmOverlay} />
        <View style={styles.confirmCheck}>
          <MaterialCommunityIcons name="check-bold" size={14} color={colors.green} />
        </View>
        <Text style={styles.confirmText}>INSCRIÇÃO CONFIRMADA</Text>
      </View>
      <Text style={styles.paragraph}>Parabéns! Sua inscrição foi realizada com sucesso.</Text>

      <View style={styles.fields}>
        <DocumentField icon="account-outline" label="ALUNO(A)" value={sale.nome} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="card-account-details-outline" label="CPF" value={maskCpf(sale.cpf)} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="school-outline" label="CURSO" value={event.name} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="map-marker-outline" label="LOCAL" value={event.location} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="calendar-blank-outline" label="INÍCIO DAS AULAS" value={event.date ? formatDateTime(event.date) : undefined} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="account-heart-outline" label="TEM PAR" value={fields.temPar ? 'SIM' : 'NÃO'} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="account-multiple-outline" label="PAR" value={fields.parNome} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
      </View>

      {event.observacao ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ INFORMAÇÕES IMPORTANTES</Text>
          <Text style={styles.infoText}>{event.observacao}</Text>
        </View>
      ) : null}

      <View style={styles.qrRow}>
        <DocumentQRCode value={getDocumentCode(sale)} size={84} />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerOverlay} />
        <Text style={styles.footerText}>Coração que dança, tradição que encanta!</Text>
      </View>
      <View style={styles.hearts}>
        <MaterialCommunityIcons name="heart" size={16} color={colors.green} />
        <MaterialCommunityIcons name="heart" size={16} color={colors.red} />
        <MaterialCommunityIcons name="heart" size={16} color={colors.yellow} />
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/CourseRegistrationReceipt
git commit -m "feat(documents): implement CourseRegistrationReceipt matching the reference layout"
```

---

### Task 10: `PaymentReceipt`

**Files:**
- Create: `src/components/documents/PaymentReceipt/PaymentReceipt.tsx`
- Create: `src/components/documents/PaymentReceipt/styles.ts`

**Interfaces:**
- Consumes: `Sale`, `getReceiptItems`/`getReceiptPaymentMethodLabel`/`getDocumentCode`/`getReceiptTotals` (existing + Task 7 `documentUtils.ts`), `DocumentLogo`/`DocumentQRCode`/`DocumentDivider` (Tasks 3/5), `formatCurrencyBRL`/`formatDateTime`.
- Produces: `<PaymentReceipt sale={Sale} title="CUPOM" subtitle="COMPROVANTE DE PAGAMENTO" />`, exported `PAYMENT_RECEIPT_WIDTH = 300` — consumed by Task 11.

This depends on `getReceiptTotals` from Task 7, which centralizes the subtotal/taxa-ou-desconto computation so it isn't duplicated between this screen component and `createReceiptPdf` (Task 12).

- [ ] **Step 1: Styles**

Create `src/components/documents/PaymentReceipt/styles.ts`:

```ts
import { StyleSheet } from 'react-native';

export const PAYMENT_RECEIPT_WIDTH = 300;

export const styles = StyleSheet.create({
  sheet: { width: PAYMENT_RECEIPT_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 4, paddingVertical: 18, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  companyName: { color: '#111111', fontWeight: '900', fontSize: 14 },
  titleBlock: { alignItems: 'center', marginVertical: 10 },
  title: { color: '#111111', fontWeight: '900', fontSize: 20 },
  subtitle: { color: '#111111', fontWeight: '800', fontSize: 11, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  label: { color: '#6B6B6B', fontSize: 10, fontWeight: '700' },
  value: { color: '#111111', fontSize: 10.5, fontWeight: '800' },
  sectionTitle: { color: '#111111', fontWeight: '800', fontSize: 12, marginVertical: 8 },
  itemHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111111', paddingBottom: 4, marginBottom: 4 },
  itemHeaderText: { color: '#111111', fontSize: 9, fontWeight: '800' },
  itemRow: { flexDirection: 'row', marginVertical: 2 },
  itemText: { color: '#111111', fontSize: 10 },
  colDescricao: { flex: 3 },
  colQtd: { flex: 1, textAlign: 'center' },
  colUn: { flex: 1, textAlign: 'center' },
  colUnit: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsBlock: { marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  totalLabel: { color: '#111111', fontSize: 11, fontWeight: '700' },
  totalValue: { color: '#111111', fontSize: 11, fontWeight: '700' },
  grandTotalLabel: { color: '#111111', fontSize: 15, fontWeight: '900' },
  grandTotalValue: { color: '#111111', fontSize: 15, fontWeight: '900' },
  authBlock: { alignItems: 'center', marginTop: 14, marginBottom: 10 },
  authText: { color: '#111111', fontSize: 10, fontWeight: '800' },
  thanksRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  thanksTitle: { color: '#111111', fontSize: 11, fontWeight: '800', flexShrink: 1 },
  thanksSubtitle: { color: '#6B6B6B', fontSize: 10, fontStyle: 'italic', marginTop: 2 },
  hearts: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  spacerSm: { height: 6 }
});
```

- [ ] **Step 2: Component**

Create `src/components/documents/PaymentReceipt/PaymentReceipt.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { colors } from '@/theme/colors';
import { getDocumentCode, getReceiptItems, getReceiptPaymentMethodLabel, getReceiptTotals } from '../documentUtils';
import { DocumentDivider } from '../shared/DocumentDivider';
import { DocumentLogo } from '../shared/DocumentLogo';
import { DocumentQRCode } from '../DocumentQRCode';
import { styles } from './styles';

export function PaymentReceipt({ sale, title = 'CUPOM', subtitle = 'COMPROVANTE DE PAGAMENTO' }: { sale: Sale; title?: string; subtitle?: string }) {
  const items = getReceiptItems(sale);
  const { subtotal, ajusteLabel, ajusteValor } = getReceiptTotals(sale);
  const metodo = getReceiptPaymentMethodLabel(sale);

  return (
    <View style={styles.sheet}>
      <View style={styles.headerRow}>
        <DocumentLogo size={48} />
        <Text style={styles.companyName}>GRUPO DE DANÇAS{'\n'}CORAÇÃO GAÚCHO</Text>
      </View>

      <DocumentDivider variant="solid" color="#111111" />
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.row}><Text style={styles.label}>Nº DO CUPOM</Text><Text style={styles.value}>{sale.codigo}</Text></View>
      <View style={styles.row}><Text style={styles.label}>DATA</Text><Text style={styles.value}>{formatDateTime(sale.createdAt)}</Text></View>
      <View style={styles.row}><Text style={styles.label}>CÓDIGO DO INGRESSO</Text><Text style={styles.value}>{getDocumentCode(sale)}</Text></View>
      <View style={styles.row}><Text style={styles.label}>FORMA DE PAGAMENTO</Text><Text style={styles.value}>{metodo}</Text></View>

      <View style={styles.spacerSm} />
      <DocumentDivider variant="dashed" color={colors.muted} />
      <Text style={styles.sectionTitle}>DADOS DO PARTICIPANTE</Text>
      <View style={styles.row}><Text style={styles.label}>Nome</Text><Text style={styles.value}>{sale.nome}</Text></View>
      <View style={styles.row}><Text style={styles.label}>CPF</Text><Text style={styles.value}>{maskCpf(sale.cpf)}</Text></View>

      <View style={styles.spacerSm} />
      <DocumentDivider variant="dashed" color={colors.muted} />
      <View style={styles.itemHeaderRow}>
        <Text style={[styles.itemHeaderText, styles.colDescricao]}>DESCRIÇÃO</Text>
        <Text style={[styles.itemHeaderText, styles.colQtd]}>QTD</Text>
        <Text style={[styles.itemHeaderText, styles.colUn]}>UN.</Text>
        <Text style={[styles.itemHeaderText, styles.colUnit]}>VL. UNIT.</Text>
        <Text style={[styles.itemHeaderText, styles.colTotal]}>VL. TOTAL</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <Text style={[styles.itemText, styles.colDescricao]}>{item.description}</Text>
          <Text style={[styles.itemText, styles.colQtd]}>{item.quantity}</Text>
          <Text style={[styles.itemText, styles.colUn]}>UN</Text>
          <Text style={[styles.itemText, styles.colUnit]}>{formatCurrencyBRL(item.unitPrice)}</Text>
          <Text style={[styles.itemText, styles.colTotal]}>{formatCurrencyBRL(item.total)}</Text>
        </View>
      ))}

      <View style={styles.totalsBlock}>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>SUBTOTAL</Text><Text style={styles.totalValue}>{formatCurrencyBRL(subtotal)}</Text></View>
        {ajusteLabel ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{ajusteLabel.toUpperCase()}</Text>
            <Text style={styles.totalValue}>{formatCurrencyBRL(ajusteValor)}</Text>
          </View>
        ) : null}
        <DocumentDivider variant="solid" color="#111111" />
        <View style={styles.totalRow}><Text style={styles.grandTotalLabel}>TOTAL</Text><Text style={styles.grandTotalValue}>{formatCurrencyBRL(sale.valorTotal)}</Text></View>
        <View style={styles.spacerSm} />
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Valor pago via {metodo}</Text><Text style={styles.totalValue}>{formatCurrencyBRL(sale.valorTotal)}</Text></View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Troco</Text><Text style={styles.totalValue}>{formatCurrencyBRL(0)}</Text></View>
      </View>

      <View style={styles.authBlock}>
        <Text style={styles.authText}>Autenticação: {`${sale.codigo}|${sale.id}`}</Text>
      </View>

      <View style={styles.thanksRow}>
        <DocumentQRCode value={`${sale.codigo}|${sale.id}`} size={70} />
        <View style={{ flex: 1 }}>
          <Text style={styles.thanksTitle}>Obrigado por prestigiar a cultura gaúcha!</Text>
          <Text style={styles.thanksSubtitle}>Coração que dança,{'\n'}tradição que encanta!</Text>
        </View>
      </View>

      <View style={styles.hearts}>
        <MaterialCommunityIcons name="heart" size={16} color={colors.green} />
        <MaterialCommunityIcons name="heart" size={16} color={colors.red} />
        <MaterialCommunityIcons name="heart" size={16} color={colors.yellow} />
      </View>
    </View>
  );
}
```

Note: `sale.valorTotal` already represents the sale's actual paid total (`getReceiptItems`/`sale.valorTotal` are the frozen values already returned by `sales.service.ts` — never recomputed from the event's current price), matching the design spec's §5.3 requirement.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/PaymentReceipt
git commit -m "feat(documents): implement PaymentReceipt in thermal-receipt style"
```

---

### Task 11: `DocumentPreviewModal`

**Files:**
- Create: `src/components/documents/DocumentPreviewModal.tsx`

**Interfaces:**
- Consumes: `Sale`, `CourseRegistrationReceipt`/`PaymentReceipt`/`EventTicket` + their width exports (Tasks 8/9/10), `ScaledDocument` (Task 6), `getDocumentCode` (existing), the `documents.service.ts` share/download functions (dynamic import, Task 12).
- Produces: `<DocumentPreviewModal visible={boolean} onClose={() => void} sale={Sale} kind={'ticket'|'receipt'|'registration'} />` — consumed by Task 13 (`SaleDetailsModal`).

- [ ] **Step 1: Implement the component**

Create `src/components/documents/DocumentPreviewModal.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Button } from '@/components/ui';
import { colors } from '@/theme/colors';
import type { Sale } from '@/types/entities';
import { CourseRegistrationReceipt } from './CourseRegistrationReceipt/CourseRegistrationReceipt';
import { COURSE_RECEIPT_WIDTH } from './CourseRegistrationReceipt/styles';
import { EventTicket } from './EventTicket/EventTicket';
import { EVENT_TICKET_WIDTH } from './EventTicket/styles';
import { PaymentReceipt } from './PaymentReceipt/PaymentReceipt';
import { PAYMENT_RECEIPT_WIDTH } from './PaymentReceipt/styles';
import { ScaledDocument } from './shared/ScaledDocument';

export type DocumentKind = 'ticket' | 'receipt' | 'registration';

const TITLES: Record<DocumentKind, string> = { ticket: 'Ingresso', receipt: 'Cupom / Comprovante de Pagamento', registration: 'Comprovante de Inscrição' };

export function DocumentPreviewModal({ visible, onClose, sale, kind }: { visible: boolean; onClose: () => void; sale: Sale | null; kind: DocumentKind }) {
  const [ticketIndex, setTicketIndex] = useState(0);
  const ticketCount = Math.max(sale?.raw?.ingressos?.length ?? 0, sale?.raw?.loteIngresso?.tickets?.length ?? 0, 1);

  const width = kind === 'ticket' ? EVENT_TICKET_WIDTH : kind === 'registration' ? COURSE_RECEIPT_WIDTH : PAYMENT_RECEIPT_WIDTH;

  async function handleShare() {
    if (!sale) return;
    const { shareSaleDocument } = await import('@/services/documents.service');
    await shareSaleDocument(sale, kind, ticketIndex);
  }

  async function handleDownload() {
    if (!sale) return;
    const { downloadSaleDocument } = await import('@/services/documents.service');
    await downloadSaleDocument(sale, kind, ticketIndex);
  }

  if (!sale) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>{TITLES[kind]}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar" style={styles.close}>
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {kind === 'ticket' && ticketCount > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ticketSelector}>
            {Array.from({ length: ticketCount }, (_, index) => (
              <TouchableOpacity key={index} onPress={() => setTicketIndex(index)} style={[styles.ticketChip, ticketIndex === index && styles.ticketChipActive]}>
                <Text style={styles.ticketChipText}>Ingresso {index + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <ScrollView contentContainerStyle={styles.scroll}>
          <ScaledDocument width={width}>
            {kind === 'ticket' ? <EventTicket sale={sale} ticketIndex={ticketIndex} /> : null}
            {kind === 'registration' ? <CourseRegistrationReceipt sale={sale} /> : null}
            {kind === 'receipt' ? <PaymentReceipt sale={sale} /> : null}
          </ScaledDocument>
        </ScrollView>

        <View style={styles.actions}>
          <View style={styles.actionItem}><Button title="Compartilhar" tone="green" onPress={handleShare} /></View>
          <View style={styles.actionItem}><Button title="Gerar PDF" tone="dark" onPress={handleDownload} /></View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  ticketSelector: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  ticketChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  ticketChipActive: { borderColor: colors.red },
  ticketChipText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  scroll: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  actionItem: { flex: 1 }
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS — `downloadSaleDocument`/`shareSaleDocument` already have the `(sale, kind, ticketIndex)` signature this component calls; Task 12 only rewrites their internals, not their signature, so no new errors are expected here.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/DocumentPreviewModal.tsx
git commit -m "feat(documents): add full-screen DocumentPreviewModal"
```

---

### Task 12: Rewrite the 3 PDF builders inside `documents.service.ts`

**Files:**
- Modify: `src/services/documents.service.ts`

**Interfaces:**
- Consumes: `Sale`, `getEventInfo`/`getReceiptItems`/`getReceiptPaymentMethodLabel`/`getReceiptTotals`/`getDocumentCode`/`getRegistrationFields` (existing + Task 7 `documentUtils.ts`), `encodeCode128B` (Task 1).
- Produces: same exact public API as before — `downloadSaleDocument(sale, kind, ticketIndex?)`, `viewSaleDocument`, `shareSaleDocument`, `sendDocumentByWhatsApp`, `sendDocumentByEmail`, `SaleDocumentKind` — only the internal `createTicketPdf`/`createReceiptPdf`/`createRegistrationPdf` implementations change. Consumed today by `DocumentPreviewModal` (Task 11).

- [ ] **Step 1: Replace the internal PDF builders**

In `src/services/documents.service.ts`, keep the imports, `cleanFilePart`, `dateParts`, `fitText`, `hashOf`, `embedQr`, `buildDocument`, `base64ToBlob`, `saveNativeFile`, `downloadSaleDocument`, `viewSaleDocument`, `shareSaleDocument`, `sendDocumentByWhatsApp`, `sendDocumentByEmail`, `SaleDocumentKind` exactly as they are. Add the barcode import and a cover-fit image helper, and replace `header`/`footer`/`createTicketPdf`/`createReceiptPdf`/`createRegistrationPdf` (the shared burgundy `header`/`footer` helpers are removed — each document now draws its own header per the reference).

Replace the top of the file's import block. The type-only import (`import type { PDFPage, PDFFont } from 'pdf-lib';`) can safely pull from the real `pdf-lib` package — TypeScript's type resolution is unaffected by the Metro/web bundling issue that forces the ESM-shim import for runtime values. The clipping operator helpers (`pushGraphicsState`/`popGraphicsState`/`clip`/`endPath`/`closePath`/`lineTo`/`moveTo`) are runtime values, so — exactly like `PDFDocument`/`StandardFonts`/`rgb` already are — they must come from the same `pdf-lib/dist/pdf-lib.esm.js` shim, not from `'pdf-lib'` directly:

```ts
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';
// @ts-expect-error entrada ESM usada para evitar problemas do Metro Web
import { PDFDocument, StandardFonts, clip, closePath, endPath, lineTo, moveTo, popGraphicsState, pushGraphicsState, rgb } from 'pdf-lib/dist/pdf-lib.esm.js';
import QRCode from 'qrcode';
import { Linking, Platform } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { getDocumentCode, getEventInfo, getReceiptItems, getReceiptPaymentMethodLabel, getReceiptTotals, getRegistrationFields } from '@/components/documents/documentUtils';
import { encodeCode128B } from '@/utils/barcode';
```

This drops the now-unused `getReceiptStatusLabel` import (the new cupom layout doesn't show a status line) and adds `getReceiptPaymentMethodLabel` and `getReceiptTotals` (Task 7 — used by the new `createReceiptPdf` below, the same helper `PaymentReceipt.tsx` uses, so the subtotal/taxa-ou-desconto math isn't duplicated) and `PDFImage` (typed parameter for the new cover-crop helper).

Add these helpers (after `embedQr`):

```ts
function drawCoverImage(page: PDFPage, image: PDFImage, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x - (drawWidth - width) / 2;
  const drawY = y - (drawHeight - height) / 2;

  page.pushOperators(pushGraphicsState());
  page.pushOperators(moveTo(x, y), lineTo(x + width, y), lineTo(x + width, y + height), lineTo(x, y + height), closePath(), clip(), endPath());
  page.drawImage(image, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
  page.pushOperators(popGraphicsState());
}

function drawBarcode(page: PDFPage, value: string, x: number, y: number, unitWidth: number, height: number, color = rgb(0.04, 0.04, 0.04)) {
  let cursor = x;
  encodeCode128B(value).forEach((bar) => {
    if (bar.isBar) page.drawRectangle({ x: cursor, y, width: bar.width * unitWidth, height, color });
    cursor += bar.width * unitWidth;
  });
}
```

Replace `header`/`footer` and the 3 `createXPdf` functions with:

```ts
async function createTicketPdf(sale: Sale, ticketIndex: number) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([720, 380]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const event = getEventInfo(sale);
  const codigo = getDocumentCode(sale, ticketIndex);
  const qr = await embedQr(pdf, codigo);
  const black = rgb(0.04, 0.04, 0.04);
  const white = rgb(1, 1, 1);
  const gold = rgb(0.831, 0.651, 0.165);
  const muted = rgb(0.6, 0.6, 0.6);

  page.drawRectangle({ x: 0, y: 0, width: 720, height: 380, color: black });

  if (event.banner) {
    try {
      const response = await fetch(event.banner);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const flyer = event.banner.toLowerCase().includes('.png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      drawCoverImage(page, flyer, 0, 180, 560, 200);
    } catch {
      page.drawText(fitText(event.name, 40), { x: 40, y: 280, size: 22, font: bold, color: white });
    }
  } else {
    page.drawText(fitText(event.name, 40), { x: 40, y: 280, size: 22, font: bold, color: white });
  }

  const dp = dateParts(event.date);
  const infoRows: [string, string][] = [['DATA', dp.date], ['INÍCIO', dp.time], ['LOCAL', fitText(event.location, 30)]];
  infoRows.forEach(([label, value], index) => {
    const x = 20 + index * 180;
    page.drawText(label, { x, y: 160, size: 7.5, font: bold, color: muted });
    page.drawText(value, { x, y: 146, size: 11.5, font: bold, color: white });
  });

  page.drawText('PORTADOR', { x: 20, y: 116, size: 7.5, font: bold, color: muted });
  page.drawText(fitText(sale.nome, 30), { x: 20, y: 102, size: 11.5, font: bold, color: white });
  page.drawText('CPF', { x: 300, y: 116, size: 7.5, font: bold, color: muted });
  page.drawText(maskCpf(sale.cpf), { x: 300, y: 102, size: 11.5, font: bold, color: white });

  page.drawText('VALOR', { x: 20, y: 72, size: 7.5, font: bold, color: muted });
  page.drawText(formatCurrencyBRL(sale.valorUnitario), { x: 20, y: 58, size: 11.5, font: bold, color: white });
  page.drawText('CÓDIGO DO INGRESSO', { x: 300, y: 72, size: 7.5, font: bold, color: muted });
  page.drawText(codigo, { x: 300, y: 58, size: 11.5, font: bold, color: white });

  page.drawImage(qr, { x: 20, y: 8, width: 40, height: 40 });
  page.drawRectangle({ x: 76, y: 8, width: 460, height: 40, color: gold });
  page.drawText('APRESENTE NA ENTRADA', { x: 88, y: 32, size: 10, font: bold, color: black });
  page.drawText('Este QR Code é único e pessoal. Não compartilhe.', { x: 88, y: 18, size: 7.5, font: regular, color: black });

  drawBarcode(page, codigo, 610, 60, 1.4, 260, black);
  page.drawText(codigo, { x: 690, y: 60, size: 8, font: bold, color: white });

  return pdf.saveAsBase64();
}

async function createReceiptPdf(sale: Sale) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 620]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const black = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.42, 0.42, 0.42);
  const items = getReceiptItems(sale);
  const { subtotal, ajusteLabel, ajusteValor } = getReceiptTotals(sale);
  const metodo = getReceiptPaymentMethodLabel(sale);
  const codigo = getDocumentCode(sale);
  const qr = await embedQr(pdf, `${sale.codigo}|${sale.id}`);

  page.drawRectangle({ x: 0, y: 0, width: 300, height: 620, color: rgb(1, 1, 1) });
  page.drawText('GRUPO DE DANÇAS', { x: 80, y: 592, size: 10, font: bold, color: black });
  page.drawText('CORAÇÃO GAÚCHO', { x: 80, y: 580, size: 10, font: bold, color: black });

  page.drawText('CUPOM', { x: 118, y: 546, size: 16, font: bold, color: black });
  page.drawText('COMPROVANTE DE PAGAMENTO', { x: 62, y: 530, size: 8.5, font: bold, color: black });

  const dataRows: [string, string][] = [
    ['Nº do cupom', sale.codigo],
    ['Data', formatDateTime(sale.createdAt)],
    ['Código do ingresso', codigo],
    ['Forma de pagamento', metodo]
  ];
  let y = 505;
  dataRows.forEach(([label, value]) => {
    page.drawText(label, { x: 20, y, size: 8, font: regular, color: muted });
    page.drawText(fitText(value, 22), { x: 150, y, size: 8, font: bold, color: black });
    y -= 14;
  });

  y -= 6;
  page.drawText('DADOS DO PARTICIPANTE', { x: 20, y, size: 8.5, font: bold, color: black });
  y -= 14;
  page.drawText('Nome', { x: 20, y, size: 8, font: regular, color: muted });
  page.drawText(fitText(sale.nome, 22), { x: 150, y, size: 8, font: bold, color: black });
  y -= 14;
  page.drawText('CPF', { x: 20, y, size: 8, font: regular, color: muted });
  page.drawText(maskCpf(sale.cpf), { x: 150, y, size: 8, font: bold, color: black });

  y -= 22;
  items.forEach((item) => {
    page.drawText(fitText(item.description, 26), { x: 20, y, size: 8, font: regular, color: black });
    page.drawText(`${item.quantity}x ${formatCurrencyBRL(item.unitPrice)}`, { x: 190, y, size: 7.5, font: regular, color: muted });
    y -= 12;
    page.drawText(formatCurrencyBRL(item.total), { x: 230, y: y + 12, size: 8, font: bold, color: black });
  });

  y -= 8;
  page.drawText('SUBTOTAL', { x: 20, y, size: 9, font: regular, color: black });
  page.drawText(formatCurrencyBRL(subtotal), { x: 220, y, size: 9, font: regular, color: black });
  y -= 14;
  if (ajusteLabel) {
    page.drawText(ajusteLabel.toUpperCase(), { x: 20, y, size: 9, font: regular, color: black });
    page.drawText(formatCurrencyBRL(ajusteValor), { x: 220, y, size: 9, font: regular, color: black });
    y -= 14;
  }
  page.drawText('TOTAL', { x: 20, y, size: 13, font: bold, color: black });
  page.drawText(formatCurrencyBRL(sale.valorTotal), { x: 210, y, size: 13, font: bold, color: black });
  y -= 24;
  page.drawText(`Valor pago via ${metodo}`, { x: 20, y, size: 8.5, font: regular, color: black });
  page.drawText(formatCurrencyBRL(sale.valorTotal), { x: 220, y, size: 8.5, font: regular, color: black });
  y -= 14;
  page.drawText('Troco', { x: 20, y, size: 8.5, font: regular, color: black });
  page.drawText(formatCurrencyBRL(0), { x: 220, y, size: 8.5, font: regular, color: black });

  y -= 26;
  page.drawText(`Autenticação: ${hashOf(`${sale.codigo}${sale.id}receipt`)}`, { x: 20, y, size: 7.5, font: bold, color: black });
  y -= 30;
  page.drawImage(qr, { x: 20, y: y - 70, width: 70, height: 70 });
  page.drawText('Obrigado por prestigiar', { x: 100, y, size: 8.5, font: bold, color: black });
  page.drawText('a cultura gaúcha!', { x: 100, y: y - 12, size: 8.5, font: bold, color: black });
  page.drawText('Coração que dança,', { x: 100, y: y - 28, size: 8, font: regular, color: muted });
  page.drawText('tradição que encanta!', { x: 100, y: y - 40, size: 8, font: regular, color: muted });

  return pdf.saveAsBase64();
}

async function createRegistrationPdf(sale: Sale) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 700]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const black = rgb(0.04, 0.04, 0.04);
  const white = rgb(1, 1, 1);
  const green = rgb(0.18, 0.49, 0.196);
  const muted = rgb(0.35, 0.35, 0.35);
  const event = getEventInfo(sale);
  const fields = getRegistrationFields(sale);
  const qr = await embedQr(pdf, getDocumentCode(sale));

  page.drawRectangle({ x: 0, y: 0, width: 420, height: 700, color: white });
  page.drawText('COMPROVANTE DE INSCRIÇÃO', { x: 40, y: 650, size: 16, font: bold, color: black });
  page.drawText('CURSO DE DANÇAS GAÚCHAS', { x: 40, y: 630, size: 10, font: bold, color: green });

  page.drawRectangle({ x: 0, y: 560, width: 420, height: 34, color: green });
  page.drawText('INSCRIÇÃO CONFIRMADA', { x: 40, y: 572, size: 12, font: bold, color: white });

  const rows: [string, string][] = [
    ['ALUNO(A)', sale.nome],
    ['CPF', maskCpf(sale.cpf)],
    ['CURSO', event.name],
    ['LOCAL', event.location],
    ...(event.date ? [['INÍCIO DAS AULAS', formatDateTime(event.date)] as [string, string]] : []),
    ['TEM PAR', fields.temPar ? 'SIM' : 'NÃO'],
    ...(fields.temPar && fields.parNome ? [['PAR', fields.parNome] as [string, string]] : [])
  ];
  let y = 530;
  rows.forEach(([label, value]) => {
    page.drawText(label, { x: 40, y, size: 8, font: bold, color: muted });
    page.drawText(fitText(value, 40), { x: 40, y: y - 13, size: 11.5, font: bold, color: black });
    y -= 40;
  });

  if (event.observacao) {
    page.drawText('INFORMAÇÕES IMPORTANTES', { x: 40, y: y - 4, size: 9, font: bold, color: green });
    page.drawText(fitText(event.observacao, 90), { x: 40, y: y - 18, size: 8.5, font: regular, color: black, maxWidth: 340, lineHeight: 11 });
  }

  page.drawImage(qr, { x: 300, y: 60, width: 80, height: 80 });
  page.drawRectangle({ x: 0, y: 0, width: 420, height: 40, color: rgb(0.071, 0.29, 0.098) });
  page.drawText('Coração que dança, tradição que encanta!', { x: 60, y: 15, size: 10, font: regular, color: white });

  return pdf.saveAsBase64();
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/documents.service.ts
git commit -m "refactor(documents): redraw the 3 PDF documents to match the reference layout"
```

---

### Task 13: Wire `SaleDetailsModal` to `DocumentPreviewModal`

**Files:**
- Modify: `src/components/sales/SaleDetailsModal.tsx`

**Interfaces:**
- Consumes: `DocumentPreviewModal` (Task 11).
- Removes the inline `TicketCard`/`DocumentHeader`/`ReceiptItems`/`ReceiptTotals`/`RegistrationForm`/`DocumentQRCode`/`DocumentActions` usage inside the "DOCUMENTOS" tab, replacing it with 1-2 buttons that open `DocumentPreviewModal`. Resolves the pending typecheck failure noted in Task 5.

- [ ] **Step 1: Replace the imports**

Replace the import block at the top of `src/components/sales/SaleDetailsModal.tsx` (currently importing `DocumentActions`, `DocumentFooter`, `DocumentHeader`, `DocumentRow`, `DocumentSection`, `DocumentQRCode`, `ReceiptItems`, `ReceiptTotals`, `RegistrationForm`, `TicketCard`, and the `documentUtils` helpers) with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppModal, StatusBadge } from '@/components/ui';
import { colors } from '@/theme/colors';
import { useResponsive } from '@/hooks/useResponsive';
import { getSaleHistory } from '@/services/sales.service';
import type { Pagamento, PaymentHistory, Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import type { DocumentKind } from '@/components/documents/DocumentPreviewModal';
import { getEventInfo } from '@/components/documents/documentUtils';
```

- [ ] **Step 2: Simplify the modal's local state**

Remove the `doc`/`setDoc`, `ticketIndex`/`setTicketIndex`, `fade`, `slide` state and their two `useEffect`s. Add instead:

```tsx
  const [previewKind, setPreviewKind] = useState<DocumentKind | null>(null);
```

Keep `ticketCount`/`eventInfo` as-is (still used elsewhere in the modal); remove `receiptItems`/`registrationFields` if the rest of the file no longer references them after this change (check with a search before deleting).

- [ ] **Step 3: Replace the "DOCUMENTOS" tab body**

Replace the whole `{tab === 'DOCUMENTOS' ? ( ... ) : null}` block with:

```tsx
      {tab === 'DOCUMENTOS' ? (
        <View style={styles.stack}>
          {!['PAGO', 'CORTESIA', 'PARCIALMENTE_ESTORNADO'].includes(sale.status) ? (
            <Empty text="Documentos ficam disponíveis após a confirmação do pagamento." />
          ) : (
            <View style={styles.docLinks}>
              {sale.tipo === 'CURSO' ? (
                <DocLink icon="file-check-outline" title="Comprovante de inscrição" onPress={() => setPreviewKind('registration')} />
              ) : (
                <DocLink icon="ticket-confirmation-outline" title="Ingresso" onPress={() => setPreviewKind('ticket')} />
              )}
              <DocLink icon="receipt-text-outline" title="Cupom / comprovante de pagamento" onPress={() => setPreviewKind('receipt')} />
            </View>
          )}
        </View>
      ) : null}

      <DocumentPreviewModal visible={!!previewKind} onClose={() => setPreviewKind(null)} sale={sale} kind={previewKind ?? 'receipt'} />
```

- [ ] **Step 4: Add the `DocLink` helper**

Below the existing `Empty` function, add:

```tsx
function DocLink({ icon, title, onPress }: { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.docLink} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      <Text style={styles.docLinkText}>{title}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
    </TouchableOpacity>
  );
}
```

- [ ] **Step 5: Add the `docLinks`/`docLink` styles**

In the `StyleSheet.create` block, add:

```ts
  docLinks: { gap: 10 },
  docLink: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14 },
  docLinkText: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 14 },
```

Remove any now-unused styles (`docSwitch`, `docTab`, `docTabActive`, `docTabText`, `ticketSelector`, `ticketChip`, `ticketChipActive`, `docCard`, `docBody`, `twoCols`, `leftCol`, `rightCol`, `qrBox`) if nothing else in the file references them — verify with a search before deleting each.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0 — this resolves the pending failure noted in Task 5.

- [ ] **Step 7: Commit**

```bash
git add src/components/sales/SaleDetailsModal.tsx
git commit -m "refactor(sales): open the new DocumentPreviewModal from SaleDetailsModal"
```

---

### Task 14: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all suites pass, including `barcode.test.ts`, `documentUtils.test.ts`, and every pre-existing suite (`sales.service.test.ts`, `pagamentos.service.test.ts`, `people.service.test.ts`, `uploads.service.test.ts`, `format.test.ts`, `logger.test.ts`).

- [ ] **Step 2: Full typecheck, lint, doctor**

Run: `npm run validate`
Expected: `typecheck`, `lint`, and `expo-doctor` all pass (0 exit code). Fix any remaining issue before proceeding — do not skip.

- [ ] **Step 3: Manual run against real data (web)**

Run: `npm run web`. Log in as STAFF/ADMIN, open `Vendas`, pick a real paid sale of type `CURSO` and open its `SaleDetailsModal` → Documentos → "Comprovante de inscrição": verify aluno/CPF-mascarado/curso/local/início render, "TEM PAR"/"PAR" only appear when the sale actually has a partner, the QR renders as a real scannable pattern (not a placeholder icon), and "Gerar PDF" downloads a file matching the on-screen layout.

- [ ] **Step 4: Manual run against real data (BAILE/EVENTO + cupom)**

Open a real paid `BAILE`/`EVENTO` sale → Documentos → "Ingresso": verify the event's real banner renders full-bleed without distortion (both on screen and in the exported PDF), the info bars show real data, the canhoto shows a real vertical barcode. Then open "Cupom / comprovante de pagamento" for the same sale and a `CURSO` sale: verify subtotal/taxa-ou-desconto/total match `sale.valorTotal` (not the event's current price), and "Compartilhar" opens the native share sheet with the generated PDF.

- [ ] **Step 5: Native smoke test**

Run: `npm run android` (or `npm run ios` if available). Repeat the ingresso and cupom checks from Steps 3-4, confirming `Sharing.shareAsync`/file-write paths work (the web-only `URL.createObjectURL` path must not run on native).

- [ ] **Step 6: Determinism check**

Reload the same sale's document preview twice (close and reopen `DocumentPreviewModal`). Confirm the QR and barcode render identical patterns both times.

- [ ] **Step 7: Grep for leftover mocks**

Run: `grep -rniE "mock(customer|evento|ingresso|pagamento)|const exemplo =" src app || true`
Expected: no matches inside the new/changed document files.

- [ ] **Step 8: Commit (if any fixups were needed)**

```bash
git add -A
git commit -m "fix(documents): address issues found during final verification"
```

(Skip this commit if Steps 1-7 all passed cleanly with no changes.)
