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
