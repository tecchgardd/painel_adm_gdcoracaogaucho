# Fase 1: Design System, Navegação e Login — spec

## Contexto

O painel-admin (Expo/React Native + expo-router) já implementa praticamente todas as telas do
projeto (dashboard, eventos, cursos, alunos, vendas, pedidos, pagamentos, scanner,
colaboradores, relatórios, menu), consumindo a API real via `src/services/*.service.ts`. O tema
atual (`src/theme/theme.ts`) é uma implementação de uma versão anterior do protótipo — a paleta
atual (`#C62828` vermelho, `#F9A825` amarelo) bate com `assets/ui-reference.png`, um mockup mais
antigo já presente no repo.

O usuário forneceu um protótipo atualizado (paleta escura premium, tipografia Poppins, dourado
como cor de identidade, modais centralizados) que deve se tornar a nova referência visual. O
trabalho completo (todas as ~17 fases do pedido original) é grande demais para um plano único, e
foi dividido em fases com checkpoint de aprovação. Esta spec cobre a **Fase 1**: fundação do
design system, reestruturação da navegação (bottom tabs) e re-skin da tela de login e do menu.
Todas as demais telas continuam funcionando com o visual atual até suas respectivas fases.

## Fora de escopo nesta fase

- Redesign do conteúdo do Dashboard (fase seguinte).
- Telas de Gestão (eventos, lotes, cursos, alunos, inscrições, vendas, pedidos, pagamentos,
  colaboradores, relatórios) — conteúdo/CRUD inalterado, apenas herdam os novos tokens/primitivos
  quando essas fases forem feitas.
- Fluxo de câmera do Scanner.
- Matriz de permissões por módulo (RBAC granular) — o guard atual por `role` em
  `app/(admin)/_layout.tsx` é mantido como está.

## Decisões

- **Ícones**: manter `@expo/vector-icons` (`MaterialCommunityIcons`), já usado em ~15 arquivos.
  Não migrar para `lucide-react-native` — trocar biblioteca de ícones não traz ganho funcional e
  é uma reescrita mecânica arriscada. Usar variantes "outline" para aproximar do estilo minimalista
  do protótipo.
- **Modais**: passam a ser **centralizados em todas as larguras de tela** (hoje são bottom-sheet
  no mobile). Isso é uma mudança de comportamento em `ModalContent`/`AppModal`
  (`src/components/ui.tsx`) que afeta todos os modais existentes no app — cada um precisa ser
  verificado depois para garantir que cabe e rola corretamente em tela pequena.
- **Nomes de tokens**: manter os nomes atuais (`colors.red`, `colors.card`, `colors.border`, etc.)
  e apenas trocar os valores hexadecimais, acrescentando os tokens novos que não existem hoje
  (`surface2`, `gold`, `goldDark`, `amber`). Evita reescrever imports em todo o app.
- **Esqueci minha senha**: não existe endpoint de reset de senha em `auth.service.ts` (só
  sign-in/sign-out/get-session). O link abre um modal informativo ("Entre em contato com um
  administrador para redefinir sua senha") em vez de simular um fluxo que não existe no backend.
  Reportar como endpoint faltante ao final.
- **Notificações** (item de menu do protótipo): sem endpoint no backend. Omitido nesta fase e
  reportado como pendência, em vez de exibir uma tela vazia/fake.
- **Biometria**: gate local sobre o token já armazenado (SecureStore/AsyncStorage), não é um novo
  método de autenticação no backend. Usa `expo-local-authentication` (nova dependência).

## 1. Tokens (`src/theme/theme.ts`)

Substituir os valores de cor mantendo os nomes existentes e adicionando os que faltam:

```
bg (colors.black)      #08090A
surface (colors.dark)  #121315
surface2 (colors.card) #191A1D
border                 #2B2C31
text                   #F7F3EA
muted                  #9B9DA6
red                    #D8322F
redDark                #641B1B
gold        (novo)      #C8902B
goldDark    (novo)      #6F4F1D
green                   #2F8A3A
blue        (novo)      #3D82C7
amber       (novo)      #D79B21
```

Durante a implementação: auditar usos de `colors.black`/`colors.dark`/`colors.card` (hoje três
tokens com papéis parecidos) e mapear cada um para bg/surface/surface2 de forma consistente —
alguns usos atuais podem estar "errados" e merecer correção nessa migração.

`radius` (`sm:8 md:12 lg:16 xl:22`) já bate com o protótipo — mantido sem alteração.

### Tipografia

- Adicionar dependência `@expo-google-fonts/poppins` (Regular, Medium, SemiBold, Bold).
- Carregar via `useFonts` em `app/_layout.tsx`, junto da fonte de ícones já carregada ali.
- Criar um helper de texto no tema (ex.: `theme.text.title`, `theme.text.body`,
  `theme.text.label`) que resolve `fontFamily` (Poppins não suporta `fontWeight` nativo do RN) —
  usado para substituir gradualmente os `fontWeight` inline conforme cada tela for tocada nas
  próximas fases. Nesta fase, aplicar nos componentes tocados (primitivos, login, menu, tab bar).

## 2. Primitivos compartilhados (`src/components/ui.tsx`)

- **Botões**: `Button`/`AppButton` hoje usa `tone: 'red'|'green'|'dark'`. Adicionar
  `variant: 'primary'|'secondary'|'soft'|'danger'` mapeado às cores do protótipo (Primário =
  vermelho sólido, Secundário = outline, Suave = fill sutil). Levantar os call sites de `tone`
  durante a implementação e decidir, por contagem, entre renomear todos ou manter um shim de
  compatibilidade.
- **Modal** (`ModalContent`/`AppModal`): remover o modo bottom-sheet no mobile; sempre
  centralizado, com `max-width`/`max-height`, header fixo (título + X), `ScrollView` interno,
  footer de ações fixo. Validar em viewport pequeno que nenhum modal existente estoura a tela.
- **StatusBadge**: estender o mapa de cores para o novo conjunto de tons (verde/âmbar/vermelho/
  dourado-azul para cortesia), mantendo a assinatura atual.
- **Novos/restilizados**: `MetricCard` (evolução do `StatCard` atual, com ícone e quadrado
  colorido), `Avatar` (novo — imagem circular ou iniciais), `FilterChip` (restyle do
  `ChoiceChip` atual). `EmptyState`/`LoadingState`/`ErrorState` (já existem em `src/components/
  crud/`) apenas herdam os novos tokens.

## 3. Navegação

- `src/navigation.config.ts`: `mobileTabs` passa de 4 itens (Dashboard, Vendas, Check-in, Gestão)
  para os 5 do protótipo: **Dashboard, Scanner, Eventos, Gestão, Menu**. `Vendas` sai da tab bar
  (permanece acessível via Gestão e via "Ações rápidas" do Dashboard, fase seguinte).
- `app/(admin)/_layout.tsx`: a lista de `Tabs.Screen` já cobre as rotas necessárias
  (`eventos`, `menu` já existem) — só o conjunto visível na tab bar muda.
- `BottomTabs.tsx`: restyle para o visual do protótipo (ícone vermelho ativo, cinza inativo,
  barra superior arredondada, sem mudança de comportamento de roteamento).

## 4. Login (`app/login.tsx`)

Re-skin completo de um fundo claro com barras verde/vermelho para o layout escuro do protótipo:
logo + tagline, "Acessar plataforma", campos de e-mail/senha com ícones, toggle de
mostrar/ocultar senha (novo), checkbox "Lembrar acesso", link "Esqueci minha senha", botão
ENTRAR (vermelho), divisor "ou", botão outline "Entrar com biometria", rodapé com versão.

Comportamento (lógica de `auth.store.ts` reaproveitada sem alteração):

- **Lembrar acesso**: persiste apenas o e-mail em AsyncStorage quando marcado; preenche o campo
  na próxima visita. Nunca persiste senha.
- **Esqueci minha senha**: abre modal informativo (ver "Decisões" acima) — sem chamada de API.
- **Biometria**: nova dependência `expo-local-authentication`. Após login por senha bem-sucedido
  (ou quando já existe sessão válida armazenada), oferece habilitar biometria; nas próximas
  aberturas, se habilitada e hardware disponível, "Entrar com biometria" desbloqueia
  localmente o token já salvo (sem nova chamada de autenticação ao backend).

## 5. Menu (`app/(admin)/menu.tsx`)

Adicionar cabeçalho com avatar, nome, e-mail e cargo (dados já disponíveis via
`useAuthStore`). Lista de opções, restilizada:

- Meu perfil — nova tela simples, somente leitura, com os dados do usuário logado (sem novo
  endpoint).
- Colaboradores — rota existente (`/colaboradores`, ADMIN apenas, RBAC já aplicado).
- Configurações — rota existente (`/configuracoes`).
- Ajuda — nova tela estática (conteúdo de contato/suporte, sem dependência de API).
- Sobre o app — nova tela estática (versão, créditos).
- ~~Notificações~~ — omitido nesta fase (endpoint não existe; reportar como pendência).
- "SAIR DA CONTA" em vermelho, com o modal de confirmação já existente (`AppModal`),
  restilizado.

## Dependências novas

- `@expo-google-fonts/poppins`
- `expo-local-authentication`

## Testes / verificação

- `npm run validate` (typecheck + lint + doctor) deve passar.
- Testes de service existentes não devem quebrar (nenhuma mudança de contrato de API nesta fase).
- Verificação manual: login (com e sem biometria disponível), logout, navegação pelas 5 abas,
  abertura de pelo menos um modal existente (ex.: confirmação de logout) em viewport mobile
  estreito para validar o modal centralizado.

## Pendências a reportar ao final

- Endpoint de reset de senha ("esqueci minha senha") não existe no backend.
- Endpoint de notificações não existe no backend.
