# Reorganização de pastas — Fase 1: fundação (core/ + shared/) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move genuinely shared/infrastructural code out of `src/components|services|hooks|types|utils|config` into `src/core/` and `src/shared/`, delete dead files and empty folders, and fix every import that breaks — without touching `app/` routes or any domain-specific code (agent, dashboard, documents, events, payments, sales, and all `*.service.ts` files stay exactly where they are).

**Architecture:** This is a mechanical file-move + import-fix refactor, not new feature work. Each task: `git mv` the files, fix the moved files' own internal imports, then fix every external importer with a scripted search-and-replace (exact `sed` commands given per task — every import path in this plan was verified against the current codebase with `grep`, not guessed). Tasks are ordered so each one is independently typecheck/lint/test-clean before its commit — no task depends on a later task's paths existing. After each task: `npm run typecheck`, `npm run lint`, `npm run test`, then commit. Full `npm run validate` (adds `expo-doctor`) runs once at the end of the whole plan (final task) since it's slow and doesn't change based on internal moves.

**Tech Stack:** Expo Router (file-based, untouched), TypeScript path alias `@/*` → `./src/*` (unchanged), Vitest, ESLint.

**Spec:** `docs/superpowers/specs/2026-08-24-reorg-fundacao-core-shared-design.md`

## Global Constraints

- `app/` is not modified in any task except import-path fixes inside existing `.tsx` files — no file in `app/` is renamed, moved, or created.
- No new npm dependencies. No changes to `tsconfig.json` / `babel.config.js` (the existing `@/*` alias already resolves `@/core/...` and `@/shared/...`).
- Domain-specific code stays put: `src/components/{agent,dashboard,documents,events,payments,sales}/`, all `src/services/*.service.ts` (except `api.ts`), `src/stores/`, `src/theme/`, `src/validation/`.
- Use `git mv` (not delete+recreate) for every move, to preserve file history.
- After every task: run `npm run typecheck && npm run lint && npm run test` before committing. If anything fails, fix it before moving to the next task — do not carry a broken build forward.
- All `sed` commands below run from the repo root in Git Bash and use `#` as the delimiter (paths contain `/`).

---

### Task 0: Commit current WIP before touching anything

The repo has uncommitted changes to `agente-ia.tsx`, `dashboard.tsx`, and agent/dashboard components (some deleted) predating this reorg. These must be committed separately so the reorg's history stays clean and reviewable.

**Files:** none created — this commits existing working-tree changes as-is.

- [ ] **Step 1: Review what's currently dirty**

```bash
git status --short
git diff --stat
```

Confirm the changes are limited to `app/(admin)/agente-ia.tsx`, `app/(admin)/dashboard.tsx`, `src/components/agent/AgentStatusHeader.tsx`, deletions of `src/components/agent/CanaisTab.tsx`, `src/components/agent/ConfiguracoesTab.tsx`, `src/components/dashboard/AgentTeaserCard.tsx`, and `src/components/ui.tsx`. If there's anything else unexpected, stop and ask before committing.

- [ ] **Step 2: Commit it**

```bash
git add -A -- app/'(admin)'/agente-ia.tsx app/'(admin)'/dashboard.tsx src/components/agent src/components/dashboard src/components/ui.tsx
git commit -m "$(cat <<'EOF'
wip(ia): módulo agente IA em andamento

Commit isolado do trabalho em progresso no módulo de IA, separado da
reorganização de pastas que vem em seguida.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git status --short
```

Expected: `git status --short` now only shows the untracked `.agents/skills/...` and `.claude/skills/...` entries (unrelated skill installs) plus `package-lock.json`/`package.json`/`skills-lock.json` if those were already modified — nothing from `app/` or `src/components`.

---

### Task 1: Housekeeping — dead files, empty folders, build artifacts

**Files:**
- Delete: `dist/`, `dist-pdf-check/`, `dist-validation-audit/`, `dist-video-review/` (repo root)
- Delete: `src/data/` (empty directory)
- Delete: `src/components/layout/AppScreen.tsx`, `src/components/layout/ResponsiveContainer.tsx` (dead re-export shims — `grep` confirms nothing imports `@/components/layout/*`; the real `AppScreen`/`ResponsiveContainer` live in `src/components/ui.tsx` and everything imports them from there)
- Delete: `src/components/ui/AppModal.tsx` (dead re-export shim — nothing imports `@/components/ui/AppModal`, only `@/components/ui`)
- Delete: `src/components/navigation/AppNavigation.tsx` (dead file — nothing imports it; `Sidebar`/`BottomTabs` are used directly by `AppScreen` in `ui.tsx`)
- Modify: `.gitignore`

- [ ] **Step 1: Remove build artifact folders from the repo root**

```bash
git rm -r --cached --ignore-unmatch dist dist-pdf-check dist-validation-audit dist-video-review 2>/dev/null
rm -rf dist dist-pdf-check dist-validation-audit dist-video-review
```

- [ ] **Step 2: Broaden `.gitignore` to cover all `dist*` variants**

In `.gitignore`, replace:
```
dist/
dist-test*/
dist-validation*/
```
with:
```
dist*/
```

- [ ] **Step 3: Remove the empty `src/data/` directory**

```bash
rmdir src/data
```

- [ ] **Step 4: Delete the four confirmed-dead files**

```bash
git rm src/components/layout/AppScreen.tsx src/components/layout/ResponsiveContainer.tsx
git rm src/components/ui/AppModal.tsx
git rm src/components/navigation/AppNavigation.tsx
rmdir src/components/layout src/components/ui 2>/dev/null || true
```

(`src/components/ui/` will be empty after this — that's fine, Task 4 recreates it with real content. If `rmdir` fails because the folder isn't empty, list it and stop — that means something wasn't accounted for.)

- [ ] **Step 5: Verify nothing references the deleted files**

```bash
grep -rn "components/layout\|components/ui/AppModal\|navigation/AppNavigation" app src --include=*.ts --include=*.tsx
```

Expected: no output. If anything shows up, investigate before proceeding (this plan's earlier research found zero references, but re-verify against current state).

- [ ] **Step 6: Validate and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A -- dist dist-pdf-check dist-validation-audit dist-video-review .gitignore src/data src/components/layout src/components/ui src/components/navigation/AppNavigation.tsx
git commit -m "$(cat <<'EOF'
chore(cleanup): remove build artifacts and dead re-export shims

dist*/ folders don't belong in the repo; broaden .gitignore to catch
all variants. src/components/layout/*, src/components/ui/AppModal.tsx
and src/components/navigation/AppNavigation.tsx were unused re-export
shims — everything already imports the real implementations from
src/components/ui.tsx directly. src/data/ was an empty leftover folder.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `src/core/` — api client, auth storage, env config

**Files:**
- Create: `src/core/storage/authStorage.ts`
- Move: `src/services/api.ts` → `src/core/api/client.ts`
- Move: `src/config/app.config.ts` → `src/core/config/env.ts`
- Modify: `src/services/auth.service.ts`
- Modify (import path only, via `sed`, listed in Step 5): 23 other `src/services/*.service.ts` and `*.service.test.ts` files that import `from './api'`

**Interfaces:**
- Produces: `src/core/storage/authStorage.ts` exports `getAuthToken(): Promise<string | null>`, `saveAuthToken(token?: string | null): Promise<void>`, `getStoredUser(): Promise<SessionUser | null>`, `saveStoredUser(user: SessionUser | null): Promise<void>`, `clearAuthStorage(): Promise<void>`.
- Produces: `src/core/api/client.ts` exports `api`, `unwrapData<T>(payload: unknown): T`, `resolveApiUrl()` — same names as before, just a new location.
- Produces: `src/core/config/env.ts` exports `PRODUCTION_API_URL`, `API_URL`, `AUTH_USER_STORAGE_KEY`, `AUTH_TOKEN_STORAGE_KEY` — unchanged names/values.

- [ ] **Step 1: Move `app.config.ts` first (nothing else in this task depends on its old path except the two files being edited directly)**

```bash
mkdir -p src/core/config
git mv src/config/app.config.ts src/core/config/env.ts
rmdir src/config 2>/dev/null || true
```

- [ ] **Step 2: Create `src/core/storage/authStorage.ts`**

This consolidates the `Platform.OS === 'web' ? AsyncStorage : SecureStore` branch that today lives inline in `services/api.ts`, plus the `AUTH_USER_STORAGE_KEY` read/write that today lives inline in `services/auth.service.ts` (both are cleared together by `clearAuthStorage`, so they belong together).

```bash
mkdir -p src/core/storage
```

Create `src/core/storage/authStorage.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from '@/core/config/env';
import type { SessionUser } from '@/types/entities';

export async function getAuthToken() {
  return Platform.OS === 'web'
    ? AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    : SecureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY);
}

export async function saveAuthToken(token?: string | null) {
  if (!token) {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    else await SecureStore.deleteItemAsync(AUTH_TOKEN_STORAGE_KEY);
    return;
  }
  if (Platform.OS === 'web') await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  else await SecureStore.setItemAsync(AUTH_TOKEN_STORAGE_KEY, token);
}

export async function getStoredUser(): Promise<SessionUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
  return raw ? JSON.parse(raw) as SessionUser : null;
}

export async function saveStoredUser(user: SessionUser | null) {
  if (!user) {
    await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export async function clearAuthStorage() {
  await Promise.all([saveAuthToken(null), saveStoredUser(null)]);
}
```

Note: `@/types/entities` is not moved in this task — it moves to `@/shared/types` in Task 3, which runs right after this one and includes a global `sed` pass over all of `src/` (including this new file). Leave the import as `@/types/entities` here; Task 3 rewrites it automatically.

- [ ] **Step 2b: Write a smoke test for the new module**

Create `src/core/storage/authStorage.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { clearAuthStorage, getAuthToken, getStoredUser, saveAuthToken, saveStoredUser } from './authStorage';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn()
}));

describe('authStorage on native (SecureStore)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  it('lê o token do SecureStore', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue('token-123');
    await expect(getAuthToken()).resolves.toBe('token-123');
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('salva o token no SecureStore', async () => {
    await saveAuthToken('token-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('@cg_admin_token', 'token-123');
  });

  it('remove o token do SecureStore quando salvo sem valor', async () => {
    await saveAuthToken(null);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('@cg_admin_token');
  });
});

describe('authStorage on web (AsyncStorage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  it('lê o token do AsyncStorage', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('token-456');
    await expect(getAuthToken()).resolves.toBe('token-456');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('salva o token no AsyncStorage', async () => {
    await saveAuthToken('token-456');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cg_admin_token', 'token-456');
  });
});

describe('usuário armazenado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna null quando não há usuário salvo', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await expect(getStoredUser()).resolves.toBeNull();
  });

  it('retorna o usuário salvo desserializado', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify({ id: '1', name: 'Ana' }));
    await expect(getStoredUser()).resolves.toEqual({ id: '1', name: 'Ana' });
  });

  it('salva o usuário serializado', async () => {
    await saveStoredUser({ id: '1', name: 'Ana' } as never);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cg_admin_user', JSON.stringify({ id: '1', name: 'Ana' }));
  });

  it('remove o usuário quando salvo com null', async () => {
    await saveStoredUser(null);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_user');
  });
});

describe('clearAuthStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  it('limpa token e usuário', async () => {
    await clearAuthStorage();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_user');
  });
});
```

- [ ] **Step 3: Run the new test to verify it passes**

```bash
npx vitest run src/core/storage/authStorage.test.ts
```

Expected: all cases PASS. If `Platform.OS` can't be reassigned this way in this RN/vitest setup, check how existing tests mock `Platform.OS` (search `Platform.OS` in other `*.test.ts` files) and match that pattern instead.

- [ ] **Step 4: Move `api.ts` to `core/api/client.ts` and rewire it onto `authStorage`**

```bash
mkdir -p src/core/api
git mv src/services/api.ts src/core/api/client.ts
```

Edit `src/core/api/client.ts`: replace the whole file with the same axios setup, but delegate token/user storage to `authStorage.ts` instead of touching `AsyncStorage`/`SecureStore` directly:

```typescript
import { AxiosError, create, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';

import { API_URL } from '@/core/config/env';
import { clearAuthStorage, getAuthToken } from '@/core/storage/authStorage';

const DEFAULT_TIMEOUT = 15000;

export function resolveApiUrl() {
  return API_URL;
}

export const api = create({
  baseURL: resolveApiUrl(),
  timeout: DEFAULT_TIMEOUT,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Axios/the browser must generate multipart Content-Type with its boundary.
  // Otherwise the JSON default prevents the API from receiving the files.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  const token = await getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    const status = error.response?.status;
    const isConnectionError = !error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';

    if (status === 401) {
      await clearAuthStorage();
      router.replace('/login');
    }

    let message = error.response?.data?.message || error.response?.data?.error || error.message || 'Erro ao conectar com a API.';
    if (isConnectionError) {
      message = 'Não foi possível conectar ao servidor. Verifique se a API está rodando ou se o CORS permite esta origem.';
    } else if (status === 401) {
      message = 'Sessão expirada. Faça login novamente.';
    } else if (status === 403) {
      const originRejected = /origin|origem|trusted/i.test(message);
      message = originRejected
        ? 'Esta origem local ainda não foi liberada no backend. Adicione http://localhost:8081 em AUTH_TRUSTED_ORIGINS e refaça o deploy.'
        : 'Você não tem permissão para acessar este recurso.';
    } else if (status === 404) {
      message = message || 'Recurso não encontrado na API.';
    } else if (status && status >= 500) {
      message = 'Falha interna do servidor. Verifique os logs da API.';
    }

    return Promise.reject({
      status,
      message,
      code: error.code
    });
  }
);

export function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
```

(`saveAuthToken`/`clearAuthStorage` are no longer re-exported from here — callers now import them from `@/core/storage/authStorage` directly. Step 6 fixes the one caller, `auth.service.ts`.)

- [ ] **Step 5: Global find-and-replace — every service importing `from './api'` now imports `from '@/core/api/client'`**

```bash
grep -rl "'\./api'" src/services --include=*.ts | xargs sed -i "s#'\./api'#'@/core/api/client'#g"
```

Verify:
```bash
grep -rln "'\./api'" src/services --include=*.ts
grep -rln "'@/core/api/client'" src/services --include=*.ts | wc -l
```

Expected: first command outputs nothing (no more references to the old relative path); second command outputs `24`.

- [ ] **Step 6: Rewire `auth.service.ts` onto `authStorage` and the new client path**

`src/services/auth.service.ts` currently does `AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, ...)` and `AsyncStorage.getItem(AUTH_USER_STORAGE_KEY, ...)` directly, and imports `clearAuthStorage`/`saveAuthToken` from `./api` (now `@/core/api/client`, which no longer exports them). Replace the whole file:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearAuthStorage, getStoredUser, saveAuthToken, saveStoredUser } from '@/core/storage/authStorage';
import { api, unwrapData } from '@/core/api/client';
import type { AuthSession, SessionUser } from '@/types/entities';

export async function login(email: string, password: string) {
  const response = await api.post('/auth/sign-in/email', { email, password });
  const session = unwrapData<AuthSession>(response.data);
  const token = response.headers['set-auth-token'] ?? session.token ?? (response.data as { token?: string })?.token;
  await saveAuthToken(token);
  if (session.user) await saveStoredUser(session.user);
  return session;
}

export async function logout() {
  try {
    await api.post('/auth/sign-out');
  } finally {
    await clearAuthStorage();
  }
}

export async function getSession() {
  const response = await api.get('/auth/get-session');
  return unwrapData<AuthSession>(response.data);
}

export async function getMe() {
  const session = await getSession();
  return session.user as SessionUser | undefined;
}

export { getStoredUser };

export async function clearBusinessStorage() {
  await AsyncStorage.multiRemove([
    '@cg_colaboradores',
    '@cg_alunos',
    '@cg_pagamentos',
    '@cg_cortesias',
    '@cg_configuracoes',
    '@cg_validacoes'
  ]);
}
```

`AUTH_USER_STORAGE_KEY` is no longer used directly here (moved into `authStorage.ts`) — its import is dropped entirely. `AsyncStorage` is still needed for `clearBusinessStorage`'s unrelated keys, so its import stays.

- [ ] **Step 7: Fix the 5 test files that mock `'./api'`**

```bash
grep -rl "vi.mock('\./api'" src/services --include=*.test.ts | xargs sed -i "s#vi.mock('\./api'#vi.mock('@/core/api/client'#g"
```

Verify:
```bash
grep -rn "vi.mock(" src/services/agent.service.test.ts src/services/pagamentos.service.test.ts src/services/people.service.test.ts src/services/sales.service.test.ts src/services/uploads.service.test.ts
```

Expected: each shows `vi.mock('@/core/api/client', ...)`.

- [ ] **Step 8: Fix `@/config/app.config` references (the 2 files that used it directly are now moot after Steps 4/6 rewired them onto `@/core/config/env`, but confirm nothing else references the old path)**

```bash
grep -rn "@/config/app.config" app src --include=*.ts --include=*.tsx
```

Expected: no output.

- [ ] **Step 9: Run the full check and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A -- src/core src/services src/config
git commit -m "$(cat <<'EOF'
refactor(core): move api client, auth storage and env config to src/core

Consolidates the Platform.OS (SecureStore vs AsyncStorage) branching
for auth token/user into src/core/storage/authStorage.ts — previously
inlined only in api.ts, now the single source of truth auth.service.ts
also uses. api.ts becomes core/api/client.ts, app.config.ts becomes
core/config/env.ts. No behavior change; all 24 services updated to
import the client from its new path.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `src/shared/hooks/`, `src/shared/utils/`, `src/shared/types/`

These three move before the UI/navigation/crud layers (Task 4, Task 5) because those layers depend on `@/hooks/useResponsive` and `@/types/*` — moving hooks/utils/types first means every later task lands typecheck-clean on the first try, with no forward references to not-yet-created paths.

**Files:**
- Move: `src/hooks/useApiQuery.ts`, `src/hooks/useResponsive.ts` → `src/shared/hooks/`
- Move: `src/utils/*.ts` (8 files) → `src/shared/utils/`
- Move: `src/types/*.ts` (4 files) → `src/shared/types/`
- Modify (import path only, via `sed`): every file importing `@/hooks/`, `@/utils/`, or `@/types`

- [ ] **Step 1: Move the three directories wholesale**

```bash
mkdir -p src/shared/hooks src/shared/utils src/shared/types
git mv src/hooks/useApiQuery.ts src/shared/hooks/useApiQuery.ts
git mv src/hooks/useResponsive.ts src/shared/hooks/useResponsive.ts
for f in src/utils/*.ts; do git mv "$f" "src/shared/utils/$(basename "$f")"; done
for f in src/types/*.ts; do git mv "$f" "src/shared/types/$(basename "$f")"; done
rmdir src/hooks src/utils src/types 2>/dev/null || true
```

- [ ] **Step 2: Global find-and-replace for all three prefixes (covers `src/core/storage/authStorage.ts` and `src/services/auth.service.ts` from Task 2 too)**

```bash
grep -rl "@/hooks/" app src --include=*.ts --include=*.tsx | xargs -r sed -i "s#@/hooks/#@/shared/hooks/#g"
grep -rl "@/utils/" app src --include=*.ts --include=*.tsx | xargs -r sed -i "s#@/utils/#@/shared/utils/#g"
grep -rlE "@/types['\"/]" app src --include=*.ts --include=*.tsx | xargs -r sed -i -E "s#@/types(['\"/])#@/shared/types\1#g"
```

(The `@/types` pattern is written to match `@/types'` (bare import of the index), `@/types/entities'`, `@/types/agent'`, `@/types/api'` — i.e. `@/types` followed by a quote or a slash — so it doesn't accidentally touch an unrelated identifier that merely starts with the same characters.)

- [ ] **Step 3: Verify no old references remain**

```bash
grep -rn "'@/hooks/\|'@/utils/" app src --include=*.ts --include=*.tsx
grep -rnE "'@/types(['\"/])" app src --include=*.ts --include=*.tsx | grep -v "@/shared/types"
```

Expected: no output from either command.

- [ ] **Step 4: Confirm internal cross-references inside the moved files are still correct**

```bash
grep -n "^import" src/shared/hooks/*.ts src/shared/utils/*.ts src/shared/types/*.ts
```

Every `@/...` import in that output should now start with `@/shared/`, `@/theme/`, or `@/validation/` (relative imports within the same folder, e.g. one util importing another via `./format`, are untouched and still correct since they moved together).

- [ ] **Step 5: Run checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A -- src/shared/hooks src/shared/utils src/shared/types src/hooks src/utils src/types app src/core src/services
git commit -m "$(cat <<'EOF'
refactor(shared): move hooks, utils and types into src/shared

src/hooks -> src/shared/hooks, src/utils -> src/shared/utils,
src/types -> src/shared/types. No behavior or content change, only
import paths. Moved ahead of the UI/navigation/crud layers because
those depend on useResponsive and shared types.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `src/shared/components/ui/` + `src/shared/components/navigation/`

`ui.tsx` imports `Sidebar`/`BottomTabs` from `components/navigation`, and `OptionGroupScreen` (a navigation component) imports `Header`/`Screen` from `ui.tsx` — they're mutually dependent, so they move together in one task with one validation pass.

**Files:**
- Move: `src/components/ui.tsx` → `src/shared/components/ui/index.tsx`
- Move: `src/components/navigation/Sidebar.tsx`, `BottomTabs.tsx`, `SidebarAccordion.tsx`, `OptionGroupScreen.tsx` → `src/shared/components/navigation/`
- Move: `src/navigation.config.ts` → `src/shared/components/navigation/navigation.config.ts`
- Modify (import path only, via `sed`): 28 files importing `@/components/ui`, plus `app/(admin)/cadastros.tsx` and the moved files' own cross-references

- [ ] **Step 1: Move `ui.tsx`**

```bash
mkdir -p src/shared/components/ui
git mv src/components/ui.tsx src/shared/components/ui/index.tsx
```

- [ ] **Step 2: Move the navigation files**

```bash
mkdir -p src/shared/components/navigation
git mv src/components/navigation/Sidebar.tsx src/shared/components/navigation/Sidebar.tsx
git mv src/components/navigation/BottomTabs.tsx src/shared/components/navigation/BottomTabs.tsx
git mv src/components/navigation/SidebarAccordion.tsx src/shared/components/navigation/SidebarAccordion.tsx
git mv src/components/navigation/OptionGroupScreen.tsx src/shared/components/navigation/OptionGroupScreen.tsx
git mv src/navigation.config.ts src/shared/components/navigation/navigation.config.ts
rmdir src/components/navigation 2>/dev/null || true
```

- [ ] **Step 3: Fix `ui/index.tsx`'s own imports of navigation (hooks were already fixed by Task 3's global pass — confirm)**

```bash
grep -n "^import" src/shared/components/ui/index.tsx
```

Expected: the `useResponsive` line already reads `@/shared/hooks/useResponsive` (Task 3 rewrote it). Now fix the two navigation lines, which Task 3 didn't touch:

```bash
sed -i \
  -e "s#@/components/navigation/Sidebar#@/shared/components/navigation/Sidebar#" \
  -e "s#@/components/navigation/BottomTabs#@/shared/components/navigation/BottomTabs#" \
  src/shared/components/ui/index.tsx
```

- [ ] **Step 4: Fix every external importer of `@/components/ui`**

```bash
grep -rl "'@/components/ui'" app src --include=*.ts --include=*.tsx | xargs sed -i "s#'@/components/ui'#'@/shared/components/ui'#g"
```

Verify:
```bash
grep -rln "'@/components/ui'" app src --include=*.ts --include=*.tsx
grep -rln "'@/shared/components/ui'" app src --include=*.ts --include=*.tsx | wc -l
```

Expected: first command outputs nothing; second outputs `28` (this count includes `OptionGroupScreen.tsx`, which is one of the moved navigation files and imports `Header, Screen` from here).

- [ ] **Step 5: Fix `@/navigation.config` references everywhere**

```bash
grep -rl "'@/navigation.config'" app src --include=*.ts --include=*.tsx | xargs sed -i "s#'@/navigation.config'#'@/shared/components/navigation/navigation.config'#g"
```

Verify:
```bash
grep -rln "'@/navigation.config'" app src --include=*.ts --include=*.tsx
```

Expected: no output.

- [ ] **Step 6: Run checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A -- src/shared/components/ui src/shared/components/navigation src/components/navigation src/components/ui app/'(admin)'/cadastros.tsx
git commit -m "$(cat <<'EOF'
refactor(shared): move ui primitives and navigation into src/shared

src/components/ui.tsx -> src/shared/components/ui/index.tsx,
src/components/navigation/* + src/navigation.config.ts ->
src/shared/components/navigation/. Moved together in one task because
ui.tsx imports Sidebar/BottomTabs and OptionGroupScreen (a navigation
component) imports Header/Screen from ui.tsx. No behavior change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `src/shared/components/feedback/` + `src/shared/components/crud/`

**Files:**
- Move: `src/components/crud/ConfirmModal.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `LoadingState.tsx` → `src/shared/components/feedback/`
- Move: `src/components/crud/ApiRecordScreen.tsx`, `CrudScreen.tsx`, `DataCard.tsx`, `FormModal.tsx` → `src/shared/components/crud/`
- Modify (import path only, via `sed`): every file importing `@/components/crud/<Name>`

- [ ] **Step 1: Move the files into their two destinations**

```bash
mkdir -p src/shared/components/feedback src/shared/components/crud
git mv src/components/crud/ConfirmModal.tsx src/shared/components/feedback/ConfirmModal.tsx
git mv src/components/crud/EmptyState.tsx src/shared/components/feedback/EmptyState.tsx
git mv src/components/crud/ErrorState.tsx src/shared/components/feedback/ErrorState.tsx
git mv src/components/crud/LoadingState.tsx src/shared/components/feedback/LoadingState.tsx
git mv src/components/crud/ApiRecordScreen.tsx src/shared/components/crud/ApiRecordScreen.tsx
git mv src/components/crud/CrudScreen.tsx src/shared/components/crud/CrudScreen.tsx
git mv src/components/crud/DataCard.tsx src/shared/components/crud/DataCard.tsx
git mv src/components/crud/FormModal.tsx src/shared/components/crud/FormModal.tsx
rmdir src/components/crud 2>/dev/null || true
```

- [ ] **Step 2: Fix every importer, one sed pass per moved file name**

```bash
for name in ConfirmModal EmptyState ErrorState LoadingState; do
  grep -rl "@/components/crud/$name'" app src --include=*.ts --include=*.tsx | xargs -r sed -i "s#@/components/crud/$name'#@/shared/components/feedback/$name'#g"
done
for name in ApiRecordScreen CrudScreen DataCard FormModal; do
  grep -rl "@/components/crud/$name'" app src --include=*.ts --include=*.tsx | xargs -r sed -i "s#@/components/crud/$name'#@/shared/components/crud/$name'#g"
done
```

- [ ] **Step 3: Fix cross-references between the moved files themselves**

`ApiRecordScreen.tsx`, `CrudScreen.tsx`, `DataCard.tsx`, `FormModal.tsx` likely import each other and/or `EmptyState`/`ErrorState`/`LoadingState` using relative paths (`./EmptyState`, etc.) — those still resolve correctly if all four crud files stay together and all four feedback files stay together, EXCEPT any crud file that references a feedback file (or vice versa) by relative path, which breaks since they're now in sibling folders. Check:

```bash
grep -n "^import.*from '\./" src/shared/components/crud/*.tsx src/shared/components/feedback/*.tsx
```

For any relative import that crosses from a `crud/` file to a `feedback/` name (or vice versa), replace it with the appropriate `@/shared/components/feedback/<Name>` or `@/shared/components/crud/<Name>` absolute import. If all relative imports stay within the same folder, no change needed.

- [ ] **Step 4: Verify no old references remain**

```bash
grep -rn "@/components/crud" app src --include=*.ts --include=*.tsx
```

Expected: no output.

- [ ] **Step 5: Run checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A -- src/shared/components/feedback src/shared/components/crud src/components/crud app
git commit -m "$(cat <<'EOF'
refactor(shared): split components/crud into feedback/ and crud/

ConfirmModal/EmptyState/ErrorState/LoadingState are generic feedback
UI usable outside the CRUD pattern -> src/shared/components/feedback/.
ApiRecordScreen/CrudScreen/DataCard/FormModal form the coupled generic
CRUD system -> src/shared/components/crud/. No behavior change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Verify the fora-de-escopo boundary held

**Files:** none modified — this is a verification-only task.

- [ ] **Step 1: Confirm `app/` has zero structural changes (only import-line edits)**

```bash
git diff --stat $(git merge-base HEAD main)..HEAD -- app
```

Every changed file under `app/` should show only a handful of changed lines (import statements), never a rename, add, or delete. If any `app/` file was renamed or moved, stop — that violates the approved scope.

- [ ] **Step 2: Confirm domain-specific code is untouched**

```bash
git status --short src/components/agent src/components/dashboard src/components/documents src/components/events src/components/payments src/components/sales src/services
```

Expected: no output (aside from Task 0's already-committed WIP) — none of these were touched by Tasks 1–5, except the 24 `*.service.ts`/`*.service.test.ts` files whose only change is the `./api` → `@/core/api/client` import line from Task 2, and `auth.service.ts`'s rewire in Task 2 Step 6.

- [ ] **Step 3: Confirm no empty directories were left behind**

```bash
find src -type d -empty
```

Expected: no output.

- [ ] **Step 4: Confirm final `src/` top-level shape matches the spec**

```bash
find src -maxdepth 1 -type d | sort
```

Expected exactly: `src/components`, `src/core`, `src/services`, `src/shared`, `src/stores`, `src/theme`, `src/validation`. (`src/services` still exists — it holds all the domain `*.service.ts` files, which is correct per the spec's "fora de escopo" list. `src/data`, `src/hooks`, `src/utils`, `src/types`, `src/config` should all be gone.)

- [ ] **Step 5: Confirm `src/components/` only holds domain-specific folders now**

```bash
find src/components -maxdepth 1
```

Expected: `src/components`, `src/components/agent`, `src/components/dashboard`, `src/components/documents`, `src/components/events`, `src/components/payments`, `src/components/sales`. No `ui.tsx`, `ui/`, `layout/`, `navigation/`, `crud/`.

---

### Task 7: Final full validation

**Files:** none modified.

- [ ] **Step 1: Run the complete validation suite, including `expo-doctor`**

```bash
npm run validate
```

Expected: typecheck, lint, and doctor all pass. `expo-doctor` may flag pre-existing warnings unrelated to this reorg (e.g. dependency version notices) — those are not regressions from this work; only investigate NEW failures that reference moved files or broken imports.

- [ ] **Step 2: Run the full test suite one more time**

```bash
npm run test
```

Expected: all tests pass, including the new `src/core/storage/authStorage.test.ts`.

- [ ] **Step 3: Manual smoke check (per CLAUDE.md guidance to verify UI changes in a browser)**

```bash
npm run web
```

Open the app, log in, and click through: dashboard, one CRUD screen (e.g. `eventos`), the sidebar/bottom-tab navigation, and one modal (e.g. open a form modal from any CRUD screen). Confirm nothing renders broken and there are no red-screen errors in the console — this exercises `shared/components/ui`, `shared/components/navigation`, `shared/components/crud`, `shared/components/feedback`, `core/api/client`, and `core/storage/authStorage` all at once (login exercises the auth storage path end-to-end).

- [ ] **Step 4: Nothing to commit — this task is verification-only.** If Step 1–3 all pass, the fase 1+2 reorg is complete.
