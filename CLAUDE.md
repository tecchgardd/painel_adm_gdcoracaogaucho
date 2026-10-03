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
- `npm run test` — roda todos os testes (Vitest). Para um arquivo único: `npx vitest run src/features/vendas/services/sales.service.test.ts`
- `npm run doctor` — `expo-doctor`
- `npm run validate` — typecheck + lint + doctor (rodar antes de considerar uma tarefa concluída)
- `npm run build:web` — export web para `dist/`
- `eas build --platform android --profile preview|production` — build nativo (requer `eas login`)

## Architecture

- Rotas em `app/`, roteamento por arquivo (expo-router). Grupo `app/(admin)/` contém as telas autenticadas, montadas como `Tabs` com `tabBarStyle: { display: 'none' }` (a navegação real é feita pelo menu em `src/shared/components/navigation`, não pela tab bar nativa).
- `app/(admin)/_layout.tsx` é o guard de autenticação e de role: no mount, chama `useAuthStore().loadSession()`; sem sessão válida redireciona para `/login`. Depois disso, restringe rotas por `role` (`ADMIN` | `STAFF` | `CHECKIN`) — ex.: `CHECKIN` só acessa `scanner`/`historico-validacoes`, `STAFF` não acessa `relatorios`. Ao adicionar uma tela nova em `(admin)/`, registrá-la na lista de `Tabs.Screen` desse layout.
- `src/core/api/client.ts` é o client Axios único (`api`). Injeta o Bearer token automaticamente e trata 401 (limpa storage + redireciona para `/login`) e 403 (mensagem específica para origem não confiável no CORS). Todo novo `*.service.ts` deve importar `api` daqui, nunca instanciar outro client.
- `src/core/storage/authStorage.ts` é o único lugar que decide o backend de storage de auth (SecureStore em Android/iOS, AsyncStorage na web) para o token; era duplicado entre `api.ts` e `auth.service.ts` antes da reorganização, agora está consolidado aqui.
- `src/features/<domínio>/` — código específico de domínio, organizado feature-first com nomes em PT-BR batendo com as rotas (`vendas`, `pagamentos`, `eventos`, `agente-ia`, ...). Cada feature tem só as subpastas que usa: `services/` (`*.service.ts`, encapsulando as chamadas Axios e o unwrap da resposta com `unwrapData`), `components/`, `utils/`, `types.ts`. Testes de service usam `vi.mock('@/core/api/client')` e ficam ao lado do arquivo (`*.service.test.ts`). Imports entre features usam o alias `@/features/...`, não caminho relativo. Não criar pastas vazias "para o futuro".
- `src/shared/services/` — services genéricos sem domínio próprio (`cep`, `uploads`), usados também por `shared/components`. Código em `shared/` e `core/` nunca importa de `features/`.
- `src/core/config/env.ts` resolve `API_URL` a partir de `EXPO_PUBLIC_API_URL`, com troca automática `localhost` ⇄ `10.0.2.2` para o emulador Android.
- `src/stores/auth.store.ts` (Zustand) é a única fonte de sessão/role no client — não duplicar estado de auth em componentes.
- `src/shared/hooks/useApiQuery.ts` é o hook padrão para chamadas de leitura (loading/error/refetch); trata 404 com array de fallback como lista vazia sem erro.
- `src/shared/components/crud/` — conjunto genérico (`CrudScreen`, `FormModal`, `DataCard`, `ApiRecordScreen`) usado pelas telas de cadastro simples; `ApiRecordScreen` é a variante que já integra com a API real via `useApiQuery` em vez de estado local. `ConfirmModal`, `EmptyState`, `ErrorState` e `LoadingState` ficam em `src/shared/components/feedback/`.
- `src/shared/components/ui/` — primitivos compartilhados (`Screen`, `Header`, `SearchBar`, `FloatingActionButton`, etc.), reexportados pelo barrel `src/shared/components/ui/index.tsx` e importados como `@/shared/components/ui`.
- Convenções de UI (`src/shared/components/ui`): grids de cards usam `gridContainer` + `gridCellStyle(colunas)` de `ui/grid.ts` (nunca larguras `'48.5%'` com `space-between`, que desalinha a última linha); o menu de ações de um item vai dentro do card via `<ListCard actions={<ActionMenu variant="ghost" ... />} />` (como irmão da área clicável, para não aninhar `<button>` na web); `AppModal` aceita `size` (`sm` confirmações, `md` padrão, `lg` formulários longos/documentos) e `subtitle`; `Header` aceita `subtitle` (use em vez de um `<Text>` solto abaixo do título); `Panel` é o bloco titulado do dashboard. Formulários em modal: agrupe com `FormSection` (o primeiro com `first`), ponha campos curtos lado a lado com `FormRow` (empilha no mobile) e use `FormField` com `required`/`error`/`hint` em vez de `<Text>` de erro solto; detalhes "rótulo / valor" usam `InfoList` + `InfoRow`. No `ApiRecordScreen`, o layout vem da config do campo (`section`, `half`, `required`, `optionLabels`), via `crud/fieldLayout.ts`. Valores de enum da API (ex.: `ATIVO`, `PARCIALMENTE_ESTORNADO`) nunca aparecem crus na UI: mapeie para rótulos em português. Texto usa `fontFamily: theme.font.*` (Poppins), não `fontWeight` pesado na fonte do sistema. Cores suaves (`redSoft`, `greenSoft`, `borderSoft`, ...) ficam em `src/theme/theme.ts`.
- Sidebar (desktop): recolhível, estado em `src/stores/ui.store.ts` (persistido em AsyncStorage, porque a sidebar remonta a cada tela); itens e roles vêm de `navigation.config.ts`, que também alimenta a busca rápida (Ctrl/⌘+K, `CommandPalette`). Ao criar uma tela nova, adicioná-la ali com os mesmos roles do guard em `app/(admin)/_layout.tsx`.
- Login aceita e-mail ou usuário no mesmo campo: `buildSignInRequest` em `auth.service.ts` escolhe `/auth/sign-in/email` (com `@`) ou `/auth/sign-in/username` (plugin `username` do Better Auth). Colaborador tem `username` e `fotoUrl` (lógica do formulário em `src/features/colaboradores/utils/colaboradorForm.ts`).
- `app/(admin)/registros.tsx` (Registro de atividades, só ADMIN) lê `GET /admin/registros`; o registro é gravado pelo backend, nunca pelo client. Contrato do backend para essas três funcionalidades: `docs/backend/2026-10-03-usuario-foto-registro.md`.
- Telas de lista com busca e filtros usam `FilterBar` (busca + seletores compactos "Status: Pagas" com "Limpar"; nunca várias linhas de `ChoiceGroup`) e `Pagination`, ambos em `@/shared/components/ui`. Busca que consulta a API espera 400 ms após a digitação (ver `vendas.tsx`/`pagamentos.tsx`). Tabelas desktop definem as colunas uma vez (`TABLE_COLUMNS` em `vendas.tsx`) e usam a mesma proporção no cabeçalho e nas linhas.
- Comercial = só ingressos (eventos/bailes) e inscrições (cursos); Pedidos (produtos) saiu do menu. Ingressos são emitidos pela venda ou pela cortesia (só ADMIN, motivo obrigatório); a tela Ingressos só consulta/gerencia. Código de ingresso/inscrição: até 8 caracteres `A-Z0-9` (`src/shared/utils/codigo.ts`), gerado pelo backend — contrato em `docs/backend/2026-10-03-modulo-comercial.md`. Plano das próximas fases (nova venda em etapas, check-in, financeiro): mesmo documento, seção 5.
- Cadastros = Pessoas (`/clientes`: clientes e alunos são o mesmo cadastro por CPF; aluno = tem inscrição), Empresas e Colaboradores. A ficha da pessoa (`PessoaFichaModal`) mostra o histórico e leva a `/alunos?pessoa=<id>` (inscrição pré-preenchida) e `/vendas?cpf=<cpf>` (venda com comprador). Quem tem histórico é inativado, não excluído; colaborador que sai é desativado. Contrato do backend: `docs/backend/2026-10-03-cadastros.md`.
- A ferramenta de escrita de arquivos converte escapes `̀` em caracteres literais: em regex de acentos, conferir o arquivo depois de criar (`grep -c 'u0300-'`).
- Logout sempre via `useAuthStore().logout()` (desliga biometria e limpa a sessão mesmo se o sign-out falhar); chamar `auth.service.logout` direto deixa o guard liberando a sessão antiga.
- `src/validation/schemas.ts` — schemas Zod compartilhados entre formulários.
- `src/shared/types/entities.ts` — tipos de domínio (Customer, EntityStatus, UserRole, etc.), compartilhados entre vários domínios; tipos usados por um único domínio ficam em `src/features/<domínio>/types.ts`; campos costumam ter variante PT/EN (`nome`/`name`, `telefone`/`phone`) porque a API não normaliza sempre — checar ambos ao consumir.
- `src/theme/` — tokens de cor e tema, usados via `StyleSheet.create` (sem lib de CSS-in-JS).
- `useResponsive` (`src/shared/hooks/useResponsive.ts`) define o número de colunas por breakpoint; usado nas grids de `crud/`.

## Environment Variables

- `EXPO_PUBLIC_API_URL` — URL da API (única var exigida em dev). Copiar `.env.example` para `.env`.
- `EXPO_PUBLIC_USE_MOCKS` — liga/desliga mocks.
- Nos ambientes EAS (`preview`/`production`), essas vars ficam em `eas.json` / `eas env:create`, não no `.env` local.
- Autenticação é via Better Auth no backend (`/api/auth/sign-in/email`); não há fallback mock de admin no client.

## Gotchas

- Web e nativo usam storages diferentes para o token (AsyncStorage vs SecureStore) — sempre checar `Platform.OS` ao mexer em algo relacionado a auth/storage.
- `src/features/documentos/services/documents.service.ts` (gerador de PDF com `pdf-lib`) é pesado e deve ser importado via `import('@/features/documentos/services/documents.service')` dinâmico no ponto de uso (ver `src/features/documentos/components/DocumentPreviewModal.tsx`), nunca no topo estático de uma tela/lista.
- Documentos (inscrição, ingresso, cupom) seguem um modelo único: a arte fica em `assets/documents/*.jpg` (fundo com cabeçalho, ilustrações, rótulos e linhas) e `src/features/documentos/templates/documentTemplates.ts` diz quais dados da venda entram e onde, em pixels da arte. A prévia (`TemplateDocumentView`) e o PDF (`documents.service.ts`) desenham a mesma lista — ao mudar a posição de um campo, mude só ali. Se a arte for trocada por outra com layout diferente, as coordenadas precisam ser remedidas.
- `react-hooks/set-state-in-effect` está desligado no ESLint deste projeto (ver `eslint.config.js`) — não é um erro de lint aqui.
