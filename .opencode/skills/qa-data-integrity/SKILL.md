---
name: QA Data Integrity
description: Validação do SQLite do Cuco: schema, foreign keys, migrações idempotentes, transações, órfãos, seed e backup/restore.
---

# QA Data Integrity

Use ao mexer em schema, migrações, seed, backup ou qualquer fluxo que grave/remova dados.

## Checklist de schema

- Tabelas esperadas existem e tabelas removidas não voltaram (`zones`, `tasks`, `tickets` etc.).
- Colunas, tipos, defaults e `NOT NULL` conferem com `server/db.js`.
- FKs declaradas corretamente e `PRAGMA foreign_keys = ON` ativo.
- Índices/unique constraints existem para login, nomes e códigos de convite.
- `created_at`/`updated_at` preenchidos e coerentes.
- Nenhuma migração altera dados existentes sem intenção.

## Checklist de comportamento

1. Rodar o app duas vezes no mesmo banco: migrações são idempotentes, sem erro.
2. Criar/editar/excluir entidades e conferir linhas reais.
3. Excluir integrante com escala/usuário vinculado: comportamento definido (bloquear ou `SET NULL`).
4. Excluir usuário e conferir sessões, notificações, trocas e auditoria.
5. Tentar inserir FK inexistente: deve falhar.
6. Verificar órfãos com queries `LEFT JOIN ... WHERE ... IS NULL`.
7. Testar transações: falha no meio não deixa registro parcial.
8. Seed demo cria dados consistentes e pode ser repetido sem duplicar.
9. Backup `npm run backup` gera arquivo abrível e com mesmos dados.
10. Restore do backup em banco temporário e validação de contagens.

## Queries úteis

```sql
PRAGMA foreign_key_check;
PRAGMA integrity_check;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
SELECT COUNT(*) FROM shifts WHERE member_id NOT IN (SELECT id FROM members);
```

## Procedimento seguro

- Sempre copie o banco antes de teste destrutivo (`VACUUM INTO`).
- Nunca rode `DROP`/`DELETE` no `data/cuco.db` real.
- Use `DB_PATH` temporário para toda a rodada.
- Ao final, confirme que o banco real não mudou (hash/tamanho/contagens).

## Evidência

Saída de `PRAGMA`, contagens antes/depois, query de órfãos e caminho do backup usado.

## Critério de falha

Perda de dados, FK quebrada, migração não idempotente, backup inválido ou órfão em fluxo crítico é P0/P1.
