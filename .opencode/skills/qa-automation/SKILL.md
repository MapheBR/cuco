---
name: QA Automation
description: Padrões para escrever testes Node confiáveis no Cuco: isolamento, fixtures, CSRF, banco temporário, regressão e flakiness.
---

# QA Automation

Use ao criar ou revisar testes automatizados do Cuco.

## Stack

- `node:test` + `node:assert/strict`.
- Servidor filho em porta aleatória ou fixa isolada.
- Banco SQLite temporário via `DB_PATH`.
- `fetch` nativo para API.
- Sem dependências novas sem autorização explícita.

## Anatomia de um teste confiável

1. **Setup isolado**: banco novo, seed controlado, servidor próprio.
2. **Helper de login**: devolve cookie de sessão e CSRF.
3. **Dado criado pela API**: não dependa de IDs fixos.
4. **Ação**: uma requisição/ação por comportamento.
5. **Asserção**: status + shape + efeito no banco.
6. **Cleanup**: encerra servidor, remove banco, limpa uploads.
7. **Sem ordem implícita**: cada teste pode rodar sozinho.

## Regras

- Teste comportamento observável, não implementação interna.
- Use nomes em português que descrevam a regra (“funcionário não aprova troca de outro usuário”).
- Para bug, primeiro escreva o teste que falha; depois corrija.
- Não use `sleep`; espere condição/evento.
- Não compartilhe estado mutável entre testes.
- Evite snapshot gigante; valide campos relevantes.
- Teste 401, 403, 400, 404 e 200 quando o contrato permitir.
- Não mascare falha com `try/catch` vazio.
- Rode a suíte mais de uma vez para detectar flakiness.

## Cobertura mínima por feature

- Caminho feliz.
- Permissão negada.
- Validação de entrada.
- Recurso inexistente.
- Efeito colateral (banco/notificação/auditoria).
- Regressão do bug corrigido.

## Comandos

```bash
npm run check
npm test
node --test tests/qa.test.js
```

## Evidência

Saída completa dos testes, contagem de pass/fail e nome do teste de regressão adicionado.

## Critério de falha

Teste que passa sem executar a asserção, dependente de ordem, com dado real ou que ignora erro não é teste: é ruído.
