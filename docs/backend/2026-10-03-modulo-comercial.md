# Backend: módulo comercial (ingressos e inscrições)

Escopo: só **ingressos de eventos e bailes** e **inscrições de cursos**. Venda de produtos (pedidos da loja) está fora; os registros antigos ficam preservados, mas o painel não oferece mais a tela no menu.

O painel já foi ajustado para os itens marcados **[painel pronto]**. Os demais são pré-requisito das próximas fases do painel.

---

## 1. Código do ingresso e da inscrição — obrigatório

Todo ingresso e toda inscrição têm um **código de no máximo 8 caracteres, só letras maiúsculas e números** (`^[A-Z0-9]{1,8}$`). Sem hífen, sem prefixo (`WPP-`, `ING-`), nada além disso. **[painel pronto]**: o scanner aceita digitação de até 8 caracteres e normaliza para maiúsculas.

- O **QR Code contém exatamente esse código**, o mesmo que vai impresso no documento.
- **Recomendado: sempre 8 caracteres**, sorteados de um alfabeto sem caracteres ambíguos: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sem `0/O`, `1/I/L`). São 32⁸ ≈ 1,1 trilhão de combinações, curtas para digitar e difíceis de adivinhar.
- Gerar com gerador criptográfico (`crypto.randomInt`), nunca sequencial ou derivado de id/CPF.
- **Índice único** na coluna; em colisão, sortear de novo (até 5 tentativas).
- Vale para o código da **venda/inscrição** exibido no comprovante de inscrição (campo "Nº da inscrição") e para o **código de cada ingresso**. Hoje a API gera códigos como `WPP-92EA56B292B3` (16 caracteres): isso precisa mudar.
- **Códigos antigos:** ingressos já enviados aos clientes continuam válidos pelo QR. Para a digitação na portaria (limitada a 8), gerar um código curto novo para os ingressos ainda não utilizados de eventos futuros, mantendo o antigo como alias aceito por `POST /admin/scanner/validar`.

## 2. Cortesias **[painel pronto]**

`POST /api/admin/cortesias`, **somente ADMIN** (403 para outros papéis):

```json
{ "customerId": "123", "cpf": "12345678909", "eventoId": "45", "quantidade": 2, "motivo": "Convidado da diretoria do CTG" }
```

- `motivo` obrigatório (mín. 10 caracteres) e `quantidade` de 1 a 20 (o painel já valida; validar também na API).
- Gera `quantidade` ingressos marcados como cortesia, **sem comprovante de pagamento**.
- Grava `responsavel` (usuário logado) e registra `CRIAR` / `CORTESIA` no Registro de atividades.
- `GET /api/admin/cortesias` deve devolver em cada item: `nome`, `cpf`, `evento { id, nome, data }`, `quantidade`, `motivo`, `responsavel { id, nome }`, `status`, `createdAt`.
- `PATCH /api/admin/cortesias/:id/cancelar`: somente ADMIN; cancela os ingressos gerados.

Se o CPF não existir, o painel cadastra a pessoa antes (`POST /admin/clientes`) e envia o `customerId`.

## 3. Ingressos **[painel pronto]**

A tela Ingressos do painel não gera mais lotes: consulta e gerencia ingressos emitidos por venda ou cortesia.

`GET /api/admin/ingressos`: cada item com `id`, `codigo` (≤ 8, ver §1), `status`, `evento { id, nome, data }`, `customer { nome, cpf, telefone }` (comprador), `portadorNome`, `portadorCpf`, `vendaId`, `cortesia` (bool), `validadoEm`, `validadoPor { nome }`. O painel aceita esses dados também aninhados em `lote` ou `venda`.

Situações exibidas (o painel converte os status atuais):

| Situação | Status aceitos |
|---|---|
| Reservado | `PENDENTE`, `RESERVADO`, `AGUARDANDO_PAGAMENTO`, `PROCESSANDO` |
| Liberado | `ATIVO`, `LIBERADO`, `VALIDO`, `PAGO`, `EMITIDO`, `CORTESIA` |
| Utilizado | `UTILIZADO`, `VALIDADO`, `USADO` (ou `validadoEm` preenchido) |
| Cancelado | `CANCELADO`, `EXPIRADO`, `ESTORNADO`, `REEMBOLSADO` |

`PATCH /api/admin/ingressos/:id`:
- **Troca de portador:** `{ "portadorNome": "Ana Souza", "portadorCpf": "12345678909" }`. Permitida só antes do check-in; o ingresso utilizado responde 409.
- **Cancelamento** (somente ADMIN): `{ "status": "CANCELADO", "motivo": "..." }`. Não estorna o pagamento automaticamente.
- As duas ações registram atividade (`ATUALIZAR` / `STATUS`, entidade `INGRESSO`).

**Lotes:** remover as origens `SEM_COBRANCA` e `VENDA_EXISTENTE`. As rotas `/admin/ingressos/lotes*` deixam de ser usadas pelo painel; a emissão acontece pela venda ou pela cortesia.

## 4. Check-in atômico

`POST /api/admin/scanner/validar` e `/digitar-codigo`:
- Marcar como utilizado com uma operação condicional (`UPDATE ingresso SET status='UTILIZADO', validadoEm=now(), validadoPorId=? WHERE codigo=? AND status IN (...liberado)`): se nenhuma linha for afetada, responder "já utilizado" com horário e operador da primeira entrada. Assim, duas leituras simultâneas nunca liberam duas entradas.
- Responder também `evento`, `portadorNome` e `validadoEm` para o painel exibir.
- Registrar `VALIDACAO` no Registro de atividades.

## 5. Próximas fases (pré-requisitos da nova venda em etapas)

- **Venda:** `POST /api/admin/vendas` passa a aceitar, além dos campos atuais: `loteId` (lote comercial: 1º lote, 2º lote...), `portadores: [{ nome, cpf? }]` (opcional, um por ingresso; sem portador, vale o comprador), `participantes` (inscrição: aluno, par, padrinhos), `referenciaPagamento` (obrigatória para Pix e cartão externo), `motivoDesconto`. Resposta com `reservaExpiraEm`, `checkoutUrl`, `ingressos[]` e `inscricao`.
- **Reserva com prazo:** venda pendente ocupa a vaga (capacidade do evento / quantidade do lote / vagas da turma) até `reservaExpiraEm`; a Checkout Session da Stripe usa o mesmo `expires_at`; uma rotina libera reservas vencidas; pagamento que chegar depois do vencimento vira ocorrência a resolver, sem emitir automaticamente.
- **Emissão só na confirmação e sem duplicidade:** ingressos/inscrição liberados quando o pagamento é confirmado no servidor (webhook), com idempotência por evento da Stripe / PaymentIntent.
- **Pagamento externo no lugar da Stripe:** expirar a Checkout Session aberta antes de registrar; se a Stripe já tiver pago, registrar a duplicidade como ocorrência.
- **Situações separadas:** venda (rascunho, aberta, concluída, cancelada), financeiro (sem cobrança, pendente, parcialmente pago, pago, parcialmente reembolsado, reembolsado), ingresso (§3) e inscrição (aguardando pagamento, confirmada, cancelada).
