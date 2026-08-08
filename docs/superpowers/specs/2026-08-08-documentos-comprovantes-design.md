# Documentos de comprovante (inscrição, ingresso, cupom) — Design

Data: 2026-08-08 (revisado)
Repositório: **`painel-admin`** apenas (Expo/React Native). Não há backend neste repositório — a API é externa (`https://backend-coracaogaucho.vercel.app/api`), consumida via `src/services/*.service.ts`.

> Nota: uma versão anterior deste documento assumia mudanças de schema/endpoints em um repositório de backend separado. Essa versão foi descartada — o pedido nesta iteração é explicitamente **frontend apenas**; qualquer necessidade de backend (novos campos, novos endpoints) fica para um processo separado, fora deste repositório e deste spec. Onde o dado necessário não existe hoje na API, o layout se degrada graciosamente (linha some) em vez de inventar dado ou bloquear o documento.

## 1. Objetivo

Redesenhar os 3 documentos já gerados pelo painel (ticket/recibo/ficha) para reproduzir fielmente a referência visual oficial (imagem fornecida em 2026-08-08):

1. **Comprovante de Inscrição** de curso — folha branca/verde.
2. **Ingresso** de baile/evento — preto/vermelho/dourado, com o flyer real do evento e canhoto com barcode.
3. **Cupom/Comprovante de Pagamento** — recibo estilo térmico branco/preto.

Público: staff/admin dentro do `painel-admin` — não existe app de cliente final neste projeto. Documentos são gerados a partir de uma `Sale` já carregada (não há tela nova buscando por ID isolado; ver Seção 4.2).

Todos os dados exibidos vêm de `Sale`/`raw.*` (já retornado pela API existente via `sales.service.ts`) — zero dado digitado manualmente, zero mock no código final. Campos que a referência mostra mas que não existem no modelo atual (ex.: dias/horários de curso, modalidades, dados institucionais de CNPJ) **não são inventados**: a linha correspondente simplesmente não é renderizada.

## 2. O que já existe e é reaproveitado (não recriado)

- `src/services/documents.service.ts` — motor de PDF via `pdf-lib` + `qrcode`. Continua sendo o motor único; as 3 funções de desenho (`createTicketPdf`/`createReceiptPdf`/`createRegistrationPdf`) são reescritas por dentro para o novo layout, mas a API pública (`downloadSaleDocument`, `viewSaleDocument`, `shareSaleDocument`, `sendDocumentByWhatsApp`, `sendDocumentByEmail`) não muda de assinatura.
- `src/components/documents/documentUtils.ts` — funções puras de normalização de `Sale` (`getEventInfo`, `getReceiptItems`, `getDocumentCode`, `getRegistrationFields`, etc.) são estendidas com os campos novos que a referência pede, mantendo as existentes.
- `src/utils/format.ts::maskCpf` — já mascara CPF (`***.***.789-01` — formato de privacidade), reaproveitado sem mudanças.
- `SaleDetailsModal` (aba DOCUMENTOS) — continua sendo o ponto de entrada; passa a abrir um preview full-screen em vez de renderizar inline (ver 4.2).
- Paleta: `src/theme/theme.ts` ganha um único token novo, `gold`; todo o resto (`red`, `green`, `yellow`, `black`, `white`) já existe e passa a ser a fonte única de cor dos documentos, substituindo a paleta bordô/dourada hoje hardcoded em `documents.service.ts`/`DocumentHeader.tsx`.

## 3. Substituído / novo

Os componentes genéricos atuais em `src/components/documents/` (`DocumentHeader`, `TicketCard`, `DocumentQRCode` com ícone falso, `ReceiptItems`, `ReceiptTotals`, `RegistrationForm`, `DocumentSection`, `DocumentRow`, `DocumentFooter`) — hoje um card escuro genérico — são **substituídos** pelos componentes fiéis abaixo.

```
src/components/documents/
  shared/
    DocumentLogo.tsx        # assets/logo-oficial.jpeg, logo oficial não redesenhada
    DocumentQRCode.tsx      # QR real (qrcode → data URI → <Image>), memoizado pelo valor
    DocumentBarcode.tsx     # Code128 real (src/utils/barcode.ts), horizontal ou rotacionado 90°
    DocumentDivider.tsx     # sólido / pontilhado (borderStyle: 'dashed')
    DocumentField.tsx       # ícone + rótulo + valor; não renderiza nada se value ausente
    ScaledDocument.tsx      # dimensão fixa por documento, escala proporcional, centralizado, ScrollView
  CourseRegistrationReceipt/{CourseRegistrationReceipt.tsx, styles.ts}
  EventTicket/{EventTicket.tsx, EventTicketStub.tsx, styles.ts}
  PaymentReceipt/{PaymentReceipt.tsx, styles.ts}
  DocumentPreviewModal.tsx  # novo: full-screen, hospeda ScaledDocument + [Compartilhar] [Gerar PDF]
  documentUtils.ts          # estendido (não recriado)

src/services/documents.service.ts  # reescrito por dentro, mesma API pública
src/utils/barcode.ts               # novo: encoder Code128-B autocontido (sem dependência externa)
src/theme/theme.ts                 # + token `gold`
```

Nenhuma rota nova em `app/(admin)/`, nenhuma dependência nova em `package.json`, nenhuma mudança de autenticação/roles.

## 4. Arquitetura

### 4.1 Bibliotecas — decisões

| Necessidade | Decisão | Motivo |
|---|---|---|
| QR na tela (preview) | Reaproveitar `qrcode` (já instalado) via `toDataURL()` → `<Image source={{uri}}>` | Já funciona hoje dentro do PDF em web e nativo (usa `pngjs` puro-JS, sem DOM/canvas); evita adicionar `react-native-svg`/`react-native-qrcode-svg` e o rebuild nativo que isso exigiria |
| QR no PDF | `qrcode` (já existe) | Sem mudança |
| Barcode (tela + PDF) | Encoder Code128-B próprio, ~100 linhas, retorna array de larguras de barra | Não existe lib de barcode instalada; alternativas de mercado exigem DOM/canvas, incompatível com nativo. O mesmo array alimenta `<View>`s na tela (rotacionadas via `transform: [{ rotate: '90deg' }]` no canhoto) e retângulos vetoriais no PDF |
| PDF | `pdf-lib` (já existe) — mantido, não migrado para `expo-print` | `expo-print` está instalado mas sua implementação web (`ExponentPrint.web.ts`) é um stub que só chama `window.print()` e não gera arquivo/base64 — inutilizável para o fluxo de download/compartilhar em web que já funciona hoje via pdf-lib. Migrar quebraria web |
| Fontes | Fonte padrão do sistema (preview) + `Helvetica`/`HelveticaBold` — `StandardFonts` do pdf-lib (PDF) | Projeto não carrega Poppins hoje (só o ícone via `useFonts`); hierarquia é resolvida com tamanho/peso/caixa-alta sem precisar embutir fonte TTF nova |

### 4.2 Ponto de entrada (sem rotas novas)

`SaleDetailsModal` → aba DOCUMENTOS → botão "Visualizar documento" (por tipo: ingresso/inscrição/cupom, conforme `sale.tipo` e status) → abre `DocumentPreviewModal` (novo, `Modal` full-screen do RN, não rota) → `ScaledDocument` centraliza e escala o documento (dimensão fixa por tipo, nunca deforma, `ScrollView` quando necessário) → botões fixos `[Compartilhar]` `[Gerar PDF]` chamam `shareSaleDocument`/`downloadSaleDocument` já existentes via import dinâmico (padrão já usado, mantém `documents.service.ts` fora do bundle inicial).

Nenhum dado é buscado de novo — o `Sale` já carregado no modal (via `sales.service.ts`) é a única fonte, incluindo `raw.evento` (flyer), `raw.customer`, `raw.pagamentos[]`, `raw.ingressos[]`/`raw.loteIngresso.tickets[]` (código/QR individual), `raw.inscricoes[]`.

### 4.3 QR e código de validação

Payload do QR = o mesmo código já usado hoje (`ticket.qrcode ?? ticket.codigo ?? sale.codigo`, via `getDocumentCode`), **não** uma URL pública. Confirmado em `scanner.service.ts`: `POST /admin/scanner/validar` espera `{ codigo }` bruto. Manter o payload como código puro garante compatibilidade com o scanner existente sem exigir uma página pública de validação (que não existe neste repositório).

### 4.4 Campos sem fonte de dados hoje

A referência mostra `DIAS E HORÁRIOS`, `MODALIDADES` (comprovante) e CNPJ/endereço institucional (cupom) — nenhum existe em `Evento`/`Sale`/`Customer` hoje. Regra: **a linha some quando o campo é `undefined`/vazio** (`DocumentField` não renderiza nada nesse caso); nunca texto inventado, nunca placeholder visível. Se o backend passar a expor esses campos futuramente (fora deste repositório/spec), as linhas aparecem automaticamente sem mudança de componente.

## 5. Especificação visual

Paleta (via `@/theme/colors`, sem arquivo de cor paralelo):
```
comprovante: bg branco (#F5F5F5) · faixa/rodapé verde (#2E7D32, tom escuro derivado) · texto preto (#111111)
ingresso:    bg preto (#111111) · dourado (#D4A62A, novo token) · texto branco
cupom:       bg branco · texto/traços preto · pontilhado cinza (colors.muted)
corações:    verde #2E7D32 · vermelho #C62828 · amarelo #F9A825
```

### 5.1 Comprovante de Inscrição (`CourseRegistrationReceipt`)
Retrato, ~620×950pt, cantos arredondados (via `drawSvgPath` no PDF / `borderRadius` na tela).
- "COMPROVANTE DE INSCRIÇÃO" (preto, caixa alta) + "CURSO DE DANÇAS GAÚCHAS" (verde), centralizados.
- Logo oficial centralizada, com marca d'água muito sutil (~5% opacidade, a própria logo ampliada — não há asset de silhueta gaúcha separado no projeto) e ornamento simples (linha + losango) nas laterais.
- Faixa verde escura cheia: ✓ + "INSCRIÇÃO CONFIRMADA" branco. Abaixo: "Parabéns! Sua inscrição foi realizada com sucesso."
- Campos com ícone (`@expo/vector-icons`, já usado no projeto), nesta ordem, cada um condicional à existência do dado: ALUNO(A) (`raw.customer.nome`/`sale.nome`), CPF (mascarado), CURSO (`getEventInfo(sale).name`), LOCAL (`evento.local`), INÍCIO DAS AULAS (`evento.data`), DIAS E HORÁRIOS*, MODALIDADES*, TEM PAR (`inscricao.semPar` invertido), PAR (`inscricao.nomePar`, só se houver par).
- Caixa "INFORMAÇÕES IMPORTANTES" com texto de `evento.observacao` (some se vazio, nunca texto fixo inventado).
- QR de validação no canto inferior direito.
- Rodapé verde escuro "Coração que dança, tradição que encanta!" + 💚❤️💛.

### 5.2 Ingresso (`EventTicket` + `EventTicketStub`)
~600×950pt, fundo preto. Documento em duas colunas: conteúdo principal + canhoto estreito à direita.
- Flyer do evento (`raw.evento.banner ?? raw.evento.imagemUrl`) ocupa o topo, `cover`-fit sem distorcer (crop calculado manualmente para o PDF, já que pdf-lib não recorta imagem nativamente; `resizeMode="cover"` na tela). O texto promocional ("BAILE DO ANO" etc.) já está dentro da imagem — o app nunca desenha texto por cima do flyer.
- **Fallback** (só quando `banner`/`imagemUrl` ausentes ou a imagem falha ao carregar): painel preto/vermelho/dourado com a logo centralizada + nome do evento — mantém a estrutura do ingresso, nunca ícone de imagem quebrada.
- Abaixo do flyer: barra DATA/INÍCIO/LOCAL → PORTADOR/CPF → VALOR/CÓDIGO DO INGRESSO → linha final com QR (esquerda) + caixa dourada "APRESENTE NA ENTRADA / Este QR Code é único e pessoal. Não compartilhe." (direita).
- Canhoto: separado por linha pontilhada/serrilhada (círculos "recortados" no PDF via `drawEllipse`; `borderStyle: 'dashed'` na tela), barcode Code128 vertical + código do ingresso em texto vertical.
- Fonte de dados: `raw.ingressos[ticketIndex]` ou `raw.loteIngresso.tickets[ticketIndex]` (código/QR individual, já usado por `getDocumentCode`), `sale.nome`/`cpf` (portador), `sale.valorUnitario`.

### 5.3 Cupom (`PaymentReceipt`)
Estreito e alto (~380×900pt), branco, borda superior serrilhada (círculos recortados).
- Logo + "GRUPO DE DANÇAS CORAÇÃO GAÚCHO"; linha de CNPJ/endereço só aparece se algum dia existir fonte de dado para isso — hoje some (ver 4.4).
- Título: constante configurável (`"CUPOM"` / `"COMPROVANTE DE PAGAMENTO"`), nunca "Nota Fiscal"/NFC-e.
- Nº do cupom (`sale.codigo`) / Data (`sale.createdAt`) / Código do ingresso / Forma de pagamento (`getReceiptPaymentMethodLabel`) → separador pontilhado → DADOS DO PARTICIPANTE (nome + CPF mascarado) → separador → tabela DESCRIÇÃO/QTD/UN/VL.UNIT/VL.TOTAL (`getReceiptItems`) → SUBTOTAL / desconto-ou-taxa (se houver) / **TOTAL** (`sale.valorTotal` — valor congelado da venda, nunca recalculado do preço atual do evento, como `getReceiptItems` já garante hoje) → valor pago + troco → Autenticação (hash determinístico já existente via `hashOf`) → QR → rodapé de agradecimento + 💚❤️💛 → barcode vertical na borda direita.

## 6. Fora do escopo (fica para processo de backend separado, fora deste repositório)

- Campos estruturados de `modalidades`/`diasHorarios` no evento.
- Dados institucionais de empresa (CNPJ/endereço) para o cupom.
- Página pública de validação (`/validar/ingresso/:codigo`) — o QR continua apontando para o código bruto compatível com o scanner interno.
- Qualquer novo endpoint `/admin/documentos/*` ou DTO de backend.
- App de cliente final.

## 7. Critério de aceite

A partir de uma `Sale` real já carregada em `SaleDetailsModal` (nenhum dado digitado manualmente), abrir "Visualizar documento" deve montar o documento correto (ingresso/inscrição/cupom conforme `sale.tipo`/status) com QR e barcode reais e permitir gerar/compartilhar o PDF — em web e nativo. Nenhum `mock*`/dado de exemplo no código final. Linhas de campos sem dado disponível somem, nunca aparecem vazias ou com texto inventado.

## 8. Verificação

`npm run validate` (typecheck + lint + doctor) limpo · `npm run test` sem regressão nos testes de service existentes · preview aberto no Expo (web e Android/iOS) a partir de uma venda real de cada tipo (`CURSO`, `BAILE`/`EVENTO`) · PDF gerado e compartilhado a partir de cada um dos 3 documentos, em web e nativo.
