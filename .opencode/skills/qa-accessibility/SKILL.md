---
name: QA Acessibilidade
description: Auditoria WCAG 2.2 AA do Cuco: semântica, teclado, foco, labels, contraste, modais, erros e movimento.
---

# QA Acessibilidade

Use para validar se o Cuco é operável por teclado e leitor de tela, com contraste e semântica corretas.

## Checklist WCAG 2.2 AA

### Estrutura
- Um `<h1>` por view; hierarquia de headings sem saltos.
- Landmarks: `nav`, `main`, `header`, `aside`; botões reais para ações, links para navegação.
- Tabelas com `<th>`, `scope` e legenda quando necessário.
- Formulários com `<label for>` ou `aria-label`; placeholders não substituem labels.
- Ícones decorativos com `aria-hidden`; ícones-ação com nome acessível.

### Teclado e foco
- Tudo opera com Tab/Shift+Tab/Enter/Espaço/Escape.
- Foco visível e não obsoleto em todos os controles.
- Ordem de foco segue a ordem visual.
- Modal prende o foco, recebe foco inicial, fecha com Escape e devolve o foco ao gatilho.
- Menu lateral e dropdowns navegáveis sem mouse.
- Nenhum “keyboard trap”.

### Contraste e leitura
- Texto normal ≥ 4.5:1; texto grande ≥ 3:1; componentes/foco ≥ 3:1.
- Não usar cor como único indicador de status (adicionar texto/ícone).
- Texto redimensionável até 200% sem perda.
- Espaçamento de texto (WCAG 1.4.12) não quebra layout.

### Formulários e erros
- Erro identificado em texto, associado ao campo (`aria-describedby`) e anunciado.
- Campos obrigatórios indicados de forma programática.
- Autocomplete adequado em nome/login/senha.
- Senha com botão “mostrar” acessível e estado anunciado.

### Movimento
- Respeitar `prefers-reduced-motion`; animações contínuas podem ser pausadas.
- Nada pisca mais de 3 vezes por segundo.
- Confete/transições não bloqueiam a tarefa.

## Procedimento

1. Inspecione o DOM das views principais.
2. Navegue só com teclado pelos fluxos P0.
3. Verifique nomes acessíveis via snapshot.
4. Meça contraste dos pares de cor críticos.
5. Teste zoom 200% e movimento reduzido.
6. Registre falhas por critério WCAG e seletor.

## Evidência

Snapshot de acessibilidade, seletor, critério violado e screenshot. Não declare “acessível” sem ter testado teclado e foco.

## Critério de falha

Bloqueio de teclado, foco perdido em modal, label ausente em campo crítico ou contraste abaixo de 4.5:1 em texto é FAIL.
