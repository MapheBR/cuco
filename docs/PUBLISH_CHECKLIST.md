# Checklist de publicação

## Repositório

- [x] Visibilidade pública em `MapheBR/cuco`
- [x] `LICENSE` (BSL 1.1) e `NOTICE` com autoria
- [x] `README.md` com logo, descrição, funcionalidades, telas, stack, execução e roadmap
- [x] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `SECURITY.md`
- [x] `docs/ARCHITECTURE.md` e `docs/RESEARCH.md`
- [x] Varredura de arquivos e histórico do Git por segredos e dados pessoais
- [x] `.gitignore` cobrindo `.env`, banco, secret, uploads, backups e frames de vídeo
- [x] `.env.example` sem valores reais
- [x] `npm audit` sem vulnerabilidades
- [x] CI com `check`, `lint` e `test`
- [x] Dependabot e revisão de dependências
- [x] CodeQL e secret scanning habilitados
- [x] Branch protection em `main` (PR + status checks)
- [x] Contato de segurança: marcosfeliphe404@gmail.com
- [ ] Revisão final do usuário antes de publicar

### Não publicar

- `data/cuco.db`, `data/.secret`, `data/uploads/`, `backups/`
- `.env` ou qualquer chave/token
- Banco de produção, dados de clientes, CPF/e-mail reais
- Logos/mascote em produtos de terceiros sem autorização

## Vídeo

- [x] `videos/cuco-linkedin-final.mp4` — 1080×1350, 1:15, H.264/AAC
- [x] Título fixo e legendas com nome + explicação da função
- [x] Balões animados do Cuco
- [x] Música/efeitos sintetizados localmente (uso comercial livre)
- [x] Roteiro em `videos/ROTEIRO-linkedin.md`
- [x] Capturas limpas em `videos/capture/`
- [ ] Revisão final do usuário
- [ ] Upload como post nativo no LinkedIn

## Texto para o post

> Apresento o **Cuco**: controle de escalas com conformidade trabalhista, convites com aprovação e auditoria completa. Tudo em um painel simples, rodando local com Node 22 + SQLite. O vídeo mostra cada função em 75 segundos. O código está no repositório (link nos comentários).
