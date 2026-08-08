# Documentos de comprovante (inscrição, ingresso, cupom) — Design

Data: 2026-08-08
Repositórios envolvidos:
- `painel-admin` (Expo/React Native, SDK 57) — telas, componentes, geração de PDF.
- `backend/backend` (Node/TS, Prisma/PostgreSQL) — endpoints e DTOs de documento.

## 1. Objetivo

Implementar 3 documentos fiéis à referência visual oficial (imagem fornecida pelo usuário em 2026-08-08):

1. **Comprovante de Inscrição** de curso — folha branca/verde.
2. **Ingresso** de baile/evento — ticket preto/dourado com o flyer real do evento + canhoto com barcode.
3. **Cupom/Comprovante de Pagamento** — recibo estilo térmico branco/preto.

Público-alvo: **somente STAFF/ADMIN**, dentro do `painel-admin` (não existe app do cliente final hoje — auth do app é só admin/staff/checkin). As telas ficam em `app/(admin)/documentos/...`.

Todos os dados exibidos vêm do banco via API — zero dado digitado manualmente, zero mock no código final.

## 2. Arquitetura geral

```
PostgreSQL → Prisma → *.service.ts → *.controller.ts → /api/admin/documentos/*
                                                                  ↓
                                    painel-admin → documentos.service.ts (API)
                                                                  ↓
                                app/(admin)/documentos/**  (telas fiéis à imagem)
                                                                  ↓
                     src/services/documents.service.ts (pdf-lib, já existe) → PDF/Share/Print
```

Cada tela faz **uma única chamada** ao backend, que já retorna o DTO pronto (participante, evento, valores da transação, payload de QR/barcode). Nada de múltiplos requests soltos no app para montar um documento.

Reaproveitamento explícito (nada duplicado):
- `src/services/documents.service.ts` (pdf-lib + `qrcode`) já existe e continua sendo o motor de PDF — estendido, não recriado.
- `src/components/documents/` já existe — os novos componentes entram como subpastas dela, substituindo os componentes genéricos atuais (`DocumentHeader`, `TicketCard`, `DocumentQRCode` com ícone falso) que não reproduzem a referência.
- A aba "Documentos" do `SaleDetailsModal` passa a ter 3 botões que navegam para as novas telas em tela cheia (em vez de renderizar inline).

Ingresso cobre os **dois** models de ticket do backend (`Ingresso` avulso e `IngressoAluno` de lote/curso) — o backend normaliza os dois no mesmo `TicketDocumentDTO`.

## 3. Backend

### 3.1 Alteração de schema (única)

```prisma
model Evento {
  // ...campos existentes...
  modalidades   String?   // ex: "Xote, Vaneira, Vanerão, Milonga, Bugio, Marchinha, Valsa, Chamamé e Rancheira"
  diasHorarios  String?   // ex: "Terças-feiras - 20:00"
}
```
Nullable, não quebra nada existente. Editáveis no form de evento/curso do admin (`EventFormModal.tsx`). Se vazios, a linha correspondente some do comprovante (nunca aparece em branco).

Nenhuma outra alteração de schema é necessária — os demais dados (código legível do ingresso, autenticação do cupom) são **derivados** de campos já existentes, nunca armazenados de novo (ver 3.3).

### 3.2 Novo módulo `src/modules/documentos/`

`documentos.routes.ts` / `.controller.ts` / `.service.ts` / `.dto.ts`, montado em `/api/admin/documentos`, protegido por `authMiddleware + requireRoles('ADMIN','STAFF')` (mesmo padrão dos módulos irmãos `vendas`/`ingressos`).

| Endpoint | Fonte no banco | Retorna |
|---|---|---|
| `GET /documentos/inscricao/:id` | `Inscricao → Customer, Evento` | `InscricaoDocumentDTO` |
| `GET /documentos/ingresso/:id` | `Ingresso → Customer, Evento, Pedido?, Pagamento` | `TicketDocumentDTO` |
| `GET /documentos/ingresso-aluno/:id` | `IngressoAluno → LoteIngressoAluno → Customer, Evento` | `TicketDocumentDTO` (mesmo formato) |
| `GET /documentos/comprovante/:pedidoId` | `Pedido → Customer, PedidoItem[], Pagamento[]` | `PaymentReceiptDTO` |

### 3.3 Regras de derivação (sem novas colunas além de 3.1)

- **CPF mascarado**: novo helper `maskCpf()` (formato `120.***.***-99`), aplicado nos 3 DTOs. CPF completo nunca sai desses endpoints.
- **Código legível do ingresso avulso** (`Ingresso` não tem código tipo "CGS-2026-00001" hoje): gerado como `CGS-{ano de createdAt}-{id com zeros à esquerda}` — determinístico a partir de campos imutáveis (id/createdAt), sempre o mesmo a cada chamada. `IngressoAluno` já tem `codigo` único e estável — usado diretamente.
- **Payload do QR**: `{VALIDATION_BASE_URL}/validar/ingresso/{codigo}` e `.../inscricao/{id}` (nova env var `VALIDATION_BASE_URL`).
- **Barcode**: mesmo `codigo` usado no QR do ingresso, codificado como Code128.
- **Autenticação do cupom**: `pagamento.gatewayId` (já existe, único) formatado em grupos hex; se ausente (ex. cortesia), hash determinístico de `pedido.id + createdAt` (nunca aleatório a cada abertura).
- **Subtotal/Taxa-ou-Desconto/Total do cupom**: `subtotal = soma(pedidoItem.total)`, `total = pedido.total` (valor real da transação — nunca `evento.preco` atual, para preservar histórico). A diferença vira "Taxa de Serviço" (positiva) ou "Desconto" (negativa); linha some se for zero.
- **Forma de pagamento / data / autenticação**: do `Pagamento` com `status = PAGO` vinculado ao pedido — não do texto livre do pedido.
- **Empresa (CNPJ/endereço/cidade)**: env vars `COMPANY_NAME`, `COMPANY_CNPJ`, `COMPANY_ADDRESS`, `COMPANY_CITY`, incluídas no `PaymentReceiptDTO.empresa`.

## 4. Frontend (painel-admin)

### 4.1 Componentes

```
src/components/documents/
  shared/
    DocumentLogo.tsx       # assets/logo-oficial.jpeg (logo oficial, não redesenhada)
    DocumentQRCode.tsx     # QR real via react-native-qrcode-svg
    DocumentBarcode.tsx    # Code128 real, orientação horizontal ou vertical
    DocumentDivider.tsx    # sólido / pontilhado
    DocumentField.tsx      # ícone + rótulo + valor
    ScaledDocument.tsx     # dimensão fixa, escala proporcional, centralizado, nunca deforma
  CourseRegistrationReceipt/{CourseRegistrationReceipt.tsx, styles.ts}
  EventTicket/{EventTicket.tsx, EventTicketStub.tsx, styles.ts}
  PaymentReceipt/{PaymentReceipt.tsx, styles.ts}
```

Os componentes genéricos atuais (`DocumentHeader`, `TicketCard`, `DocumentQRCode` com ícone, `ReceiptItems`, `ReceiptTotals`, `RegistrationForm`, `DocumentSection`, `DocumentRow`, `DocumentFooter`) são **substituídos** por esses — eles hoje são só um card escuro genérico, o que o usuário pediu explicitamente para não ter.

Os componentes compartilhados recebem cor/variante por prop — cada documento aplica sua própria paleta (não existe um "estilo único" forçado nos três).

### 4.2 Telas (expo-router)

```
app/(admin)/documentos/inscricao/[id].tsx
app/(admin)/documentos/ingresso/[id].tsx      # ?origem=avulso|aluno
app/(admin)/documentos/comprovante/[id].tsx   # id = pedidoId
```

Cada tela: `useApiQuery` (hook já usado no projeto) → `loading` (`DocumentSkeleton`) / `error` (`DocumentError` com retry) / sucesso (documento fiel dentro de `ScaledDocument`) + botões **Compartilhar** / **Gerar PDF** fixos abaixo.

Pontos de entrada (navegação, sem duplicar dados):
- `vendas.tsx` → "Ver Ingresso" / "Ver Cupom" (quando pago/cortesia).
- Tela de inscrições de curso (`cursos.tsx`/`alunos.tsx`) → "Ver Comprovante".
- `ingressos.tsx` (lotes `IngressoAluno`) → "Ver Ingresso" por aluno (`?origem=aluno`).
- `SaleDetailsModal` → aba Documentos vira 3 botões de navegação.

### 4.3 Serviços

- `src/services/documentos.service.ts` (novo, português — mesmo padrão de `eventos.service.ts`): chamadas HTTP aos 3 endpoints.
- `src/services/documents.service.ts` (já existe, inglês — motor de PDF): mantém import dinâmico já usado; `createTicketPdf/createReceiptPdf/createRegistrationPdf` são substituídas por `createEventTicketPdf`, `createCourseRegistrationPdf`, `createPaymentReceiptPdf` fiéis ao novo layout (incluindo embutir o flyer real do evento no PDF via fetch + `embedJpg/embedPng`). Funções de entrega (`download/view/share/WhatsApp`) mantidas como estão.

### 4.4 Bibliotecas

| Necessidade | Decisão |
|---|---|
| QR na tela | **nova dep** `react-native-qrcode-svg` (o `qrcode` já instalado só gera para dentro do PDF) |
| QR no PDF | `qrcode` (já existe) |
| Barcode (tela + PDF) | **sem nova dependência** — encoder Code128 pequeno e puro, mesmo array de barras alimenta a tela (Views rotacionadas -90° no canhoto) e o PDF (retângulos pdf-lib) |
| PDF | `pdf-lib` (já existe) |
| Fontes | `Barlow Condensed` 700/900 (títulos, condensada e forte) via `expo-font` + fonte padrão do sistema para texto normal — só 2 famílias |

### 4.5 Tipos

`src/types/entities.ts` (fonte já usada pelos services relevantes) recebe `InscricaoDocument`, `TicketDocument`, `PaymentReceiptDocument`, espelhando os DTOs do backend. Não usa `src/types/index.ts` (mais antigo/duplicado).

## 5. Especificação visual

Paleta dedicada (`src/theme/documentColors.ts`, separada do tema escuro do app — cores fixas de marca):
```
comprovante: bg #FFFFFF · faixa/rodapé verde #1B5E20 (rodapé #124A19) · texto #111 · badges #2E7D32
ingresso:    bg #0A0A0A · dourado #D9A62E · texto branco
cupom:       bg #FFFFFF · texto/traços #111 · pontilhado #888
hearts:      verde #2E7D32 · vermelho #C62828 · amarelo #F9A825
```

### 5.1 Comprovante de Inscrição
Folha branca vertical, cantos arredondados (~20), sombra leve.
- "COMPROVANTE DE INSCRIÇÃO" (preto, caixa alta, forte) + "CURSO DE DANÇAS GAÚCHAS" (verde, forte), centralizados.
- Logo oficial centralizada (~140px) sobre floreio/silhueta de dançarinos bem sutil (~6-8% opacidade, decoração genérica, não reprodução exata da arte de referência).
- Faixa verde cheia: ✓ em círculo branco + "INSCRIÇÃO CONFIRMADA" branco forte. Abaixo: "Parabéns! Sua inscrição foi realizada com sucesso." (texto institucional fixo).
- Campos (ícone circular verde + rótulo caixa-alta pequeno + valor em negrito), na ordem: ALUNO(A), CPF, CURSO, LOCAL, INÍCIO DAS AULAS, DIAS E HORÁRIOS, MODALIDADES, TEM PAR (+ PAR se `temPar`).
- Caixa cinza clara "ℹ️ INFORMAÇÕES IMPORTANTES" com texto de `evento.observacao` (some se vazio).
- QR de validação ao lado da caixa de informações.
- Rodapé verde escuro "Coração que dança, tradição que encanta!" itálico branco; fora do rodapé, 💚❤️💛.

### 5.2 Ingresso
Fundo preto, proporção fixa (documento nunca deforma, só escala na tela).
- O texto de marketing sobre o flyer ("SÁB.30 MAIO", "BAILE DO ANO"...) já está **dentro da imagem** `evento.banner` enviada pelo admin — o app não desenha texto por cima, só exibe fiel (`cover`, sem distorcer).
- Abaixo do flyer, chrome desenhado pelo app: barra DATA/INÍCIO/LOCAL → barra PORTADOR/CPF → barra VALOR/CÓDIGO → linha final com QR branco + caixa dourada "APRESENTE NA ENTRADA" / "Este QR Code é único e pessoal. Não compartilhe."
- Fallback elegante (gradiente escuro + nome do evento + marca-d'água da logo) só quando `banner` ausente/falha — nunca ícone de imagem quebrada.
- **Canhoto** (`EventTicketStub`): linha pontilhada vertical + coluna preta estreita com barcode vertical + código do ingresso rotacionado 90°.

### 5.3 Cupom
Folha branca estreita (proporção de cupom térmico), borda superior serrilhada, cantos inferiores arredondados.
- Cabeçalho: logo pequena + "GRUPO DE DANÇAS / CORAÇÃO GAÚCHO" + CNPJ/endereço/cidade (env vars).
- Título "CUPOM" / "COMPROVANTE DE PAGAMENTO" — string configurável via constante, não hardcoded no componente.
- Nº do cupom / Data / Código do ingresso / Forma de pagamento → dados do participante → tabela de itens → SUBTOTAL / TAXA-ou-DESCONTO / **TOTAL** → "Valor pago via X" / "Troco" (calculado: `total - valorPago`, nunca fixo).
- Autenticação + "consulte pela chave de acesso" + QR + "Obrigado por prestigiar a cultura gaúcha!" + slogan itálico + 💚❤️💛.

## 6. Fora do escopo

- App do cliente final (arquitetura preparada, não implementado).
- Tela de configuração de empresa no admin (env vars agora; tabela fica para depois).
- Alterações no fluxo/lógica do scanner de validação (`/admin/scanner/validar`) — só passa a receber QRs já compatíveis com o formato que ele espera.
- Reembolso, cancelamento e demais fluxos de pagamento.

## 7. Critério de aceite

Abrir uma tela passando só o ID real do banco (`inscricaoId`, `ingressoId`, `pedidoId`) é suficiente para localizar participante, evento, flyer, valores, montar QR/barcode e gerar PDF — nada digitado manualmente. Nenhum `mock*`/dado de exemplo sobra no código final.

## 8. Verificação

`tsc`/typecheck limpo nos dois repos · `eslint` sem erros · migration Prisma aplicada localmente · telas abertas no Expo (web ou Android) com `inscricaoId`/`ingressoId`/`pedidoId` reais do banco · PDF gerado e compartilhado a partir de cada uma das 3 telas.
