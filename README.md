# Cuco — Controle de escalas

Sistema web completo (front + back + banco local) para controle de escala de trabalho, com o mascote Cuco, autenticação por perfil, auditoria, animações contínuas e fotos de usuários.

## Rodar no localhost

Requisito: **Node.js 22.5+** (usa o módulo nativo `node:sqlite`, sem dependências externas).

```bash
npm start
```

Abra **http://localhost:3000**. Para reiniciar ao editar: `npm run dev`. No Windows, dê duplo clique em `iniciar.bat`.

Variáveis de ambiente: `PORT`, `HOST` e `SESSION_SECRET` (defina uma chave fixa antes de publicar).

## Perfis de acesso

| Usuário | Senha | Perfil | Acesso |
| --- | --- | --- | --- |
| `admin` | `admin123` | Administrador | Painel completo, escalas, equipe, usuários, auditoria e configurações |
| `funcionario` | `funcionario123` | Funcionário | Somente o dashboard, com as próprias escalas e confirmação de turno |
| `cuco` | `cuco123` | Funcionário | Segundo funcionário de exemplo |

O funcionário é vinculado a um integrante da equipe. No cadastro de usuário (tela de Usuários), o campo **Integrante vinculado** define quais escalas aparecem no painel dele. As rotas de administração retornam **403** para funcionários — a proteção existe no servidor, não apenas na interface.

> Troque as senhas padrão antes de publicar.

## Funcionalidades

**Administrador**
- Dashboard com indicadores animados (contagem progressiva), gráfico de rosca de status, tendência semanal, carga por integrante, calendário e alertas.
- Gestão de escalas: formulário, busca, filtros, troca rápida de status na tabela e exportação CSV.
- Gestão de equipe e usuários, com foto, senha hash e vínculo de integrante.
- **Conformidade**: validador automático de escala (jornada semanal, 2 dias de repouso, 11 h entre turnos, intervalo de 1 h e horas extras), com severidades e exportação CSV. Apontamentos, não parecer jurídico.
- Auditoria: trilha de login, logout, criações, edições, exclusões e alterações de configuração, com filtro e exportação.
- Configurações gerais: empresa, contato, horários padrão e dias de aviso.
- Privacidade: aviso LGPD e exportação/exclusão dos próprios dados pelo perfil.
- PWA: instalável no celular, com cache offline para leitura do painel e das escalas.

**Funcionário**
- Dashboard restrito com próximas escalas, horas, turnos confirmados e próximo turno.
- Confirmação de presença em cada escala vinculada a ele.
- Edição do próprio perfil (nome, foto e senha) pelo menu do usuário.

**Geral**
- Splash de carregamento animado e tela de login com mascotas, blobs, anel giratório e feedback de erro.
- Movimento contínuo e discreto no ambiente (gradiente, órbitas, brilho dos indicadores) e mascote interativo. Respeita `prefers-reduced-motion` e o botão de pausa.
- Mascote interativo: os olhos e o corpo acompanham o cursor e, em intervalos aleatórios, ele pisca, pula, inclina a cabeça ou acena — sem loop repetitivo.
- Botão **Pausar animações** no topo (persistido no navegador) e foco visível com contraste para navegação por teclado.
- Logo em duas variantes: `logo-claro.png` (cuco verde + ponto amarelo, para fundo claro) e `logo-escuro.png` (cuco branco + ponto amarelo, para fundo verde).
- Troca de página imediata, confete em ações de sucesso e estados de loading/vazio/erro em todas as telas.

## Banco de dados

Arquivo SQLite local em `data/cuco.db`, criado e populado na primeira execução com 5 integrantes e escalas de exemplo.

Tabelas: `members`, `shifts`, `settings`, `users`, `activity_log`. Senhas com hash **scrypt + salt**; sessão em cookie `HttpOnly` assinado com HMAC; **CSRF double-submit** em todas as mutações; rate limit de login; cookie `Secure` automático em produção. Uploads validam MIME, assinatura da imagem e tamanho (2 MB).

Respostas HTTP com `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy`. A auditoria registra IP e user-agent (`x-forwarded-for` só é aceito com `TRUST_PROXY=1`). Fotos ficam em `data/uploads/`, fora do webroot, servidas por handler autenticado. Conformidade é preventiva: salvar uma escala com apontamento crítico exige override auditado.

Comandos úteis: `npm run check` (sintaxe), `npm run lint` (ESLint), `npm test` (13 testes de integração e unidade) e `npm run backup` (`VACUUM INTO`, 7 cópias). O GitHub Actions roda `check`, `lint` e `test` a cada push em `main`. Para produção: `docker compose up -d --build` (defina `SESSION_SECRET`).

## API

| Método | Rota | Perfil |
| --- | --- | --- |
| GET | `/api/health` | público |
| POST | `/api/login` · `/api/logout` | público / autenticado |
| GET | `/api/me` · `/api/summary` · `/api/settings` (leitura) · `/api/my-shifts` | autenticado |
| PUT | `/api/me/profile` · `/api/my-shifts/:id/confirm` | autenticado |
| GET/DELETE | `/api/me/data` | autenticado (LGPD art. 18) |
| POST | `/api/upload` | autenticado |
| CRUD | `/api/members` · `/api/shifts` · `/api/users` | admin |
| GET | `/api/compliance?month=YYYY-MM` | admin |
| POST | `/api/compliance/check` (prévia preventiva) | admin |
| GET | `/api/audit?q=&limit=` | admin |
| PUT | `/api/settings` | admin |

## Publicar

1. Copie a pasta para o servidor e rode `npm start` (ou PM2/systemd).
2. Proxy reverso (Nginx/Caddy) apontando para a porta 3000, com HTTPS.
3. Defina `SESSION_SECRET`, troque as senhas padrão e faça backup de `data/cuco.db` e `public/uploads/`.
