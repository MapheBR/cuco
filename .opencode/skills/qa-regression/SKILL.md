---
name: QA Regression
description: Matriz de regressão do Cuco, incluindo fluxos críticos, módulos removidos e checklist GO/NO-GO de publicação.
---

# QA Regression

Use em toda mudança e antes de publicar. O objetivo é provar que o que funcionava continua funcionando.

## Matriz mínima

| ID | Fluxo | Perfil | Evidência |
| --- | --- | --- | --- |
| R1 | Login válido/inválido, logout, sessão revogada | ambos | status + browser |
| R2 | Criar/editar/excluir integrante | admin | API + UI |
| R3 | Criar/editar/excluir escala, filtros, CSV | admin | API + UI |
| R4 | Validação de sobreposição/limite semanal | admin | API |
| R5 | Criar/editar usuário e vínculo | admin | API + UI |
| R6 | Solicitar troca e aprovar | funcionário/admin | API + UI |
| R7 | Conformidade: regras, apontamentos, selo, PDF | admin | API + browser |
| R8 | Auditoria: busca, limite e detalhe | admin | API + UI |
| R9 | Organização: setor/equipe/cargo e vínculos | admin | API + UI |
| R10 | Convite: gerar, cadastrar, aprovar, login | admin/novo | API + UI |
| R11 | Configurações e Privacidade | ambos | API + UI |
| R12 | Exportar/eliminar dados do titular | funcionário | API |
| R13 | Navegação por grupos e RBAC visual | ambos | screenshot |
| R14 | Módulos removidos ausentes | todos | 404/403 + nav |

## Módulos removidos

Confirme que não existem:

- Itens “Mapa”, “Tarefas” e “Chamados” na sidebar.
- Views `public/js/views/map.js`, `tasks.js`, `tickets.js`.
- Rotas `/api/tasks`, `/api/tickets`, `/api/zones`, `/api/zone-flows`, `/api/locations`.
- Tabelas `tasks`, `tickets`, `zones`, `zone_flows`, `employee_locations`.
- Assets/vendor Leaflet e CSP com tiles externos.
- Referências em README, PESQUISA, testes e service worker.

## Checklist de release

- [ ] `npm run check` verde.
- [ ] `npm test` verde.
- [ ] Rotas antigas retornam 404 sem derrubar o servidor.
- [ ] Migração em banco limpo e em banco existente.
- [ ] Backup e restore testados.
- [ ] Admin e funcionário exercitados no browser.
- [ ] Console/rede limpos.
- [ ] Responsivo e acessibilidade básica validados.
- [ ] Documentação e versões de cache atualizadas.
- [ ] Nenhum segredo/dado real no repositório.

## Procedimento

1. Execute a matriz na ordem de risco.
2. Marque cada linha PASS/FAIL/BLOCKED com evidência.
3. Para cada FAIL, abra bug e crie teste de regressão.
4. Reexecute a matriz completa após correções.
5. Emita GO somente com P0/P1 fechados.

## Critério de falha

Qualquer item P0/P1 aberto, módulo removido reaparecendo ou fluxo crítico sem evidência impede o GO.
