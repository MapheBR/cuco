---
name: QA Bug Report
description: Classificação de severidade, template de bug com evidência e protocolo de correção/verificação no Cuco.
---

# QA Bug Report

Use ao registrar falhas e ao corrigir/verificar bugs.

## Severidade

| Nível | Critério | Exemplo |
| --- | --- | --- |
| S1 Bloqueador | perda de dados, auth bypass, app fora do ar | funcionário acessa auditoria; login derruba servidor |
| S2 Crítico | fluxo P0 quebrado sem contorno | não cria escala; troca não aprova |
| S3 Maior | fluxo importante com contorno | filtro errado; CSV sem coluna |
| S4 Menor | cosmético/UX | alinhamento, texto, foco visual |

Prioridade pode diferir da severidade; registre as duas quando fizer sentido.

## Template

```md
## BUG-XXX — Título curto e específico
- Severidade: S1/S2/S3/S4
- Prioridade: P0/P1/P2
- Área: backend/frontend/auth/dados/LGPD
- Ambiente: commit, porta, banco, viewport, data
- Pré-condição: usuário/perfil/dados
- Passos: 1. ... 2. ... 3. ...
- Esperado: ...
- Obtido: ...
- Evidência: status HTTP, corpo, log, screenshot, linha de código
- Suspeita: ...
- Correção: ...
- Teste de regressão: nome do teste
- Status: aberto/corrigido/verificado
```

## Protocolo de correção

1. Reproduza e registre a evidência antes de editar.
2. Localize a causa raiz; não trate sintoma.
3. Escreva o teste de regressão que falha no estado atual.
4. Aplique a menor correção consistente com o estilo do projeto.
5. Rode `npm run check` e `npm test`.
6. Verifique no browser/API o fluxo original.
7. Atualize o bug com a evidência “depois”.
8. Procure regressões colaterais no mesmo módulo.

## Regras

- Não feche bug sem prova de correção.
- Não misture refatoração ampla com correção de bug.
- Não altere dados reais para reproduzir.
- Se não for possível corrigir, documente mitigação e risco residual.
- Nunca declare “corrigido” apenas porque o código mudou.

## Evidência final

Comando/rota executada, resultado antes/depois, teste novo e status da suíte completa.
