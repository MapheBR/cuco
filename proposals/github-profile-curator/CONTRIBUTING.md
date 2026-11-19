# Contribuindo

Obrigado pelo interesse no Cuco. Antes de começar, leia a [licença](LICENSE) e o [código de conduta](CODE_OF_CONDUCT.md).

## Fluxo

1. Abra uma issue descrevendo o problema ou a proposta.
2. Faça um fork (ou branch, se você tiver acesso ao repositório).
3. Crie a branch a partir de `main`.
4. Rode `npm install`, `npm run check`, `npm run lint` e `npm test` antes de abrir o PR.
5. Descreva no PR o que mudou, por quê e como validar.

## Convenções

- JavaScript sem framework no front; módulos em `public/js/`.
- Backend em `server/`: `api.js` (rotas), `auth.js` (sessão/CSRF), `db.js` (schema/migrações), `utils.js`, `index.js`.
- Dados sensíveis nunca entram no repositório. Use `.env.example`.
- Novas rotas precisam de validação de entrada, RBAC e teste em `tests/`.
- Migrations de banco são incrementais em `server/db.js`; não altere tabelas existentes sem plano de migração.

## Segurança

Reporte vulnerabilidades pelo canal privado descrito em [SECURITY.md](SECURITY.md) — nunca em issues públicas.

## Autoria

Contribuições são aceitas com o entendimento de que o código segue a BSL 1.1 e que o autor preserva seus direitos sobre nome, logo e mascote.
