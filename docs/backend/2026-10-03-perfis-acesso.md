# Backend: perfis de acesso e permissões

O painel ganhou o módulo **Perfis de acesso** (Administração → Perfis de acesso), no estilo do GLPI:

- cada colaborador tem **um perfil**;
- o perfil diz quais telas aparecem e quais ações ficam liberadas em cada uma (ver, criar, editar, excluir e ações especiais, como reembolsar ou exportar);
- não há exceções por usuário: para mudar o acesso de alguém, troca-se o perfil dele ou cria-se outro perfil.

Tudo **funciona com a API atual**:

- sem `/admin/perfis`, o painel mostra os três perfis padrão (Administrador, Atendimento e Portaria) somente para leitura;
- o acesso continua vindo do `role` (`ADMIN`, `STAFF`, `CHECKIN`), com o mesmo comportamento de antes.

O painel só esconde telas e botões. **Quem garante a permissão é a API**: cada rota precisa conferir a permissão do usuário, como está na seção 4.

## 1. Catálogo de permissões

As permissões são chaves `modulo.acao`. A lista oficial é `MODULOS` em `src/core/permissions/catalogo.ts`; o backend deve usar as mesmas chaves.

| Módulo | Chaves |
|---|---|
| Dashboard | `dashboard.ver` |
| Eventos, bailes e cursos | `eventos.ver`, `eventos.criar`, `eventos.editar` |
| Check-in | `checkin.ver` (validar ingresso e ver o histórico) |
| Vendas | `vendas.ver`, `vendas.criar`, `vendas.pagamento` (gerar link Stripe, alterar ou substituir o pagamento da venda) |
| Ingressos | `ingressos.ver`, `ingressos.editar` (trocar portador), `ingressos.cancelar` |
| Inscrições | `inscricoes.ver`, `inscricoes.criar`, `inscricoes.editar`, `inscricoes.exportar` |
| Pagamentos | `pagamentos.ver`, `pagamentos.editar` (editar, dar baixa, cancelar), `pagamentos.reembolsar` |
| Cortesias | `cortesias.ver`, `cortesias.criar` (emitir), `cortesias.cancelar`, `cortesias.exportar` |
| Pessoas | `pessoas.ver`, `pessoas.criar`, `pessoas.editar` (inclui inativar e reativar), `pessoas.excluir` |
| Empresas | `empresas.ver`, `empresas.criar`, `empresas.editar`, `empresas.excluir` |
| Colaboradores | `colaboradores.ver`, `colaboradores.criar`, `colaboradores.editar` (inclui senha e desativação), `colaboradores.excluir` |
| Perfis de acesso | `perfis.ver`, `perfis.criar`, `perfis.editar`, `perfis.excluir` |
| Relatórios | `relatorios.ver`, `relatorios.exportar` |
| Registro de atividades | `registros.ver` |
| Fotos | `fotos.ver`, `fotos.criar` (enviar) |
| Agente IA | `agente-ia.ver`, `agente-ia.criar`, `agente-ia.editar`, `agente-ia.excluir` |

**Regras:**

- `*` significa acesso total e é reservado ao perfil Administrador.
- Qualquer ação de um módulo implica o `ver` desse módulo. O painel já envia normalizado, mas a API deve aplicar a mesma regra ao conferir.
- Chaves desconhecidas são ignoradas, não recusadas. Assim um painel mais novo não quebra uma API mais velha.

## 2. Tabela e migração

```
perfis_acesso
  id           text/uuid  PK
  nome         text       único (sem diferenciar maiúsculas)
  descricao    text       null
  permissoes   text[]     (ou jsonb)
  sistema      boolean    default false   -- true só no Administrador: não edita, não exclui
  role         text       ADMIN | STAFF | CHECKIN  -- tipo de acesso antigo equivalente
  created_at, updated_at

colaboradores.perfil_id  FK -> perfis_acesso.id  (not null depois da migração)
```

A migração cria os três perfis padrão com os mesmos `id`s que o painel usa, e então preenche `perfil_id` de cada colaborador a partir do `role` atual:

| id | nome | role | permissões |
|---|---|---|---|
| `administrador` | Administrador | ADMIN | `["*"]`, `sistema = true` |
| `atendimento` | Atendimento | STAFF | todas, exceto colaboradores.\*, perfis.\*, relatorios.\*, `registros.ver`, `pagamentos.reembolsar`, `cortesias.criar`, `cortesias.cancelar`, `ingressos.cancelar`, `agente-ia.excluir` |
| `portaria` | Portaria | CHECKIN | `["checkin.ver"]` |

Esses perfis reproduzem exatamente o acesso que cada `role` tem hoje no painel (`PERFIS_PADRAO` no catálogo).

## 3. Endpoints

Todos exigem a permissão indicada; sem ela, a resposta é 403.

| Método | Rota | Permissão | Observações |
|---|---|---|---|
| GET | `/api/admin/perfis` | `perfis.ver` ou `colaboradores.ver` | Lista. Cada item tem `id`, `nome`, `descricao`, `permissoes[]`, `sistema`, `role` e `usuarios` (quantos colaboradores usam o perfil; `_count.colaboradores` também é aceito) |
| POST | `/api/admin/perfis` | `perfis.criar` | Corpo `{ nome, descricao?, permissoes[], role }`. Nome repetido: 409 |
| PUT | `/api/admin/perfis/:id` | `perfis.editar` | Mesmo corpo. Perfil com `sistema = true`: 403 |
| DELETE | `/api/admin/perfis/:id` | `perfis.excluir` | Perfil `sistema` ou com colaboradores: 409, com mensagem |

**Sobre o `role` no corpo:** o painel envia o tipo de acesso antigo mais próximo (só check-in → `CHECKIN`; o resto → `STAFF`). A API pode guardar esse valor e copiá-lo para o `role` do usuário enquanto ainda houver código que confere `role`.

### Colaboradores

- `POST` e `PUT /api/admin/colaboradores` passam a receber `perfilId`. O `role` continua vindo, equivalente ao perfil.
- Com `perfilId`, a API grava o perfil e atualiza o `role` do usuário no Better Auth para o `role` do perfil.
- `GET /api/admin/colaboradores` devolve `perfilId` e `perfil: { id, nome }` em cada item.
- **Proteção contra trancar o sistema:** recusar (409) qualquer alteração que deixe zero colaboradores ativos no perfil Administrador. Isso vale para trocar o perfil do último administrador, desativá-lo ou excluí-lo.

### Sessão

`GET /api/auth/get-session` (ou `/admin/me`) passa a incluir no `user`:

```json
{
  "role": "STAFF",
  "perfil": { "id": "financeiro", "nome": "Financeiro" },
  "permissoes": ["dashboard.ver", "pagamentos.ver", "pagamentos.editar"]
}
```

O painel aceita as permissões em `user.permissoes` ou em `user.perfil.permissoes`.

- Quando as permissões vêm na sessão, o painel usa só elas e ignora o `role`.
- Quando não vêm, o painel usa as do perfil padrão do `role`.
- Ao editar um perfil, as sessões abertas passam a valer na próxima leitura da sessão. Não é preciso derrubar ninguém.

## 4. Conferência nas rotas

Hoje as rotas conferem `requireRole('ADMIN')` ou equivalente. A troca é por um `requirePermissao('modulo.acao')`, que:

1. carrega as permissões do perfil do usuário (vale guardar em cache por requisição);
2. libera tudo quando o perfil tem `*`;
3. responde 403 com `{ "message": "Seu perfil não permite esta ação." }` quando falta a permissão.

Rotas e permissões principais:

| Rota | Permissão |
|---|---|
| `GET /admin/vendas` / `POST /admin/vendas` | `vendas.ver` / `vendas.criar` |
| `POST /admin/vendas/:id/checkout`, troca de pagamento | `vendas.pagamento` |
| `PATCH /admin/ingressos/:id` (portador) / cancelar | `ingressos.editar` / `ingressos.cancelar` |
| `GET` / `POST` / `PUT /admin/inscricoes` | `inscricoes.ver` / `.criar` / `.editar` |
| `PUT /admin/pagamentos/:id`, baixa, cancelamento | `pagamentos.editar` |
| reembolso Stripe | `pagamentos.reembolsar` |
| `POST /admin/cortesias` / cancelar | `cortesias.criar` / `cortesias.cancelar` (substitui o "só ADMIN") |
| `/admin/customers` | `pessoas.*` |
| `/admin/empresas` | `empresas.*` |
| `/admin/colaboradores` | `colaboradores.*` |
| `/admin/relatorios` (e exportações) | `relatorios.ver` / `relatorios.exportar` |
| `/admin/registros` | `registros.ver` |
| validação de ingresso (scanner) | `checkin.ver` |
| `/admin/agent/*` | `agente-ia.*` |

As exportações de Inscrições e Cortesias são geradas no próprio painel, a partir da lista que ele já carregou. Mesmo assim, a API pode registrar `EXPORTAR` no registro de atividades, se o painel passar a avisar.

## 5. Registro de atividades

Criar, editar e excluir perfis, e trocar o perfil de um colaborador, chamam `registrarAtividade`:

- `entidade: "PERFIL"`, com `alteracoes` das permissões (antes e depois);
- `entidade: "COLABORADOR"`, com o campo `perfil` (antes e depois).
