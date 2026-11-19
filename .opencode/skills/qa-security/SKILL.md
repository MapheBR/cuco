---
name: QA Security
description: Auditoria de segurança do Cuco baseada em OWASP: headers, CSP, XSS, injeção, CSRF, upload, segredos e vazamentos.
---

# QA Security

Use em toda rodada de QA e antes de publicar. Teste apenas no ambiente local/isolado.

## Superfície do Cuco

- SPA vanilla com `innerHTML`; todo dado dinâmico precisa passar por `esc()`.
- API JSON com `node:sqlite` e prepared statements.
- Sessão por cookie + CSRF em escritas.
- Upload de imagem em base64 com validação de assinatura.
- Exportação CSV/PDF e auditoria com IP/user-agent.
- Service worker e CSP.

## Checklist OWASP

### Headers e transporte
- `Content-Security-Policy` sem `unsafe-eval`; `script-src 'self'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`.
- HSTS quando HTTPS; cookies `HttpOnly`, `SameSite`, `Secure` em produção.
- Sem stack trace, SQL, caminho absoluto ou segredo em resposta de erro.

### XSS
- Injete `<script>`, `<img onerror>`, `javascript:`, SVG e payload com aspas em nome, descrição, observação, título de turno, convite.
- Verifique se aparece como texto e se `esc()` cobre `& < > " '`.
- Confira `innerHTML` com interpolação não escapada em todas as views.
- Teste nome de usuário/integrante refletido no dashboard, tabela, modal e PDF.

### Injeção
- SQLi em login, filtros, busca, IDs e ordenação: `' OR 1=1--`, `"; DROP TABLE`, Unicode.
- Confirme prepared statements e ausência de concatenação com input.
- Path traversal em upload/download e nomes de arquivo.
- Prototype pollution via JSON (`__proto__`, `constructor`).

### CSRF e sessão
- Escrita sem token, token de outra sessão, token expirado, `Origin` externa.
- Fixação de sessão no login; rotação de token.
- Logout invalida no servidor; cookie antigo não reautentica.

### Upload
- Tipo declarado vs assinatura real; SVG/HTML disfarçado; arquivo vazio; > 2 MB; base64 inválido.
- Nome gerado no servidor (UUID), sem confiar no nome original.
- Conteúdo servido de `data/uploads` com tipo correto e sem execução.

### Abuso e disponibilidade
- Rate limit de login; body JSON gigante; campos com arrays/objetos; requisições repetidas.
- Nenhum endpoint pesado acessível sem auth.
- Erros não derrubam o processo.

### Segredos e dependências
- Nenhuma senha/chave/token no repositório, README, logs ou assets.
- `SESSION_SECRET` documentado para produção.
- `npm audit` (se rede disponível) sem crítico/alto; não instalar nada sem autorização.

## Evidência

Requisição/resposta, payload, status, trecho de código e screenshot quando visual. Para cada falha, indique impacto e correção.

## Critério de falha

XSS executável, SQLi, bypass de auth/CSRF, upload de executável, vazamento de segredo ou dado entre perfis é P0.
