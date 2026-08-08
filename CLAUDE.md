# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Painel administrativo (Expo/React Native + expo-router) do Coração Gaúcho, rodando em web, Android e iOS a partir da mesma base de código. Consome uma API externa (backend em `https://backend-coracaogaucho.vercel.app/api`); não há backend neste repositório.

## Tech Stack

- Expo SDK 57, React Native 0.86, React 19, expo-router (file-based routing)
- TypeScript (strict), path alias `@/*` → `src/*`
- Zustand (estado global), Zod (validação), Axios (HTTP)
- Vitest (testes), ESLint (`eslint-config-expo`)

## Commands

- `npm run start` / `npx expo start` — servidor de desenvolvimento (Metro)
- `npm run web` / `npm run android` / `npm run ios` — abre em uma plataforma específica
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run test` — roda todos os testes (Vitest). Para um arquivo único: `npx vitest run src/services/sales.service.test.ts`
- `npm run doctor` — `expo-doctor`
- `npm run validate` — typecheck + lint + doctor (rodar antes de considerar uma tarefa concluída)
- `npm run build:web` — export web para `dist/`
- `eas build --platform android --profile preview|production` — build nativo (requer `eas login`)

## Architecture

- Rotas em `app/`, roteamento por arquivo (expo-router). Grupo `app/(admin)/` contém as telas autenticadas, montadas como `Tabs` com `tabBarStyle: { display: 'none' }` (a navegação real é feita pelo menu em `components/navigation`, não pela tab bar nativa).
- `app/(admin)/_layout.tsx` é o guard de autenticação e de role: no mount, chama `useAuthStore().loadSession()`; sem sessão válida redireciona para `/login`. Depois disso, restringe rotas por `role` (`ADMIN` | `STAFF` | `CHECKIN`) — ex.: `CHECKIN` só acessa `scanner`/`historico-validacoes`, `STAFF` não acessa `relatorios`. Ao adicionar uma tela nova em `(admin)/`, registrá-la na lista de `Tabs.Screen` desse layout.
- `src/services/api.ts` é o client Axios único (`api`). Injeta o Bearer token automaticamente (SecureStore em Android/iOS, AsyncStorage na web) e trata 401 (limpa storage + redireciona para `/login`) e 403 (mensagem específica para origem não confiável no CORS). Todo novo `*.service.ts` deve importar `api` daqui, nunca instanciar outro client.
- `src/services/*.service.ts` — um arquivo por domínio (vendas, pagamentos, eventos, pessoas, uploads, etc.), cada um encapsulando as chamadas Axios e o unwrap da resposta (`unwrapData`). Testes de service usam `vi.mock('./api')` e ficam ao lado do arquivo (`*.service.test.ts`).
- `src/config/app.config.ts` resolve `API_URL` a partir de `EXPO_PUBLIC_API_URL`, com troca automática `localhost` ⇄ `10.0.2.2` para o emulador Android.
- `src/stores/auth.store.ts` (Zustand) é a única fonte de sessão/role no client — não duplicar estado de auth em componentes.
- `src/hooks/useApiQuery.ts` é o hook padrão para chamadas de leitura (loading/error/refetch); trata 404 com array de fallback como lista vazia sem erro.
- `src/components/crud/` — conjunto genérico (`CrudScreen`, `FormModal`, `DataCard`, `ConfirmModal`, `EmptyState`) usado pelas telas de cadastro simples; `ApiRecordScreen` é a variante que já integra com a API real via `useApiQuery` em vez de estado local.
- `src/components/ui/` — primitivos compartilhados (`Screen`, `Header`, `SearchBar`, `FloatingActionButton`, etc.), reexportados por `@/components/ui`.
- `src/validation/schemas.ts` — schemas Zod compartilhados entre formulários.
- `src/types/entities.ts` — tipos de domínio (Customer, EntityStatus, UserRole, etc.); campos costumam ter variante PT/EN (`nome`/`name`, `telefone`/`phone`) porque a API não normaliza sempre — checar ambos ao consumir.
- `src/theme/` — tokens de cor e tema, usados via `StyleSheet.create` (sem lib de CSS-in-JS).
- `useResponsive` (`src/hooks/useResponsive.ts`) define o número de colunas por breakpoint; usado nas grids de `crud/`.

## Environment Variables

- `EXPO_PUBLIC_API_URL` — URL da API (única var exigida em dev). Copiar `.env.example` para `.env`.
- `EXPO_PUBLIC_USE_MOCKS` — liga/desliga mocks.
- Nos ambientes EAS (`preview`/`production`), essas vars ficam em `eas.json` / `eas env:create`, não no `.env` local.
- Autenticação é via Better Auth no backend (`/api/auth/sign-in/email`); não há fallback mock de admin no client.

## Gotchas

- Web e nativo usam storages diferentes para o token (AsyncStorage vs SecureStore) — sempre checar `Platform.OS` ao mexer em algo relacionado a auth/storage.
- `src/services/documents.service.ts` (gerador de PDF com `pdf-lib`) é pesado e deve ser importado via `import('@/services/documents.service')` dinâmico no ponto de uso (ver `components/sales/SaleDetailsModal.tsx`), nunca no topo estático de uma tela/lista.
- `react-hooks/set-state-in-effect` está desligado no ESLint deste projeto (ver `eslint.config.js`) — não é um erro de lint aqui.
