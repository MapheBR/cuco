---
name: QA Frontend
description: Testes end-to-end da SPA do Cuco no browser: login, views, formulários, estados, console, rede e fluxos por perfil.
---

# QA Frontend

Use para testar a interface como usuário real, com evidência visual e técnica.

## Preparação

- Use as ferramentas de browser do OpenCode: abrir aba, snapshot, click/fill por ref, wait por condição e screenshot.
- Nunca use sleep fixo; espere por texto, seletor ou `load`.
- Limpe service worker/caches ao validar deploy novo (`caches.keys()` e `getRegistrations()`), senão o teste pode usar código antigo.
- Teste em servidor isolado com seed demo; confirme a versão/cache ativa.

## Fluxos P0

### Admin
1. Login com credenciais válidas e inválidas.
2. Visão geral: métricas, calendário, ações rápidas, navegação de mês.
3. Escalas: criar, editar, excluir, filtrar, exportar CSV, validar erros.
4. Equipe: criar/editar/excluir integrante, foto, cor, vínculo.
5. Usuários: criar/editar, perfil, vínculo, senha, exclusão.
6. Trocas: solicitar (funcionário) e aprovar/recusar (admin).
7. Conformidade: apontamentos, regras, publicação/selo, dossiê PDF.
8. Auditoria: busca, limite, detalhe.
9. Organização: setores, equipes, cargos, exclusão bloqueada quando em uso.
10. Convites: gerar, copiar, aprovar/recusar, cadastro por convite.
11. Configurações e Privacidade: ler, salvar, exportar/eliminar dados.
12. Sair e confirmar que a sessão morreu.

### Funcionário
1. Login e dashboard pessoal.
2. Apenas “Visão geral” e “Privacidade” na navegação.
3. Confirmar turno, solicitar troca, notificações.
4. Foto/perfil e direitos LGPD, se expostos.
5. Tentar URL/hash de view admin e confirmar redirecionamento/bloqueio.

## Checklist de UI

- Todo botão/link visível funciona ou está desabilitado com motivo.
- Formulários: labels, obrigatórios, máscara, erro junto ao campo, sucesso com toast.
- Estados: loading, vazio, erro de rede, sucesso, sem permissão.
- Modais: abrem, fecham por X/Escape/fora, foco não escapa, confirmação destrutiva.
- Tabelas: ordenação/filtros, paginação/limite, overflow, ações por linha.
- Datas/moeda: formato pt-BR, fuso consistente, mês atual correto.
- Fotos: upload válido, preview, remoção, arquivo inválido rejeitado.
- Navegação: item ativo correto, grupos vazios ocultos, deep link/hash funciona.
- Módulos removidos: nenhum item de Mapa/Tarefas/Chamados; rotas antigas não abrem tela quebrada.

## Console e rede

- Zero erros novos no console após o login.
- Nenhum 4xx/5xx inesperado; 401 de `/api/me` antes do login é esperado.
- Sem requisições duplicadas em loop, sem assets 404, sem mixed content.
- Service worker não serve versão antiga após atualização.

## Evidência

Para cada fluxo: snapshot ou screenshot, resultado, console e requisições relevantes. Diga o viewport usado.

## Critério de falha

Fluxo P0 quebrado, erro de console não esperado, perda de dados, botão morto ou tela em branco é FAIL bloqueante.
