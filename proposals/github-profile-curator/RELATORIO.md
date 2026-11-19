# Auditoria de perfil — github.com/MapheBR

Data: 19/11/2026. Perfil auditado: **MapheBR** (Marcos Moraes). Projeto principal: **Cuco**.

## Resumo

O perfil mostra volume de trabalho (15 repositórios, atividade recente), mas quase nenhum sinal de curadoria: bio vazia, sem localização, README do perfil com linguagem de estudante e poucos resultados concretos, e nenhum repositório fixado de forma intencional. O Cuco é o melhor projeto e está publicado, mas sem descrição, topics e com licença não reconhecida pelo GitHub (`NOASSERTION` para BSL 1.1). Com duas horas de ajustes simples — bio, README do perfil, pins, descrições e topics — a leitura de 10 segundos muda completamente.

## Notas

### Primeira impressão (~10 s)

| Item | Nota | Evidência / como está |
|---|---|---|
| Foto e identidade | 6 | Avatar padrão do GitHub; nome "Marcos Moraes" coerente com LinkedIn |
| Bio | 1 | `bio: null` — campo vazio |
| Localização e link | 2 | `location: null`, `blog: ""`; link só no README do perfil |
| README do perfil | 5 | Existe, mas diz "Estudante de Engenharia de Software · 5º Semestre" e lista tecnologias em estudo — foco no que é, não no que entregou |
| Pinned repos | 3 | Não há curadoria visível; GitHub mostra repos por popularidade/recentidade |
| Gráfico de contribuições | 6 | Atividade recente em vários repos, sem sinal de manipulação |

### Leitura aprofundada (~2 min)

| Item | Nota | Evidência / como está |
|---|---|---|
| README do projeto principal | 9 | `cuco/README.md` completo: logo, funcionalidades, telas, stack, como rodar, docs, licença |
| Descrição e topics | 2 | `description: null`, `topics: []` no repo `cuco` |
| Estrutura do código | 8 | `server/`, `public/js/views/`, `tests/`, `scripts/`, `docs/` bem separados |
| Commits | 7 | Mensagens descritivas, com escopo e intenção |
| Testes e CI | 9 | 32 testes, ESLint, check, GitHub Actions, CodeQL, Dependabot |
| Documentação de apoio | 9 | CONTRIBUTING, CODE_OF_CONDUCT, CHANGELOG, SECURITY, ARCHITECTURE, RESEARCH |
| Licença | 6 | BSL 1.1 adotada, mas GitHub exibe `NOASSERTION` — contrato longo precisa de `LICENSE.md` com cabeçalho SPDX ou `LICENSE` reconhecido |
| Segurança | 8 | Histórico varrido, sem segredos reais; `npm audit` limpo; secret scanning ativo |

**Nota geral ponderada: 5,7/10.** O conteúdo é bom; a vitrine é que está desorganizada.

## O que um recrutador estranharia

1. Bio vazia — o campo mais visível do perfil está em branco.
2. README do perfil fala em "estudante do 5º semestre" em vez de mostrar o que você construiu.
3. Nenhuma descrição/topics no Cuco — o tile do repositório não diz o que é.
4. Repositórios "cuco", "MapheBR", "poo-*", "carteira-digital" sem descrição — leitura rápida não encontra valor.
5. Licença BSL não reconhecida pelo GitHub, o que gera dúvida sobre reuso.
6. Nome nos commits ("Marcos Feliphe") diferente do perfil ("Marcos Moraes") — não é erro, mas vale alinhar na documentação.

## Melhorias priorizadas (impacto ÷ esforço)

1. **Preencher bio e localização** — 2 min. Maior ganho visual.
2. **Adicionar descrição e topics ao Cuco** — 3 min. Faz o tile virar clique.
3. **Escolher e fixar 3–4 repos** — 5 min. Nunca deixe o GitHub escolher por você.
4. **Trocar o README do perfil** pelo modelo em `README-perfil.md` — 15 min.
5. **Padronizar descrições dos outros repos** — 20 min.
6. **Ajustar reconhecimento da licença** — 10 min (ver `LICENSE-GITHUB.md`).
7. **Criar releases com notas** para o Cuco — 15 min. Mostra ciclo de entrega.

## Arquivos prontos nesta proposta

- `README-perfil.md` — README do perfil (copiar para `MapheBR/MapheBR/README.md`)
- `bio-e-descricoes.md` — bio, descrições, topics e ordem dos pins
- `LICENSE-GITHUB.md` — cabeçalho SPDX para o GitHub reconhecer a licença
- `README-cuco.md` — README do projeto já revisado como portfólio pessoal
- `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.gitignore`, `.env.example`

> Nada foi alterado no perfil ou nos repositórios remotos. Aplique após revisar.

## Checklist antes de divulgar no LinkedIn

- [ ] Bio e localização preenchidas
- [ ] README do perfil atualizado
- [ ] Cuco com descrição, topics e 4 pins curados
- [ ] README do Cuco revisado
- [ ] Licença reconhecida pelo GitHub
- [ ] Varredura de segredos repetida após as mudanças
- [ ] Post com link do repositório nos comentários
