---
name: QA Responsivo
description: Testes de layout responsivo, toque, overflow, tabelas, modais e navegação do Cuco em múltiplos viewports.
---

# QA Responsivo

Use ao validar celular, tablet e desktop, especialmente após mudanças de CSS/sidebar.

## Viewports mínimos

| Nome | Largura × altura | Foco |
| --- | --- | --- |
| Celular pequeno | 320 × 568 | overflow, texto, toque |
| Celular comum | 390 × 844 | uso real |
| Tablet | 768 × 1024 | sidebar, grids |
| Notebook | 1280 × 800 | layout padrão |
| Desktop largo | 1440 × 900 | excesso de largura |

Teste também zoom de 200% e orientação retrato/paisagem quando possível.

## Checklist

- Sem rolagem horizontal na página (`document.documentElement.scrollWidth <= clientWidth + 1`).
- Sidebar vira topo no mobile; grupos de navegação ficam em linha e não cortam labels.
- Conteúdo não fica atrás da sidebar/topbar; header não sobrepõe título.
- Alvos de toque com pelo menos 44×44 px (ou espaçamento equivalente).
- Tabelas largas têm scroll próprio, não estouram a tela.
- Formulários empilham; inputs não diminuem abaixo do legível; botões full-width quando fizer sentido.
- Modais cabem na tela, com scroll interno e botão de fechar acessível.
- Cards, gráficos e calendário se reorganizam sem sobreposição.
- Fontes não quebram palavras nem truncam informações críticas.
- Imagens/avatares mantêm proporção e não distorcem.
- Menu mobile mantém item ativo visível ao navegar.

## Procedimento

1. Abra o app no viewport alvo.
2. Passe por todas as views admin e funcionário.
3. Meça overflow e tamanho de alvos via `evaluate`.
4. Tire screenshot das telas críticas (dashboard, escalas, tabela, modal).
5. Repita com zoom 200%.

## Evidência

Screenshot por viewport + valores medidos (`innerWidth`, `scrollWidth`, bounding boxes) para cada falha.

## Critério de falha

Overflow horizontal, conteúdo inacessível, alvo de toque minúsculo ou modal inutilizável no celular é FAIL de usabilidade.
