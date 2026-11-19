# Arquitetura do Cuco

## Visão geral

```
Navegador (HTML/CSS/JS modules + PWA)
        │ HTTPS / SameSite cookie + X-CSRF-Token
        ▼
Node 22 (server/index.js)  ──  server/api.js (rotas e regras)
        │                        server/auth.js (sessão, HMAC, CSRF)
        │                        server/db.js (SQLite + migrações)
        ▼
SQLite local (data/cuco.db) + uploads em data/uploads/
```

Não há framework de aplicação, ORM, build step ou serviço externo obrigatório. Isso reduz superfície de ataque e permite rodar em uma máquina pequena.

## Estrutura de diretórios

| Caminho | Papel |
| --- | --- |
| `server/index.js` | HTTP server, static files, handler de erros e headers de segurança |
| `server/api.js` | Rotas, validação, regras de negócio e auditoria |
| `server/auth.js` | Hash scrypt, token HMAC, cookies, CSRF |
| `server/db.js` | Schema, migrações e seed opcional (`SEED_DEMO`) |
| `server/pdf.js` | Gerador minimalista de PDF (dossiê) |
| `server/utils.js` | Parsers, validadores e cabeçalhos |
| `public/index.html` | Shell da aplicação e telas de login/cadastro/setup |
| `public/js/app.js` | Boot, navegação, perfil, notificações e service worker |
| `public/js/views/` | Uma view por tela |
| `public/sw.js` | Cache offline (shell + leitura de escalas) |
| `tests/` | Smoke tests e testes de unidade |
| `scripts/` | Backup, checagem, geração do vídeo |
| `videos/` | Vídeo, capturas e roteiro |

## Fluxo de autenticação

1. `POST /api/setup` cria o primeiro admin e retorna cookie de sessão + cookie CSRF.
2. `POST /api/login` valida scrypt e gera novamente ambos os cookies.
3. Toda mutação exige `X-CSRF-Token` e verificação de `Origin`.
4. `POST /api/logout` incrementa `token_version`, revogando a sessão no servidor.
5. `GET /api/me` informa a identidade; falha gera evento `cuco:unauthorized`.

## Convites e vínculo

```
admin gera código (7 dias) → usuário preenche código + dados
→ users.active = 0, invitations.status = 'usado'
→ admin aprova → users.active = 1, invitations.status = 'aprovado'
```

A criação de conta nunca concede acesso direto; o vínculo é sempre revisado.

## Conformidade

`getCompliance()` em `server/api.js` cruza escalas por integrante e calcula:

- jornada semanal (44 h → 42 h em 16/12/2026 → 40 h em 16/12/2027);
- máximo de 5 dias trabalhados em 7;
- descanso mínimo entre turnos (11 h);
- intervalo para jornadas acima de 6 h;
- horas extras diárias.

Limites vêm de `settings` (`rule_*`), editáveis na tela de Conformidade. `POST /api/compliance/check` avalia um rascunho antes de salvar; se houver apontamento crítico, a API responde 409 e o cliente oferece override auditado.

## Dados e retenção

- `users`: nome, login, hash da senha, perfil, foto, vínculo com integrante.
- `members`: equipe, cargo, setor, contato e foto.
- `shifts`: escalas e status.
- `activity_log`: ações com IP/user-agent.
- `published_schedules`: snapshot e hash SHA-256 do mês.
- `invitations`, `shift_swaps`, `notifications` e `tickets` (quando presentes): fluxos operacionais.

Registros de jornada devem ser mantidos pelo prazo trabalhista aplicável; dados pessoais podem ser exportados/eliminados pelo titular (`GET/DELETE /api/me/data`).

## Decisões

- **SQLite local** em vez de serviço gerenciado: soberania de dados e zero dependências.
- **Módulos ES sem build**: depuração direta no navegador.
- **RBAC no servidor**: esconder botões não é controle de acesso.
- **CSP rígida** (`frame-ancestors 'none'`): evita clickjacking; capturas de vídeo usam instância temporária com CSP relaxada.
- **BRL/pt-BR**: regras e textos pensados para o contexto brasileiro.
