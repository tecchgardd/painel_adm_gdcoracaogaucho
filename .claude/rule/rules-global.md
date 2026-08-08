# Stack

Expo SDK 57 + React Native 0.86 + React 19 + expo-router (roteamento por arquivo). TypeScript strict. Zustand para estado global. Zod para validação. Axios para HTTP. Vitest para testes. Roda em web, Android e iOS a partir da mesma base — nunca usar APIs exclusivas de uma plataforma sem checar `Platform.OS`.

Não há backend neste repositório nem App Router/Server Components/Server Actions — tudo aqui é client-side, consumindo uma API externa via `src/services/*.service.ts`.

# Estrutura Modular

- `app/` — rotas via expo-router (file-based). Grupo `app/(admin)/` são as telas autenticadas.
- `src/components/` — `ui.tsx` (primitivos globais: `Screen`, `Header`, `SearchBar`, `FloatingActionButton`), `ui/` (componentes de UI globais maiores que merecem arquivo próprio, ex.: `AppModal`, `ErrorBoundary`), `crud/` (telas de cadastro genéricas), `navigation/`, `layout/`, e uma pasta por feature (`sales/`, `events/`, `payments/`, ...) para componentes específicos daquele domínio.
- `src/services/` — um arquivo por domínio de API (`sales.service.ts`, `pagamentos.service.ts`, etc.), sempre importando o client único de `src/services/api.ts`.
- `src/stores/` — Zustand. Hoje só existe `auth.store.ts`; é a única fonte de sessão/role.
- `src/hooks/` — hooks compartilhados (`useApiQuery`, `useResponsive`).
- `src/validation/schemas.ts` — schemas Zod compartilhados entre formulários.
- `src/types/` — tipos de domínio (`entities.ts`) e tipos de API (`api.ts`).
- `src/theme/` — tokens de cor/tema.
- `src/config/app.config.ts` — resolução de `API_URL` e chaves de storage.

Business logic (chamadas de API, regras de validação, cálculo) fica em `services/`, `validation/` e `stores/` — nunca dentro de um componente de UI.

# Roteamento (expo-router)

- Rotas autenticadas ficam em `app/(admin)/`. Toda tela nova precisa ser registrada como `Tabs.Screen` em `app/(admin)/_layout.tsx` (a navegação real é feita pelo menu em `components/navigation`, a tab bar nativa fica oculta).
- `app/(admin)/_layout.tsx` é o guard de auth + role: chama `useAuthStore().loadSession()` no mount e redireciona pra `/login` sem sessão; depois restringe rotas por `role` (`ADMIN` | `STAFF` | `CHECKIN`). Ao adicionar uma rota nova com restrição de acesso, atualizar as listas `checkinAllowed`/`staffBlocked` desse arquivo.
- Não criar rotas fora de `app/`; não recriar roteamento manual com estado.

# Componentes: onde colocar

1. **Específico de uma tela/feature** → pasta da feature em `src/components/<feature>/` (ex.: `components/sales/SaleDetailsModal.tsx`).
2. **Reutilizável em múltiplas telas** → `src/components/ui/`. Só promover para lá quando já houver reuso real, não antecipar.
3. **Cadastro simples (lista + form + delete)** → usar o conjunto genérico em `src/components/crud/` (`CrudScreen`, `FormModal`, `DataCard`, `ConfirmModal`, `EmptyState`). Se a tela já integra com a API real (não estado local), usar `ApiRecordScreen` em vez de `CrudScreen`.

Manter componentes pequenos e com responsabilidade única. Preferir hooks (`useApiQuery`, hooks locais) a lógica de fetch/estado espalhada dentro do JSX.

# TypeScript

- Strict habilitado — não usar `any`; preferir `unknown` + type guard.
- Cuidado com dualidade PT/EN nos tipos de domínio (`src/types/entities.ts`): campos como `nome`/`name`, `telefone`/`phone` coexistem porque a API não normaliza sempre — checar os dois antes de assumir qual existe.
- Tipar props, retorno de service e payload de schema Zod (`z.infer<typeof schema>`).

# Naming

- Handlers prefixados com `handle`: `handleSubmit`, `handlePress`.
- Booleans prefixados com verbo: `isLoading`, `hasError`, `canSubmit`.
- Hooks prefixados com `use`: `useApiQuery`, `useResponsive`.
- Nomes de arquivo de componente em PascalCase; services/hooks/stores em camelCase com sufixo do papel (`*.service.ts`, `use*.ts`, `*.store.ts`).

# Imports

- Ordem imposta pelo ESLint (`import/order` em `eslint.config.js`): builtin/external → `@/*` (internal) → relativos (`./`, `../`), com linha em branco entre grupos. Não precisa alfabetizar dentro do grupo à mão.
- Rodar `eslint . --fix` corrige a ordem automaticamente; não reordenar manualmente antes de tentar isso.

# Error Handling

- A árvore de rotas raiz é protegida por `src/components/ui/ErrorBoundary.tsx` (montado em `app/_layout.tsx`), que captura erro de render e mostra um fallback em vez de tela branca. Não criar boundaries locais ad-hoc — só se uma tela específica precisar isolar a falha de um widget isolado (ex.: componente de terceiro).
- Erros de chamada de API (rejeições de `api.ts`) continuam tratados no padrão já existente: capturar `error.message` e renderizar inline (`<Text>`) na tela/modal — não é o Error Boundary que trata isso, ele é só para erro de render/JS não capturado.

# Logging

- Usar `src/utils/logger.ts` (`logger.debug/info/warn/error`) em vez de `console.*` direto. `debug`/`info` são no-op fora de `__DEV__`; `warn`/`error` sempre executam.
- Nunca logar dado sensível (CPF completo, token, senha, payload de auth).
- Crash reporting (Sentry/Crashlytics) ainda não está integrado no projeto. Antes de escalar o app em produção, vale avaliar — mas isso exige conta/DSN próprios do time e mexe em `app.json`/`eas.json` (plugin nativo + upload de source maps no build), então não faça essa integração sem alinhar antes.

# Estilo e Anti-Patterns

- Estilos via `StyleSheet.create` usando tokens de `src/theme/`, sem CSS-in-JS e sem estilo inline solto.
- Evitar componentes monolíticos — quebrar telas grandes em subcomponentes da própria feature.
- `useResponsive` (`numColumns` por breakpoint) é o padrão para grids responsivas (ver `crud/CrudScreen.tsx`); não reimplementar breakpoints manualmente.

# Performance

- Libs pesadas usadas só sob demanda (ex.: `pdf-lib` em `src/services/documents.service.ts`) devem ser carregadas via `import('@/services/...')` dinâmico no ponto de uso, nunca no topo estático de uma tela ou lista — ver `components/sales/SaleDetailsModal.tsx`.
- Evitar recalcular listas filtradas/derivadas sem `useMemo` em telas com grids grandes.

# Forms e Validação

- Não há React Hook Form no projeto — formulários são controlados manualmente (estado local + `onChange`), validados com schemas Zod de `src/validation/schemas.ts` (`schema.safeParse`).
- Toda validação de input do usuário passa por um schema Zod; não validar "na mão" com regex solta fora de `validation/schemas.ts`.

# Camada de Dados / API

- `src/services/api.ts` é o único client Axios (`api`). Todo `*.service.ts` novo importa esse client — nunca instanciar outro Axios/fetch direto num componente.
- Services encapsulam a chamada e o unwrap da resposta com `unwrapData<T>`.
- Leitura de dados em telas usa `useApiQuery` (loading/error/refetch padronizados; 404 com `fallbackData` de array vira lista vazia sem erro) — não replicar esse padrão à mão com `useState`/`useEffect`.

# Autenticação

- Sessão/role vive só em `useAuthStore` (Zustand) — não duplicar estado de auth em componentes.
- Login é via Better Auth no backend (`/api/auth/sign-in/email`); não existe fallback mock de admin no client.
- Token: SecureStore em Android/iOS, AsyncStorage na web — sempre checar `Platform.OS` ao mexer em storage de auth.
- 401 e 403 já são tratados centralmente nos interceptors de `api.ts` (limpa storage + redireciona `/login` no 401); não duplicar esse tratamento em cada service.

# Testes

- Vitest para unitário/integração. Testes de service ficam ao lado do arquivo (`*.service.test.ts`) e mockam o client com `vi.mock('./api')`.
- Rodar um arquivo isolado com `npx vitest run <arquivo>` em vez da suíte inteira durante iteração.
- E2E via Maestro, flows em `.maestro/*.yaml` (CLI standalone, não é dependência do `package.json`). Hoje só o fluxo de login (`.maestro/login.yaml`) está coberto; outros fluxos críticos (venda, checkin) devem ganhar flow próprio conforme a necessidade for surgindo — não é obrigatório cobrir tudo de uma vez.

# Variáveis de Ambiente

- Só `EXPO_PUBLIC_*` (única forma de expor algo ao client no Expo). `EXPO_PUBLIC_API_URL` é a única obrigatória em dev; `EXPO_PUBLIC_USE_MOCKS` liga/desliga mocks.
- Segredos não existem neste client (não há backend aqui) — nada de chave de API/serviço embutida no bundle.
- Ambientes EAS (`preview`/`production`) configuram essas vars em `eas.json`/`eas env:create`, não em `.env` local.

# Build e Deploy

- Web: `npm run build:web` (export para `dist/`) + `eas deploy`.
- Nativo: `eas build --platform android|ios --profile preview|production` (requer `eas login`).
- Antes de considerar uma tarefa concluída, rodar `npm run validate` (typecheck + lint + expo-doctor).
