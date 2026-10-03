# Backend: login por usuário, foto do colaborador e registro de atividades

O painel administrativo já está pronto para estas três funcionalidades. Este documento descreve o que a API (`backend-coracaogaucho`) precisa expor para elas funcionarem. Enquanto o backend não for atualizado, o painel se comporta assim:

| Funcionalidade | Sem backend atualizado |
|---|---|
| Login por usuário | Login por e-mail continua funcionando. Ao tentar entrar com usuário, a rota responde 404 e o painel mostra "Login por usuário ainda não está disponível. Entre com o seu e-mail." |
| Usuário e foto do colaborador | O painel envia `username` e `fotoUrl`; se a API ignorar esses campos, eles não são salvos. O usuário é obrigatório no formulário. |
| Registro de atividades | A tela mostra "Registro ainda não disponível" enquanto `GET /api/admin/registros` responder 404. |

---

## 1. Login por usuário

O painel usa o mesmo campo para e-mail ou usuário. Se o texto tem `@`, chama a rota de e-mail; senão, a de usuário:

```http
POST /api/auth/sign-in/username
Content-Type: application/json

{ "username": "maria.fernandes", "password": "••••••••" }
```

A resposta deve ter **o mesmo formato** de `POST /api/auth/sign-in/email`: corpo com `user` e `token`, e o cabeçalho `set-auth-token` (plugin `bearer`). O painel guarda o token igual hoje.

### Configuração (Better Auth)

Habilitar o plugin oficial `username`:

```ts
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';

export const auth = betterAuth({
  // ...configuração atual (bearer, trustedOrigins etc.)
  plugins: [
    // ...plugins atuais
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      // mesma regra validada no painel: minúsculas, números, ponto e _
      usernameValidator: (value) => /^[a-z0-9._]+$/.test(value)
    })
  ]
});
```

O plugin adiciona as colunas `username` (única) e `displayUsername` na tabela de usuário. Rodar a migração do Better Auth (`npx @better-auth/cli migrate` ou `generate`, conforme o ORM).

Credencial inválida deve responder **401**, como no login por e-mail. Não diferenciar "usuário não existe" de "senha errada".

---

## 2. Colaborador: usuário e foto

### Campos novos em `POST /api/admin/colaboradores` e `PUT /api/admin/colaboradores/:id`

| Campo | Tipo | Regra |
|---|---|---|
| `username` | string | Obrigatório na criação. 3–30 caracteres, `^[a-z0-9._]+$`, único entre usuários. O painel já envia em minúsculas. |
| `fotoUrl` | string \| null | URL HTTPS retornada por `POST /api/uploads/image` (já existente). `null` remove a foto. Campo ausente = manter a foto atual. |

Ao salvar, gravar `username` também no **usuário vinculado do Better Auth** (é ele que o login consulta) e `fotoUrl` em `user.image`.

Conflito de usuário: responder **409** com `{ "message": "Este usuário já está em uso." }`. O painel exibe a `message` no topo do formulário.

### Campos novos em `GET /api/admin/colaboradores`

Cada item deve trazer `username` e `fotoUrl`. O painel também aceita `user.username` e `user.image`, então basta um dos dois.

### Colaboradores existentes

Os atuais não têm usuário, e o painel exige o campo ao editar. Recomendado: uma migração que preencha `username` a partir do nome (`primeiro.ultimo`, sem acentos, com sufixo numérico em caso de repetição), para todos já poderem entrar por usuário.

---

## 3. Registro de atividades

Objetivo: saber **quem fez o quê, e quando**, na plataforma. O registro precisa ser gravado **no servidor**, no mesmo ponto em que a ação acontece. O painel apenas consulta.

### Tabela `registro_atividade`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | bigint / uuid | PK |
| `createdAt` | timestamptz | default now(); **índice** |
| `autorId` | FK usuário, nullable | `null` = ação do sistema (webhook Stripe, rotinas); **índice** |
| `acao` | enum/text | ver tabela de ações abaixo |
| `entidade` | text | ver tabela de entidades abaixo; **índice** |
| `entidadeId` | text, nullable | id ou código do registro afetado (ex.: `VEN-2026-0101`) |
| `descricao` | text, nullable | frase curta opcional ("Reembolso parcial de R$ 30,00") |
| `alteracoes` | jsonb, nullable | `[{ "campo": "status", "antes": "PENDENTE", "depois": "PAGO" }]` — só campos que mudaram |
| `ip` | text, nullable | |
| `userAgent` | text, nullable | |

**Nunca** gravar em `alteracoes` senha, hash, token, segredo da Stripe ou dados de cartão. Para senha, registrar só a ação `SENHA`, sem valores.

### Como gravar

Uma função única, chamada depois que a operação der certo (de preferência na mesma transação):

```ts
await registrarAtividade({
  autorId: req.user?.id ?? null,
  acao: 'ATUALIZAR',
  entidade: 'VENDA',
  entidadeId: venda.codigo,
  descricao: 'Forma de pagamento corrigida',
  alteracoes: diff(antes, depois), // só campos alterados, sem campos sensíveis
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

Uma falha ao gravar o registro não deve desfazer nem quebrar a operação principal se ela já foi confirmada: logar o erro e seguir.

### Ações (`acao`)

| Valor | Quando gravar |
|---|---|
| `CRIAR` | Qualquer criação via painel (venda, cliente, evento, colaborador, cortesia...) |
| `ATUALIZAR` | Edição de dados |
| `EXCLUIR` | Remoção |
| `STATUS` | Mudança só de status (cancelar evento, ativar/inativar colaborador) |
| `LOGIN` | Login com sucesso (hook `after` do Better Auth nas rotas de sign-in) |
| `LOGIN_FALHOU` | Login recusado, com `descricao` (ex.: "Senha incorreta") e o identificador digitado em `entidadeId` |
| `LOGOUT` | Sign-out |
| `SENHA` | Reset/troca de senha |
| `PAGAMENTO` | Baixa manual, pagamento externo, confirmação por webhook (`autorId` null no webhook) |
| `REEMBOLSO` | Reembolso total ou parcial |
| `VALIDACAO` | Check-in de ingresso (scanner) |
| `EXPORTAR` | Exportação de relatório (PDF/CSV/XLSX) |
| `OUTRO` | Qualquer outra coisa relevante |

### Entidades (`entidade`)

`VENDA`, `PAGAMENTO`, `PEDIDO`, `INGRESSO`, `LOTE`, `CORTESIA`, `EVENTO`, `BAILE`, `CURSO`, `INSCRICAO`, `ALUNO`, `CLIENTE`, `EMPRESA`, `COLABORADOR`, `FOTO`, `AGENTE_IA`, `RELATORIO`, `AUTENTICACAO`, `SISTEMA`.

O painel traduz esses valores. Um valor novo aparece em minúsculas, sem quebrar a tela.

### Rota de consulta

```http
GET /api/admin/registros?page=1&limit=30&acao=ATUALIZAR,STATUS&dataInicial=2026-09-26T03:00:00.000Z
Authorization: Bearer <token>
```

- **Somente `ADMIN`**: outros papéis recebem 403. O painel já esconde a tela de `STAFF` e `CHECKIN`, mas a regra precisa valer na API.
- Ordenação: `createdAt` decrescente.

| Parâmetro | Descrição |
|---|---|
| `page`, `limit` | Paginação (limitar `limit` a 100) |
| `search` | Busca em nome/e-mail/usuário do autor, `entidadeId` e `descricao` |
| `acao` | Uma ou mais ações separadas por vírgula |
| `entidade` | Filtra por área |
| `usuarioId` | Filtra por autor |
| `dataInicial`, `dataFinal` | Intervalo em ISO 8601 |

Resposta:

```json
{
  "data": [
    {
      "id": 1,
      "createdAt": "2026-10-03T19:42:00.000Z",
      "autor": { "id": "1", "nome": "Fran Oliveira", "email": "fran@...", "username": "fran.oliveira", "role": "ADMIN", "fotoUrl": null },
      "acao": "ATUALIZAR",
      "entidade": "VENDA",
      "entidadeId": "VEN-2026-0101",
      "descricao": "Forma de pagamento corrigida",
      "alteracoes": [{ "campo": "formaPagamento", "antes": "DINHEIRO", "depois": "PIX_EXTERNO" }],
      "ip": "177.12.40.8",
      "userAgent": "Mozilla/5.0 ..."
    }
  ],
  "total": 240,
  "page": 1,
  "limit": 30
}
```

`autor` é `null` para ações do sistema. O painel também aceita nomes em inglês (`user`, `action`, `entity`, `entityId`, `changes` com `before`/`after`, `timestamp`), então não é preciso renomear se já existir algo parecido.

### Retenção

Os registros crescem rápido (todo login gera um). Sugestão: manter 12 meses e apagar os mais antigos com uma rotina mensal.

---

## Checklist

- [ ] Plugin `username` habilitado e migração aplicada
- [ ] `POST /api/auth/sign-in/username` respondendo como o login por e-mail (token + `set-auth-token`)
- [ ] `username` e `fotoUrl` aceitos e devolvidos em `/api/admin/colaboradores`; `409` para usuário repetido
- [ ] Usuários existentes com `username` preenchido (migração)
- [ ] Tabela `registro_atividade` + função `registrarAtividade`
- [ ] Registro gravado nas rotas do painel, nos hooks de login/logout e no webhook da Stripe
- [ ] `GET /api/admin/registros` (somente ADMIN) com filtros e paginação
