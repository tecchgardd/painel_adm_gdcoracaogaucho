# Backend: módulo Cadastros (Pessoas, Inscrições, Colaboradores, Empresas)

O painel reorganizou Cadastros. Este documento lista o que a API precisa para cada melhoria. Tudo foi feito para **funcionar com a API atual**: campos ou filtros novos que a API ignorar só deixam de ter efeito, sem quebrar telas.

## 1. Pessoas (clientes e alunos)

Cliente e aluno são o mesmo cadastro (`customers`, chave CPF). Aluno é quem tem inscrição em curso; comprador é quem tem compra de ingresso.

### `GET /api/admin/customers`: filtros novos

| Parâmetro | Valores | Comportamento |
|---|---|---|
| `tipo` | `aluno` / `comprador` | `aluno`: com ao menos uma inscrição; `comprador`: com ao menos uma venda de ingresso |
| `status` | `ATIVO` / `INATIVO` | padrão do painel: `ATIVO` |
| `search` | texto | nome, e-mail, CPF ou telefone (comparar só dígitos para CPF/telefone) |

Em cada item, informar os papéis para o painel marcar "Aluno" e "Comprador": `aluno: boolean` e `comprador: boolean`, ou `_count: { inscricoes, vendas }`. Enquanto a API não filtrar, o painel filtra o que receber.

### `GET /api/admin/customers/:id/historico`

Já existe, mas o painel não usava. Agora a ficha da pessoa mostra o histórico. Formatos aceitos (qualquer um):

```json
{ "vendas": [...], "ingressos": [...], "inscricoes": [...], "cortesias": [...], "pagamentos": [...] }
```

ou uma lista `[{ "tipo": "VENDA" | "INGRESSO" | "INSCRICAO" | "CORTESIA" | "PAGAMENTO", ... }]`.

Em cada item: `id`, `createdAt`, `status`, `codigo` (≤ 8, ver `2026-10-03-modulo-comercial.md`), `valorTotal` quando houver, e o nome do evento/curso (`evento.nome` ou `curso.nome`).

### Exclusão × inativação

- O painel só oferece **Excluir** para quem não tem histórico; os demais são **inativados** (`PUT /admin/customers/:id` com `{ "status": "INATIVO" }`).
- A API deve **recusar** `DELETE` de pessoa com vendas, ingressos ou inscrições (409, com mensagem), mesmo vindo de outro cliente.
- CPF duplicado em `POST /admin/customers`: responder 409 com a mensagem. O painel já confere antes por `GET /admin/pessoas/by-cpf/:cpf`.

## 2. Inscrições

- `POST /api/admin/inscricoes` passa a receber `customerId` quando a pessoa já existe (vinda de "Inscrever em curso" na ficha, ou encontrada pelo CPF no formulário). Com `customerId`, **associar** à pessoa existente em vez de criar outra; atualizar os dados de contato apenas se vierem preenchidos.
- `cursoId` agora é escolhido numa lista de cursos ativos (`GET /admin/eventos?status=ATIVO`, `tipo = CURSO`); antes era digitado à mão.

## 3. Colaboradores

- **Desativar** em vez de remover: `PUT /api/admin/colaboradores/:id` com `{ "status": "INATIVO" }` deve **bloquear o login** do usuário vinculado (Better Auth: banir/desativar o usuário ou revogar sessões) e manter o histórico. `{ "status": "ATIVO" }` reativa.
- **Excluir definitivamente** continua existindo (`DELETE`), com o aviso de que apaga o usuário.
- Sugerido para próxima versão: `ultimoAcesso` (data do último login) em `GET /admin/colaboradores`.

## 4. Empresas

`POST /api/admin/empresas` e `PATCH /api/admin/empresas/:id` (multipart) passam a enviar:

| Campo | Tipo | Observação |
|---|---|---|
| `tipo` | `PATROCINADOR` / `APOIADOR` / `PARCEIRO` | |
| `link` | URL `https://...` ou vazio | vazio remove o link |
| `vigenciaInicio` | `AAAA-MM-DD` ou vazio | a partir de quando aparece no site |
| `vigenciaFim` | `AAAA-MM-DD` ou vazio | até quando aparece; vazio = sem prazo |
| `ordem` | número | já existia; menor aparece primeiro |
| `publicado` | `true`/`false` | já existia |
| `imagem` | arquivo | já existia; agora também enviado pelo app (Android/iOS), não só pela web |

Devolver esses campos em `GET /admin/empresas`. A **landing page** deve exibir apenas empresas publicadas, ativas e dentro da vigência, ordenadas por `ordem`, com o logo apontando para `link` quando houver.

## 5. Registro de atividades

Todas as ações acima (criar/editar/inativar pessoa, inscrição, desativar/reativar colaborador, publicar/ocultar empresa) devem gerar registro (`registrarAtividade`, ver `2026-10-03-usuario-foto-registro.md`).
