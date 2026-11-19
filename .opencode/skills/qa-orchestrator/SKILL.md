---
name: QA Orchestrator
description: Estratégia de QA baseada em risco para o Cuco; matriz P0/P1/P2, sequência de execução, critérios de entrada/saída e gate GO/NO-GO.
---

# QA Orchestrator

Use ao planejar uma rodada completa de QA ou decidir se o produto pode ser publicado.

## Princípios

1. **Risco primeiro**: o que derruba o produto (login, escala, permissão, dados) vem antes de cosmética.
2. **Evidência**: cada PASS/FAIL aponta comando, status HTTP, screenshot, log ou linha de código.
3. **Isolamento**: banco temporário e servidor em porta separada; nunca testar destrutivamente o banco real.
4. **Regressão**: toda correção ganha um teste que falharia antes da mudança.
5. **Honestidade**: BLOCKED e NOT TESTED são resultados válidos; PASS inventado não é.

## Matriz de risco do Cuco

| Nível | Área | Exemplos |
| --- | --- | --- |
| P0 | Autenticação e sessão | login, logout, revogação, CSRF, rate limit, cookie |
| P0 | RBAC e isolamento | funcionário não acessa admin; IDOR em IDs de escala/usuário/integrante |
| P0 | Escalas | CRUD, validação de data/hora, sobreposição, limite semanal, mês |
| P0 | Integridade do banco | FKs, migrações, backup/restore, dados órfãos |
| P1 | Trocas e convites | solicitar/aprovar troca, código, cadastro, aprovação, vínculo |
| P1 | Conformidade e auditoria | regras, apontamentos, selo/hash, dossiê PDF, trilha |
| P1 | LGPD | exportar/eliminar dados, retenção, privacidade, logs |
| P1 | Segurança | XSS, SQLi, upload malicioso, headers, vazamento de erro |
| P2 | UI/UX | estados vazios, loading, erro, responsivo, teclado, contraste |
| P2 | Performance/PWA | latência, Web Vitals, cache, offline, service worker |

## Sequência

1. Reconhecimento e inventário de rotas/telas/tabelas.
2. Baseline: `npm run check`, `npm test`.
3. Backend/API e banco.
4. Auth/RBAC/segurança.
5. Frontend admin (todas as views) e funcionário.
6. Responsivo, acessibilidade, PWA, performance.
7. LGPD e documentação.
8. Correções + regressão.
9. Relatório e gate.

## Critérios de entrada

- App sobe localmente ou servidor de teste isolado disponível.
- Credenciais demo conhecidas.
- Banco temporário limpo ou seed controlado.
- Escopo e limite de tempo acordados.

## Critérios de saída (gate)

- [ ] `npm run check` sem falhas.
- [ ] `npm test` 100% verde.
- [ ] Nenhum P0/P1 aberto sem mitigação documentada.
- [ ] Fluxos admin e funcionário exercitados no browser.
- [ ] Console sem erros novos; rede sem 4xx/5xx inesperados.
- [ ] Nenhum dado real alterado.
- [ ] Relatório com evidências e riscos residuais.

## Formato do relatório

1. Escopo e ambiente (commit, porta, banco, data).
2. Resumo executivo (GO/NO-GO + 3 linhas).
3. Tabela de achados: ID, severidade, área, status, evidência.
4. Correções aplicadas e testes de regressão.
5. O que não foi testado e por quê.
6. Riscos residuais e próximos passos.
