---
name: github-profile-curator
description: Rubrica, templates e checklist para auditar e melhorar um perfil GitHub como portfólio técnico visto por recrutadores. Use com o agente github-profile-curator ou quando o usuário pedir revisão de perfil, README, pinned repos ou preparação para busca de emprego.
---

# GitHub Profile Curator — kit de auditoria

## 1. Rubrica de avaliação

### Perfil — primeira impressão (40%)

| Critério | Peso | Nota 8–10 | Nota 0–4 |
|---|---|---|---|
| Foto e identidade | 5% | Foto real, nome reconhecível | Avatar padrão, nome obscuro |
| Bio | 10% | Uma frase com papel + stack + o que busca | Vaga, emojis ou filosofia |
| Localização e link | 5% | Cidade/UF + um link útil | Vazios |
| README do perfil | 10% | 20–40 s de leitura: identidade, stack, 2–3 projetos, contato | Ausente, badge-only ou wall de emojis |
| Pinned repos | 10% | 3–6 pins curados, strongest first | Pin aleatório de forks recentes |
| Gráfico de contribuições | 5% | Ritmo constante e projetos reais | Vazio ou streak artificial |

### Repositórios — leitura aprofundada (60%)

| Critério | Peso | Nota 8–10 | Nota 0–4 |
|---|---|---|---|
| README do projeto | 15% | Problema, screenshot, como rodar, testes, roadmap | Ausente ou `# my-app` |
| Descrição e topics | 5% | Uma linha com o que faz + 3–5 tags | Vazios |
| Estrutura do código | 10% | Nomes descritivos, pastas claras, modular | Arquivo único, nomes obscuros |
| Commits | 5% | Mensagens explicam intenção | `fix stuff` repetido |
| Testes e CI | 10% | Testes rodáveis + CI verde | Nenhum teste |
| Documentação de apoio | 5% | CONTRIBUTING, CHANGELOG, SECURITY | Ausente |
| Licença | 5% | Licença explícita e coerente com o objetivo | Ausente |
| Segurança | 5% | Sem segredos, dependências auditadas | Chave no histórico |

**Nota final** = média ponderada. Arredondar com honestidade; se faltar dado, marcar `insufficient data` e reduzir a confiança.

## 2. Templates

### README do perfil

```markdown
# Marcos Moraes

Desenvolvedor de software em formação, com foco em Node.js, SQLite e interfaces web simples.

**Stack:** JavaScript · Node.js · SQLite · HTML/CSS · Git

## Projetos

- [Cuco](https://github.com/MapheBR/cuco) — controle de escalas com regras da CLT, convites e auditoria. Projeto pessoal de portfólio.
- [Outro projeto](url) — uma linha com o resultado concreto.

## Contato

- [LinkedIn](https://www.linkedin.com/in/marcos-moraes-2281a234b/)
- marcosfeliphe404@gmail.com
```

Regras: uma linha de identidade, 4–8 stacks, 2–5 projetos com resultado, **um** canal de contato principal. Sem contador de visitas, sem digitando-animação, sem wall de badges.

### Descrição de repositório

`Projeto pessoal de portfólio — [o que faz] com [stack]. [resultado ou aprendizado].`

Exemplo: `Projeto pessoal de portfólio — controle de escalas com validação da CLT/EC 141, convites e auditoria, usando Node 22 e SQLite local.`

### README de projeto

1. Logo e título
2. Uma frase: problema + para quem
3. Aviso honesto: "projeto pessoal de portfólio"
4. Funcionalidades (bullets)
5. Screenshot ou GIF
6. Stack
7. Como rodar (`npm start`)
8. Testes (`npm test`)
9. Roadmap
10. Licença e contato

### SECURITY.md

Canal privado (e-mail), prazos de resposta (3/7 dias), versões suportadas, escopo, uso responsável e configuração segura.

### CONTRIBUTING.md

Fluxo de issue → branch → PR, convenções de código, testes obrigatórios e lembrete de segredos.

### CHANGELOG.md

`## [1.0.0] - AAAA-MM-DD` com **Adicionado / Corrigido / Segurança / Mudanças**.

## 3. Checklist de publicação segura

- [ ] `gh api user` confere nome, bio, localização, link
- [ ] README do perfil tem 2–3 projetos reais e um contato
- [ ] Pinned repos curados e com descrição de uma linha
- [ ] Cada projeto principal tem README com screenshot e "como rodar"
- [ ] `git log --all` e `git grep` varredos por senha/token/chave/e-mail privado
- [ ] `.env`, `.env.*`, `data/`, `backups/`, `uploads/` no `.gitignore`
- [ ] `.env.example` sem valores reais
- [ ] `npm audit` sem vulnerabilidades altas
- [ ] Licença explícita e NOTICE com autoria
- [ ] Tests, lint e CI passando
- [ ] Nada foi alterado sem aprovação do usuário

## 4. Roteiro para o recrutador

O que ele vê primeiro: bio → pinned → README do perfil → README do repo principal → commits recentes.

Como contar o projeto em 3 frases:

1. **Problema:** "Pequenas operações ainda controlam escala por WhatsApp e planilha, com risco de descumprir a nova regra de jornada."
2. **Solução:** "Criei o Cuco, um projeto pessoal que organiza escalas, valida a CLT/EC 141 e mantém auditoria das alterações."
3. **Aprendizado:** "Com ele aprendi a desenhar API REST em Node puro, persistir em SQLite local e tratar segurança de sessão e CSRF."

## 5. Formato do relatório final

```
## Resumo
[3 frases]

## Notas
| Item | Nota | Evidência |

## Melhorias priorizadas
1. [ação] — impacto/esforço

## Arquivos prontos
[caminhos]

## Checklist de publicação
- [ ] ...
```

## 6. Licenças — respostas rápidas

| Objetivo | Licença | Prósito | Contra |
|---|---|---|---|
| Proteger ideia com caminho para open source | BSL 1.1 | Não é open source até conversão | Empresas podem evitar |
| Barrar uso comercial | PolyForm Noncommercial | Simples | Afasta empresas |
| Open source com reciprocidade em rede | AGPL-3.0 | Open source real | Mais fricção jurídica |
| Máxima adoção | Apache-2.0 | Familiar, patente explícita | Fork fechado permitido |

Para o Cuco: **BSL 1.1 com conversão para MIT**, já adotada no repositório.
