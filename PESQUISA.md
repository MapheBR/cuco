# Cuco — Pesquisa aprofundada, melhorias e roadmap

Data: 18/11/2026. Método: pipeline das skills do projeto (`ai-orchestrator` → `deep-researcher` → `idea-validator`, com `ux-ui`, `brand-design`, `security-guard`, `fullstack-builder` e `strict-verifier`) cruzado com fontes externas oficiais e comparativos de produto.

## 1. Resumo executivo

O Cuco já resolve o fluxo central (publicar escala, visualizar, confirmar turno, auditar). Os maiores ganhos agora não são "mais animação", e sim:

1. **Validação trabalhista automática** — hoje o sistema deixa escalar 6 dias seguidos sem aviso; a EC 141/2026 mudou a regra geral para **42 h semanais e 2 folgas** (16/12/2026) e **40 h** (16/12/2027).
2. **CSRF e endurecimento de sessão/upload** — o `SameSite=Lax` é defesa em profundidade, não substitui token; o upload valida MIME e tamanho, mas não assinatura do arquivo.
3. **Acessibilidade das animações** — WCAG 2.2 exige controle de pausa para movimento automático que dura mais de 5 s.
4. **Fluxos de self-service do funcionário** — troca de turnos, disponibilidade e férias são os recursos mais citados como esperados em software de escala.
5. **PWA/offline e notificações** — adesão do funcionário depende de consultar a escala no celular, inclusive com conexão instável.

## 2. Base de pesquisa (fontes cruzadas)

- Salesforce / OnTheClock / AppyShift / Indeavor / Ordio / Teambridge — comparativos de employee scheduling (2026): drag-and-drop, disponibilidade, troca de turnos, open shifts, callout, time clock, compliance, analytics, mobile.
- W3C WCAG 2.2 (Recomendação 12/12/2024): 1.4.3 (4,5:1), 1.4.11 (3:1 para componentes), 2.2.2 (pausar/parar/ocultar), 2.4.7 (foco visível), 2.4.11 (foco não obstruído).
- OWASP Cheat Sheets: Node.js Security, Session Management, CSRF Prevention, File Upload.
- ANPD / artigos jurídicos sobre LGPD em relações de trabalho: bases legais (art. 7º, II e V), dados sensíveis (art. 11), retenção (art. 16), direitos do titular (art. 18) e comunicação de incidentes (Resolução CD/ANPD 15/2024).
- TST / Câmara dos Deputados / MTE: CLT arts. 58, 71, 74; CF art. 7º, XIII/XIV/XVI; EC 141/2026 (fim da 6x1, 42 h → 40 h, dois repousos semanais).
- Skills de design de interface (designing-frontend-interfaces): modo **app**, não marketing — discipline-se a densidade, tabelas, estados e convenções; movimento só quando explica algo.

> Aviso: a parte trabalhista é orientação de produto, não parecer jurídico. Validar regras com advogado/sindicato antes de crear alertas automáticos.

## 3. Achados por área

### 3.1 Funcionalidades de escala (benchmark de mercado)

| Recurso | Status no Cuco | Prioridade | Comentário |
| --- | --- | --- | --- |
| Calendário + cadastro de escalas | ✅ pronto | — | Base sólida |
| Troca rápida de status, filtros, CSV | ✅ pronto | — | Diferencial de velocidade |
| Escala com arrastar e soltar + templates | ❌ | **Alta** | Reduz drasticamente o tempo de montagem da escala |
| Disponibilidade e férias do funcionário | ❌ | **Alta** | Evita escalar quem não pode trabalhar |
| Troca de turnos / escalas abertas com aprovação | ❌ (só confirmação) | **Alta** | Maior pedido dos comparativos; tira o gestor do WhatsApp |
| "Callout" (falta avisada e cobertura automática) |Parcial (status "falta") | Média | Sugerir substitutos por disponibilidade e descanso |
| Ponto eletrônico / clock-in | ❌ | Média | Atenção à LGPD: biometria é dado sensível (art. 11, II, g); preferir PIN/QR |
| Notificações de mudança de escala | ❌ | **Alta** | Web Push + e-mail; o funcionário precisa saber que a escala mudou |
| Previsão de custo/horas e relatórios | Parcial (horas) | Média | Horas extras, cobertura e aderência |
| Mobile/offline (PWA) | ❌ | **Alta** | Frontline usa celular; offline evita "não consigo ver minha escala" |

### 3.2 Compliance trabalhista brasileiro (oportunidade mais forte)

Regras que o validador de escala deveria checar **antes de publicar**:

- Jornada: até 8 h/dia; 42 h/semana a partir de 16/12/2026 e 40 h a partir de 16/12/2027 (EC 141/2026).
- **Dois dias de repouso semanal remunerado**, um preferencialmente aos domingos; fim da 6x1 como regra geral.
- Intervalo intrajornada: 1 h para jornadas > 6 h; 15 min para 4–6 h (CLT art. 71).
- Intervalo interjornada: 11 h consecutivas (evitar "clopening").
- Horas extras: máximo 2 h/dia, adicional mínimo de 50% (CF art. 7º, XVI).
- Registro de jornada: obrigatório para mais de 10 trabalhadores (CLT art. 74, § 2º); ônus da prova é do empregador (Súmula TST 338).

Proposta: tela **"Validador de escala"** com severidades (bloqueante / atenção / ok), mensagens curtas e link para a regra. Nunca dar parecer jurídico automático — usar linguagem de "risco/aponta".

### 3.3 Segurança (OWASP + LGPD)

- **CSRF**: hoje dependemos de `SameSite=Lax`. OWASP recomenda token (double-submit assinado e vinculado à sessão) + verificação de `Origin`/`Referer` em todas as mutações. `SameSite` sozinho tem lacunas conhecidas.
- **Cookie**: já é `HttpOnly` e `SameSite=Lax`; falta `Secure` quando o site roda em HTTPS (definir por variável de ambiente em produção) e rotação do ID de sessão no login.
- **Upload**: MIME e 2 MB já validados; OWASP pede também **assinatura (magic bytes)**, re-codificação da imagem e armazenamento fora do webroot — em produção, mover `public/uploads` para fora de `public` com handler controlado.
- **Login**: adicionar rate limit e bloqueio progressivo; senhas padrão devem exigir troca no primeiro acesso.
- **Autorização**: já há verificação no servidor (403 para funcionário) — manter e cobrir com testes automatizados.
- **LGPD**: bases legais para dados de empregado costumam ser art. 7º, II e V (obrigação legal/execução do contrato), não consentimento. Prever: aviso de privacidade do empregado, tabela de temporalidade, exportação/eliminação de dados do titular (art. 18) e registro de incidentes com prazo de comunicação de 3 dias úteis (Resolução CD/ANPD 15/2024).
- **Auditoria**: já existe `activity_log`; estender com IP/user-agent e retenção configurável.

### 3.4 UX, acessibilidade e linguagem visual

- Cuco é **app surface**: o esforço deve ir para densidade da tabela, estados vazios/erro/loading e legibilidade — não para "arte" na tela de dados.
- WCAG 2.2: garantir `:focus-visible` com contraste ≥ 3:1 em todos os controles (inclusive chips e botões de ícone); alvos de toque ≥ 24×24 px (44 px ideal no mobile); `aria-live` nos toasts; alternativa de teclado para qualquer drag-and-drop.
- **Pausar movimento**: ticker e ações aleatórias do mascote duram mais de 5 s — incluir um botão "Pausar animações" persistido em `localStorage`, além do `prefers-reduced-motion` já implementado.
- Contraste: texto verde-600 sobre branco passa; **amarelo (#F5B942) sobre branco NÃO passa 4,5:1** — usar amarelo só em fundos escuros (sidebar/hero) ou como detalhe. Logotipos são isentos da regra de contraste, então a logo amarela é válida como marca.
- Microcopy: evitar "Erro" sozinho; usar mensagens acionáveis ("Não foi possível salvar. Verifique a data e tente novamente.").

### 3.5 Frontend e movimento

- Movimento com propósito: o mascote interativo (mouse + ações aleatórias) tem personalidade; manter, mas com controle de pausa.
- Evitar o que você já reprovou: transição de página com wipe e loop perceptível de entrada dos cards. A troca imediata ficou melhor.
- Adicionar skeleton que **simula o layout final** (evita salto) e animação de contagem apenas em KPIs.
- View Transitions API pode ser usada no futuro para transições sutis e opcionais — nunca por padrão.

### 3.6 Arquitetura e operação

- **PWA**: service worker com cache do shell e das escalas do funcionário (IndexedDB), sincronização ao voltar a conexão.
- **Backup**: script `npm run backup` copiando `data/cuco.db` com `VACUUM INTO` e rotacionando 7 dias.
- **Migrations versionadas** (ex.: `migrations/001_photo.sql`) em vez de `ALTER` implícito — facilita deploy e reversão.
- **Testes**: `node:test` + `node --test` com smoke tests de health/login/RBAC/upload; `strict-verifier` exige evidência antes de dizer "concluído".
- **Observabilidade**: healthcheck com versão, contagem de usuários e uptime; log estruturado em JSON.
- **Deploy**: `SESSION_SECRET` obrigatório em produção, `Secure` cookie atrás de HTTPS, porta configurável, proxy reverso.

## 4. Priorização (MoSCoW)

| Prioridade | Item | Impacto | Esforço |
| --- | --- | --- | --- |
| **Must** | CSRF token + `Secure` cookie + rate limit de login | Alto | Médio |
| **Must** | Botão "Pausar animações" + foco visível auditado | Alto (WCAG) | Baixo |
| **Must** | Validador de escala (42/40 h, 2 folgas, 11 h, 1 h) | Alto | Médio |
| **Should** | Disponibilidade e solicitação de folga | Alto | Médio |
| **Should** | Troca de turnos com aprovação | Alto | Médio |
| **Should** | Notificações (Web Push/e-mail) de mudança | Alto | Médio |
| **Should** | PWA offline para o funcionário | Alto | Alto |
| **Should** | Magic bytes + re-codificação no upload | Médio | Baixo |
| **Could** | Drag-and-drop + templates de escala | Alto | Alto |
| **Could** | Time clock com PIN/QR (evitar biometria) | Médio | Alto |
| **Could** | Exportação para folha de pagamento | Médio | Médio |
| **Won't (agora)** | Integração com eSocial/payroll externo, IA de auto-scheduling | — | Alto |

## 5. Plano de 48 horas (skill `idea-validator`)

1. Implementar CSRF double-submit assinado em todas as rotas de mutação + `Secure` condicional.
2. Adicionar toggle "Pausar animações" e `:focus-visible` explícito nos controles.
3. Criar `GET /api/compliance?month=` com os 5 apontamentos legais e um card no dashboard admin.
4. Escrever 6 smoke tests (`node:test`): health, login, RBAC 403, criação de escala, upload inválido, logout.
5. Gerar script de backup `VACUUM INTO` e documentar no README.
6. Revisar a logo amarela: manter como marca em fundo escuro; criar versão verde para fundo claro.

## 6. Riscos principais

1. **Jurídico**: regras em transição (EC 141/2026 + liminar do STF) — o validador pode dar falsa segurança. Mitigação: language de "apontamento", nunca "parecer", e data de vigência visível.
2. **Privacidade**: fotos e dados de jornada são pessoais; vazar ou reter sem prazo gera risco LGPD. Mitigação: minimização, temporalidade e controle de acesso.
3. **Adoção**: se o funcionário não usar o celular, o sistema vira mais uma planilha. Mitigação: PWA, notificação e fluxo de confirmação em um toque.

## 7. Nota sobre a logo

A logo amarela em PNG foi adicionada em: favicon/apple-touch icon, splash, login e sidebar. Como o amarelo tem contraste baixo sobre branco, ele funciona como marca (logotipo é isento de contraste mínimo pela WCAG) e como acento em superfícies escuras — não deve ser usado como texto corrido em fundo claro.

## 8. Avaliação com skill de avaliador de projeto (`architect`)

**Skill encontrada:** `architect` — avaliador multidisciplinar de ideias e projetos (JuanMarchetto/agent-skills, MIT, v1.0.0). Faz detecção de modo (ideia vs. projeto existente), despacha 3–6 avaliadores especializados em paralelo (mercado, técnico, risco, impacto, recursos, inovação) e sintetiza com Opportunity Score, Value Matrix, Project Health Score e Course Corrections.

**Vale a pena?** **Sim, como avaliação periódica (mensal/trimestral), não como verificação de cada commit.** O método é bom porque obriga a pontuar com evidência, marca `insufficient data` em vez de inventar números e separa valor de produto de popularidade. O custo é alto (vários avaliadores, contexto `data/context.md` precisa ser preenchido) e as skills locais `idea-validator`/`strict-verifier` já cobrem parte do terreno. Recomendo adotar o **rubric + Health Score**, não o pipeline completo no dia a dia.

### Value Matrix (aplicada ao Cuco em 18/11/2026)

| Dimensão | Nota | Evidência principal |
| --- | --- | --- |
| Comercial | 5/10 | Cliente identificável (PMEs em turnos), demanda real pela EC 141/2026; mercado competitivo com planos gratuitos (Tá Escalado!, escala.app, Homebase). Modelo de receita e tração: `insufficient data`. |
| Técnica | 8/10 | Node 22 nativo, zero dependências, módulos separados, migrações, CSRF/RBAC/testes. Desconto: `node:sqlite` experimental e falhas corrigidas nesta rodada. |
| Risco (maior = menos risco) | 6/10 | Controles centrais existem; faltava LGPD aplicada e havia DoS por `decodeURIComponent`. |
| Inovação | 7/10 | Validador CLT/EC 141 preventivo + soberania de dados local; o resto é catch-up de mercado. Mascote/animação não é diferenciação. |
| Eficiência de recursos | 8/10 | Custo quase zero, solo dev, valor em semanas; próximos itens (PWA/push) exigem semanas e infra. |

**Opportunity Score: 6,8/10 — Moderate/Strong (CONDITIONAL GO).**
**Project Health: 7/10** (arquitetura limpa, 7 testes, backup; sem CI/linter/cobertura até esta rodada).

### Correções aplicadas a partir da avaliação
1. CSRF agora exige **header** (removido o fallback que aceitava o próprio cookie) e valida `Origin`.
2. Sessão com `token_version`: logout revoga de verdade; rate limit com limpeza de entradas expiradas e teto de 5.000.
3. `decodeURIComponent` protegido (URI malformada retorna 400 sem derrubar o processo) — `server/index.js`.
4. Validador: janela rolling de 7 dias (máx. 5 trabalhados), vigência exata 16/12/2026 e 16/12/2027, detecção de sobreposição de turnos.
5. `x-forwarded-for` só é confiado com `TRUST_PROXY=1`.
6. CI no GitHub Actions (`npm run check` + `npm test`) e script de checagem de sintaxe.
7. Testes ampliados para 6 subtestes (revogação de sessão e caminho inválido incluídos).

### Conflito resolvido
Mercado diz que "conformidade" não é exclusiva (concorrente brasileiro já bloqueia por 11 h e limites); inovação diz que é o principal diferencial. Resolução: o validador só sustenta diferenciação se for **preventivo, configurável por convenção e auditável como evidência** — não apenas um relatório depois do fato.

### Course Corrections: PERSEVERE com ajustes
Não pivotar. Melhorias restantes, em ordem:
1. **Camada LGPD antes de dados reais**: aviso de privacidade ao empregado, base legal art. 7º, II/V registrada, tabela de temporalidade, exportação/eliminação do titular (art. 18) e plano de comunicação de incidente em 3 dias úteis. Único item classificado como **crítico**.
2. **Conformidade preventiva**: validar no ato de salvar/publicar, com override justificado e auditado, sempre como "apontamento", nunca parecer jurídico; revisar matriz com advogado/sindicato.
3. **Troca de turnos + disponibilidade com aprovação** (3–5 dias) e **notificações in-app primeiro** — ataca adoção, que é o maior risco de negócio.
4. **PWA offline só para leitura** (6–8 dias) depois das notificações; service worker é pré-requisito de Web Push.
5. **Regras configuráveis por convenção/categoria** e dossiê de conformidade em PDF com hash — transforma o validador em prova defensável.
6. **Monetização**: freemium por empresa/unidade até ~10 funcionários, cobrança via Pix recorrente, faixa R$ 50–130/mês; cobrar por recurso (templates, trocas, notificações, multunidade), não por funcionário.
7. **Engenharia**: linter + cobertura no CI, fixar versão do Node e planejar saída do `node:sqlite` experimental; mover uploads fora do webroot com handler autenticado.

## 9. Reavaliação após as correções (18/11/2026)

| Dimensão | Antes | Agora | Motivo |
| --- | --- | --- | --- |
| Técnica | 8 | **9/10** | Uploads fora do webroot, validação preventiva, CI + linter, 13 testes. Desconto: `node:sqlite` ainda experimental. |
| Project Health | 7 | **9/10** | Testes de integração + unidade, ESLint limpo, GitHub Actions, Docker Compose, `.nvmrc`, documentação ampliada. Falta cobertura medida e CD automático. |
| Risco (maior = menos risco) | 6 | **8/10** | Camada LGPD (art. 18), conformidade preventiva com override auditado, sessão revogável, DoS corrigido. Restam senhas padrão e runtime experimental. |
| Inovação | 7 | **8/10** | Validador preventivo + auditoria como evidência. Ainda sem regras configuráveis por convenção e dossiê PDF. |
| Comercial | 5 | **5/10** | **Não muda com código.** Modelo de receita, pricing e tração seguem como `insufficient data`. |
| Eficiência de recursos | 8 | **8/10** | Continua enxuta; PWA e notificações exigem semanas. |

**Oportunidade revisada: 7,6/10. Health: 9/10.**

### Por que não 10/10 (honestamente)
- **Comercial 10/10 exige evidência de mercado**: clientes pagantes, preço testado, retenção. Nenhuma linha de código produz isso; é preciso piloto com 3–5 empresas e dados reais.
- **Health 10/10 exige cobertura medida, CD com deploy automático e bus factor > 1** (segundo desenvolvedor ou revisão externa).
- **Risco 10/10 exige troca obrigatória das senhas padrão, saída do `node:sqlite` experimental e parecer jurídico validado** sobre a matriz EC 141/2026.
- **Inovação 10/10 exige o dossiê PDF com hash e regras configuráveis por convenção** — ainda no roadmap.

### Para chegar a 10/10 (plano restante)
1. Piloto com empresas reais + definição de preço e cobrança via Pix recorrente → resolve Comercial.
2. Cobertura de testes (`node --test --experimental-test-coverage`) e CD com deploy automático → resolve Health.
3. Troca obrigatória de senha no primeiro login e migração para driver SQLite estável → resolve Risco.
4. Regras configuráveis por convenção + dossiê de conformidade em PDF com hash, revisados por advogado/sindicato → resolve Inovação e o último risco jurídico.

## 10. Diferenciais implementados para atacar o comercial

| Diferencial | O que entrega | Por que pode vender |
| --- | --- | --- |
| **Regras configuráveis por convenção** | Limites de jornada, repouso, extras e fonte da regra editáveis pela tela de Conformidade | Transforma o validador fixo em motor de compliance adaptável a sindicato/categoria — algo que os concorrentes genéricos não fazem |
| **Selo de publicação com hash SHA-256** | Cada mês publicado gera snapshot imutável com autor, data e hash | Cria um "ponto de verdade" sobre o que foi escalado e quando |
| **Dossiê de conformidade em PDF** | PDF com escala, apontamentos, regras vigentes, auditoria e hash — pronto para advogado, sindicato ou RT | Tira o gestor da posição de "sem prova" em reclamação trabalhista; valor monetário claro (evita passivo) |
| **Troca de turnos com aprovação + notificações in-app** | Funcionário solicita, admin aprova, ambos são notificados | Ataca adoção — o maior risco de negócio apontado pelo avaliador de mercado |
| **Soberania de dados local** | SQLite self-host, uploads fora do webroot, zero dependências de runtime | Diferencial para PMEs com receio de LGPD/nuvem; base para plano On-prem com setup |

**Reposicionamento recomendado**: deixar de vender "software de escala" (commodity, grátis até 10 funcionários) e vender **"prova defensável da jornada"** para PMEs que já pagam advogado/contador. Preço sugerido: freemium até 10 funcionários/1 unidade; Pro R$ 79–129/mês por unidade com dossiê, trocas, notificações e multunidade; On-prem com taxa de setup.

**Efeito esperado nas notas**: Inovação sobe de 8 para **9/10**; Risco permanece 8; Comercial **continua 5 até haver piloto, preço testado e depoimento**. Nenhuma feature sozinha transforma `insufficient data` em evidência de mercado.

## 11. Fluxo de trabalho, convites e organização

Pesquisa de referência: fluxos de convite com código + aprovação explícita (Eventcloud, Gradual, Gevme), hierarquia de papéis com menor privilégio (Gitscrum) e RACI com trilha de auditoria (Bizzabo).

**Implementado:**
- **Cadastro por convite**: código de 10 caracteres gerado pelo admin, válido por 7 dias; o usuário informa código + dados; a conta nasce inativa; o admin aprova ou recusa o vínculo. Notificações avisam o admin na solicitação e o usuário na aprovação.
- **Organização**: setores, equipes (por setor) e cargos com nível — integrantes podem ser vinculados aos três.
- **Tarefas**: criação por pessoa/equipe/setor, prioridade, prazo, status e comentários. Funcionário vê e atualiza apenas tarefas atribuídas a ele, à equipe ou ao setor; admin vê todas.
- **Chamados por setor**: qualquer usuário abre chamado direcionado a um setor; conversa com mensagens; admin controla status e responsável; notificações para admin e responsável.
- **Permissões**: admin faz gestão de acesso e estrutura; funcionário acessa dashboard, tarefas, chamados e privacidade. Rotas protegidas no servidor.

**Por que melhora o comercial**: passa a ser uma ferramenta de fluxo de trabalho da empresa inteira (não só escala), aumentando o custo de troca e criando motivos para o plano Pro (múltiplos setores, equipes e chamados). A adoção — maior risco apontado pelo avaliador de mercado — é atacada diretamente.

## 12. Mapa do local e chamados direcionados

- **Mapa**: zonas editáveis em SVG (arraste para reposicionar), fluxos entre áreas com setas, presença por pessoa ("Onde você está") e distribuição por área. Layout padrão criado com Vendas, Estoque, RMA, Supermercado, Garagem e Ponto; o endereço da empresa passa a ficar nas configurações e aparece no mapa.
- **Chamados evoluídos**: seleção de setor com descrição, responsável do setor (atribuição automática) e chamada a pessoas específicas com aceite/recusa e notificações.
- **Localização por GPS (evolução)**: o administrador cadastra as coordenadas reais e o raio de cada cômodo; o funcionário autoriza o uso da localização do celular e o servidor calcula (haversine) em qual raio ele está. Coordenadas fora de todos os raios aparecem como "fora". A seleção manual permanece como alternativa quando o navegador nega a permissão. Por ser dado de localização do empregado, o uso deve constar da política de privacidade e ser limitado ao horário de trabalho (LGPD art. 7º, IX com ponderação registrada).

Isso transforma o mapa em uma ferramenta de distribuição de trabalho: o gestor vê onde cada pessoa está e para onde o fluxo vai, sem recorrer a mensagens informais.
