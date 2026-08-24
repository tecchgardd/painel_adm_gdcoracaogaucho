# Reorganização de pastas — Fase 1: fundação (core/ + shared/) — spec

## Contexto

O painel-admin cresceu com uma estrutura por camada (`src/components`, `src/services`,
`src/hooks`, `src/types`, `src/utils`) misturando código genérico/compartilhado com código
específico de domínio (ex.: `src/components/agent/`, `src/services/eventos.service.ts`). O
usuário pediu uma reorganização completa para um modelo feature-first
(`src/features/<domínio>/{components,hooks,services,schemas,store,types}`), inspirado em uma
árvore de referência.

A reorganização completa é grande demais para um plano único: toca ~30 `*.service.ts`, ~45
componentes, todos os tipos e praticamente todo import do projeto. Foi dividida em sub-projetos:

1. **Housekeeping** (esta fase) — limpar artefatos soltos na raiz, resolver duplicidade de `ui.tsx`.
2. **Fundação `core/` + `shared/`** (esta fase) — mover código genuinamente compartilhado/
   infraestrutural para os novos diretórios, sem tocar em código específico de domínio.
3. **Migração feature-a-feature** (fases futuras, uma por domínio ou pequenos grupos) — mover
   `components/<domínio>`, `<domínio>.service.ts`, tipos e schemas relacionados para
   `src/features/<domínio>/`.
4. **Docs/scripts/tests** (fase futura) — alinhar `docs/`, `scripts/`, `tests/` à nova estrutura,
   se necessário.

Esta spec cobre **apenas as fases 1 e 2**. As fases 3 e 4 serão planejadas separadamente, uma vez
que a fundação estiver validada.

## Decisões

- **`app/` não muda.** Nenhuma rota é renomeada, nenhuma nova sub-rota é criada
  (`app/(admin)/eventos.tsx` continua um arquivo flat, não vira `eventos/index.tsx`). As rotas
  continuam em PT-BR. O guard de auth/role em `app/(admin)/_layout.tsx` não é tocado.
- **Nomes de domínio continuam em PT-BR** em todo o projeto (`features/eventos`, não
  `features/events`), para bater com as rotas e evitar tradução cosmética sem ganho funcional.
- **Sem pastas vazias "para o futuro".** `core/auth/`, `core/providers/`, `shared/constants/`,
  `src/mocks/` não são criados nesta fase — nada no código atual justifica essas pastas
  (não há uso de `EXPO_PUBLIC_USE_MOCKS` hoje, por exemplo). Entram só quando algo real precisar
  delas.
- **`core/api/`** não é dividido em `client.ts`/`endpoints.ts`/`errors.ts` como o print de
  referência sugeria — hoje não existe uma lista de endpoints nem um módulo de erros separado;
  isso é uma única entidade coesa (`services/api.ts`) e vira só `core/api/client.ts`.
- **Consolidar storage de auth.** Hoje a branch `Platform.OS === 'web' ? AsyncStorage :
  SecureStore` está duplicada em 4 lugares (`services/api.ts`, `services/auth.service.ts`,
  `services/biometric.service.ts`, `utils/rememberedEmail.ts`). Isso é o "gotcha" que o próprio
  `CLAUDE.md` do projeto já registra. Como parte da fundação, essa lógica é extraída para
  `core/storage/authStorage.ts` e os 4 pontos passam a usá-la. Esta é uma correção de código
  existente que serve diretamente o objetivo da reorganização (isolar infraestrutura), não um
  refactor não relacionado.
- **`src/stores/`, `src/theme/`, `src/validation/` continuam onde estão.** Já batem com o padrão
  alvo (estado global de verdade, tokens de tema, schemas Zod compartilhados entre domínios).
- Todo código específico de domínio (`components/agent`, `components/dashboard`,
  `components/documents`, `components/events`, `components/payments`, `components/sales`, os 30
  `*.service.ts`) **não é tocado nesta fase** — migra em fase 3, domínio por domínio.

## Fora de escopo nesta fase

- Migração de qualquer domínio para `src/features/<domínio>/` (fase 3).
- Qualquer mudança de rota/URL em `app/`.
- Criação de `src/mocks/`, `core/auth/`, `core/providers/`, `shared/constants/`.
- Split de `src/types/entities.ts`/`agent.ts` em tipos por domínio (fase 3).
- Reorganização de `docs/`, `scripts/`, `tests/` (fase 4).

## 1. Housekeeping

- Commit isolado do WIP atual (`agente-ia.tsx`, `dashboard.tsx`, componentes de agent/dashboard
  deletados) **antes** de iniciar qualquer movimentação de arquivo, para não misturar históricos.
- Remover da raiz do repo: `dist/`, `dist-pdf-check/`, `dist-validation-audit/`,
  `dist-video-review/` (artefatos de build/relatórios locais).
- Ajustar `.gitignore`: trocar `dist-test*` / `dist-validation*` por um padrão único `dist*` que
  cobre todas as variantes atuais e futuras (`dist-pdf-check`, `dist-video-review` não estavam
  cobertos).
- Resolver a duplicidade `src/components/ui.tsx` (arquivo) vs `src/components/ui/` (pasta):
  inspecionar o que cada um exporta, migrar o conteúdo de `ui.tsx` para dentro de
  `src/components/ui/` (arquivo(s) novo(s) dentro da pasta) e apagar `ui.tsx`, atualizando os
  imports que hoje apontam para `@/components/ui` (arquivo) para continuarem resolvendo para a
  pasta.

## 2. `src/core/` (infraestrutura, não é lógica de domínio)

```
src/core/
├── api/
│   └── client.ts        # ex src/services/api.ts (axios instance, interceptors, unwrapData)
├── storage/
│   └── authStorage.ts   # novo: consolida a branch Platform.OS de token/user storage
└── config/
    └── env.ts           # ex src/config/app.config.ts
```

- `core/api/client.ts`: conteúdo movido 1:1 de `services/api.ts`, exceto que `saveAuthToken` e
  `clearAuthStorage` passam a delegar para `core/storage/authStorage.ts` em vez de acessar
  `AsyncStorage`/`SecureStore` diretamente.
- `core/storage/authStorage.ts`: expõe `getAuthToken()`, `saveAuthToken(token)`,
  `clearAuthStorage()` (token + user), com a branch `Platform.OS` isolada aqui uma única vez.
  `services/auth.service.ts` e `services/biometric.service.ts` passam a importar daqui em vez de
  reimplementar a branch. `utils/rememberedEmail.ts` é avaliado à parte: se a chave que ele
  guarda é conceitualmente diferente (lembrar e-mail digitado, não token/sessão), pode continuar
  em `shared/utils/` usando o mesmo padrão de storage sem precisar ser a mesma função — decisão
  fica para quem implementar, documentando a escolha no commit.
- `core/config/env.ts`: conteúdo movido 1:1 de `config/app.config.ts`.

## 3. `src/shared/` (reutilizável entre domínios, não é estado global)

```
src/shared/
├── components/
│   ├── ui/          # ex src/components/ui/ + conteúdo de ui.tsx (ver Housekeeping)
│   ├── layout/      # ex src/components/layout/
│   ├── navigation/  # ex src/components/navigation/
│   ├── feedback/    # ConfirmModal, EmptyState, ErrorState, LoadingState (ex src/components/crud/)
│   └── crud/        # CrudScreen, DataCard, FormModal, ApiRecordScreen (ex src/components/crud/)
├── hooks/           # ex src/hooks/ (useApiQuery, useResponsive) — sem mudança de conteúdo
├── utils/           # ex src/utils/ — sem mudança de conteúdo
└── types/           # ex src/types/ (api.ts, index.ts, entities.ts, agent.ts) — sem split ainda
```

- Nenhum arquivo dentro dessas pastas muda de conteúdo nesta fase, só de localização (exceto
  onde a Seção 2 pede um import atualizado para `core/storage`).
- `components/crud/` é dividido em dois destinos porque `ConfirmModal`/`EmptyState`/`ErrorState`/
  `LoadingState` são genéricos de UI (qualquer tela pode usar), enquanto `CrudScreen`/`DataCard`/
  `FormModal`/`ApiRecordScreen` formam um sistema coeso específico do padrão de cadastro genérico
  — mantê-los juntos evita quebrar esse acoplamento intencional.

## 4. Alias de import

Mantém-se apenas `@/*` → `./src/*` (já existe em `tsconfig.json`). Não é necessário adicionar
aliases dedicados (`@/core/*`, `@/shared/*`) — `@/core/...` e `@/shared/...` já resolvem
naturalmente pelo alias existente. Evita mexer em `tsconfig.json`/`babel.config.js` nesta fase.

## 5. Processo de migração e validação

- Mover arquivos com `git mv` (preserva histórico) em grupos pequenos e coerentes: (a) housekeeping,
  (b) `core/`, (c) `shared/components/ui` + merge de `ui.tsx`, (d) `shared/components/layout` +
  `navigation`, (e) `shared/components/feedback` + `crud`, (f) `shared/hooks` + `utils` + `types`.
- Após cada grupo: atualizar os imports que quebraram (buscar por caminho antigo), rodar
  `npm run validate` (typecheck + lint + doctor) e `npm run test`, só então commitar e seguir para
  o próximo grupo.
- Se algum grupo revelar um import circular ou acoplamento não previsto aqui, parar e resolver
  antes de continuar (não empurrar para o próximo grupo).

## 6. Critério de conclusão desta fase

- `npm run validate` e `npm run test` passam.
- Nenhum arquivo em `src/components`, `src/services`, `src/hooks`, `src/types`, `src/utils`,
  `src/config` sobra fora de `core/`/`shared/`, exceto o código específico de domínio listado em
  "Fora de escopo" (que permanece em `src/components/<domínio>` e `src/services/<domínio>.service.ts`
  até a fase 3).
- `app/` inalterado (diff vazio fora do commit de housekeeping/WIP já existente).
