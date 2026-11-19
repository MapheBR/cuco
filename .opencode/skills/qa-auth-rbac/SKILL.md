---
name: QA Auth e RBAC
description: Testes de autenticação, sessão, CSRF, rate limit, convites, permissões por perfil e IDOR no Cuco.
---

# QA Auth e RBAC

Use para validar quem entra, o que cada perfil pode fazer e se IDs manipulados vazam dados.

## Matriz de acesso

| Recurso | Anônimo | Funcionário | Admin |
| --- | --- | --- | --- |
| `/api/login` | permitido | — | — |
| `/api/setup` | só instalação limpa | negado | negado |
| `/api/me` | 401 | próprio | próprio |
| `/api/summary`, `/api/my-shifts` | 401 | próprio | permitido |
| `/api/members`, `/api/shifts`, `/api/users` | 401 | 403 | CRUD |
| `/api/swaps` | 401 | próprias | todas |
| `/api/invitations` | 401 | 403 | CRUD/aprovar |
| `/api/organization` (departments/teams/positions) | 401 | leitura permitida | CRUD |
| `/api/compliance`, `/api/audit` | 401 | 403 | permitido |
| `/api/settings` | 401 | leitura | leitura/escrita |
| `/api/me/data`, `/api/me/profile` | 401 | próprio | próprio |

Confirme na implementação antes de assumir; divergência é achado.

## Autenticação e sessão

- Login correto, senha errada, usuário inexistente, campos vazios, Unicode, senha longa.
- Rate limit: várias tentativas erradas seguidas; a resposta deve bloquear sem derrubar o servidor.
- Cookie: `HttpOnly`, `SameSite`, `Secure` quando aplicável, expiração coerente.
- Logout invalida a sessão no servidor; reutilizar o cookie depois deve dar 401.
- Sessão expirada/adulterada não pode autenticar.
- `setup/status` e `setup` só funcionam na instalação limpa; segundo setup deve falhar.
- Não vazar se o usuário existe ou a senha está errada (mensagem genérica).

## CSRF e origem

- Toda escrita autenticada exige `X-CSRF-Token` válido.
- Token de outro usuário/sessão deve falhar.
- `Origin` externa em escrita deve falhar.
- GET não deve alterar estado.

## RBAC e IDOR

Para cada ID, tente acessar/alterar como funcionário:

- `GET/PUT/DELETE /api/shifts/:id` de outro integrante.
- `POST /api/shifts/:id/swap` em escala alheia.
- `GET /api/swaps` de outro usuário; aprovar troca.
- `PUT /api/users/:id`, `DELETE /api/members/:id`, `GET /api/audit`.
- `GET /api/me/data` de outro usuário (deve ser sempre o próprio).
- `PUT /api/invitations/:id/approve` como funcionário.
- IDs inexistentes, negativos, strings, muito grandes: 404/400, nunca 500.

## Convites

- Código de 10 caracteres, expiração e uso único.
- Cadastro com convite válido fica pendente até aprovação.
- Convite usado/expirado/inexistente falha com mensagem clara.
- Funcionário não cria convite de admin nem aprova o próprio vínculo.
- Aprovação cria vínculo correto e permite login.

## Evidência

Registre método, rota, perfil, status e corpo. Para IDOR, prove que o dado não pertence ao solicitante e que a resposta foi negada.

## Critério de falha

Qualquer acesso indevido, escrita sem CSRF, sessão reutilizável após logout ou vazamento entre perfis é P0 e bloqueia release.
