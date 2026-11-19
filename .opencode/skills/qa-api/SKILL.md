---
name: QA API
description: Testes de contrato HTTP, validação, erros, filtros, paginação e casos de borda da API do Cuco.
---

# QA API

Use para validar `server/api.js` como caixa-preta e como contrato consumido pelo frontend.

## Preparação

- Suba servidor isolado (`PORT=3001`, `DB_PATH` temporário, `SEED_DEMO=1`).
- Faça login e guarde `cuco_session` e `X-CSRF-Token` para escritas.
- Use `fetch` em Node ou `Invoke-RestMethod`; registre status, headers e corpo.

## Checklist por endpoint

Para cada rota:

1. **Happy path** com payload mínimo e completo.
2. **Autenticação**: sem cookie → 401; perfil errado → 403.
3. **CSRF**: escrita sem token ou com token inválido → 403.
4. **Validação**: campo ausente, vazio, tipo errado, número negativo, string gigante, Unicode, data inválida.
5. **Limites**: data mínima/máxima, hora 00:00/23:59, mês sem registros, ID 0/negativo/inexistente.
6. **Duplicidade**: login, nome de setor/equipe, e-mail, convite.
7. **Método**: GET/POST/PUT/DELETE indevido → 404/405, nunca 500.
8. **Formato**: JSON inválido, `Content-Type` errado, body vazio, body enorme.
9. **Resposta**: shape `{ data }` / `{ error }`, campos esperados, nada de dados sensíveis.
10. **Efeito colateral**: registro criado/alterado/removido de fato; notificação/auditoria quando previsto.

## Rotas críticas do Cuco

- `POST /api/login`, `POST /api/logout`, `GET /api/me`, `GET /api/setup/status`, `POST /api/setup`.
- `GET/POST/PUT/DELETE /api/members`, `/api/shifts`, `/api/users`.
- `GET /api/summary`, `/api/my-shifts`, `/api/settings`.
- `POST /api/shifts/:id/swap`, `GET /api/swaps`, aprovação de troca.
- `GET/POST /api/invitations`, aprovação/recusa, `POST /api/register`.
- `GET/POST/PUT/DELETE /api/departments`, `/api/teams`, `/api/positions`, `/api/user-options`.
- `GET /api/compliance`, regras, publicação/selo, `GET /api/dossier.pdf`.
- `GET /api/audit`, `GET /api/notifications`, marcar como lida.
- `POST /api/upload`, `PUT /api/me/profile`, `GET/DELETE /api/me/data`.
- `GET /api/health`, exportação CSV de escalas.

## Casos de borda específicos

- Escala: término menor/igual ao início, data fora do mês, integrante inativo, status inválido, sobreposição no mesmo dia, limite semanal.
- Troca: escala de outro usuário, escala já concluída, troca duplicada, aprovação por funcionário.
- Convite: código expirado/usado/inexistente, autoaprovação, convite para admin por funcionário.
- Usuário: senha fraca, login duplicado, vínculo com integrante inexistente.
- Filtros: `from > to`, status inválido, mês malformado, `limit` absurdo, busca com `%`/`_`/aspas.
- PDF/CSV: conteúdo correto, headers de download, sem vazamento de outro perfil.

## Evidência mínima

Para cada caso: método, rota, payload, status, trecho do corpo e efeito no banco. Não use "aparentemente funciona".

## Critério de falha

Qualquer 500, vazamento de dado entre perfis, escrita sem CSRF, validação ausente que corrompa dados ou resposta fora do contrato é FAIL e deve virar teste de regressão.
