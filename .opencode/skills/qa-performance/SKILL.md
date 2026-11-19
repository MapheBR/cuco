---
name: QA Performance
description: Medição de latência da API, Web Vitals, payloads, consultas N+1, cache e comportamento sob volume no Cuco.
---

# QA Performance

Use para detectar lentidão, desperdício e regressão antes de publicar.

## Orçamentos locais sugeridos

| Métrica | Alvo |
| --- | --- |
| `GET /api/health` | < 100 ms |
| CRUD simples local | < 300 ms p95 |
| Login | < 500 ms p95 |
| Página inicial (DOMContentLoaded) | < 2 s em localhost |
| LCP | < 2.5 s |
| INP | < 200 ms |
| CLS | < 0.1 |
| Payload de lista | < 500 KB para uso típico |

Ajuste se o ambiente for lento; registre a linha de base junto com o resultado.

## Backend

- Meça 20–50 requisições por endpoint quente e calcule p50/p95.
- Procure N+1 em listagens (membros com setor/equipe/cargo, escalas com integrante, convites com usuário).
- Verifique índices em colunas de filtro/join.
- Teste listas grandes (100–1000 escalas) e `limit` alto.
- Confira payload: campos desnecessários, fotos base64 em listas, PDF/CSV.
- Veja se cache de settings/regras evita consultas repetidas.
- Monitore memória do processo durante a rodada.

## Frontend

- Use `performance.getEntriesByType('navigation')` e `PerformanceObserver` via browser.
- Meça navegação entre views e abertura de modais.
- Verifique quantos requests a view dispara e se há duplicação.
- Imagens: dimensões, lazy loading, compressão, formato.
- Animações: uso de `transform/opacity`, sem layout thrashing; respeitar reduced motion.
- Service worker: cache hit/miss e tempo de primeira carga.

## Volume e estresse leve

- Crie 100+ escalas no banco temporário e repita dashboard/listagem/filtros.
- Faça 10 logins simultâneos e confirme que rate limit não afeta usuário legítimo.
- Não execute teste de carga contra o banco real nem contra produção.

## Evidência

Tabela endpoint → amostras → p50/p95 → status. Para Web Vitals, valores coletados e viewport. Para query, `EXPLAIN QUERY PLAN` quando relevante.

## Critério de falha

Regressão > 50% contra a linha de base, endpoint > 1 s local, N+1 evidente ou LCP > 2.5 s é FAIL de performance.
