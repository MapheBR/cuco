# Changelog

Formato baseado em Keep a Changelog. Datas no padrão AAAA-MM-DD.

## [1.0.0] - 2026-11-19

### Adicionado

- Primeira instalação sem dados de exemplo: criação do administrador principal.
- Escalas com formulário, filtros, tabela, troca de status e CSV.
- Conformidade trabalhista com regras configuráveis, validação preventiva, selo SHA-256 e dossiê PDF.
- Convites com código de 7 dias e aprovação de vínculo pelo administrador.
- Perfis administrador/funcionário com RBAC no servidor.
- Organização por setores, equipes e cargos; trocas de turno; notificações in-app.
- Auditoria com usuário, IP, user-agent e data.
- Privacidade LGPD com exportação e exclusão dos dados do titular.
- PWA com cache offline e backup automático do SQLite.
- Vídeo de apresentação para LinkedIn e documentação de publicação.

### Segurança

- Senhas scrypt + salt, cookie `HttpOnly` assinado, CSRF, rate limit e revogação de sessão.
- Uploads fora do webroot com validação de MIME e assinatura.
- CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- Varredura de arquivos e histórico do Git antes da publicação.

### Mudanças

- Versão podada e auditada do Cuco após revisão de QA.
- Licença alterada para Business Source License 1.1 com conversão para MIT.
