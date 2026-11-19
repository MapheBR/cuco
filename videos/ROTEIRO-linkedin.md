# Cuco — Entrega 1: vídeo para LinkedIn

## Decisão de formato

- **Proporção:** 4:5 (1080×1350), recomendada para o feed (mais espaço no celular).
- **Duração:** 1:15 (75 s).
- **Áudio:** sem narração. Música de fundo e efeitos sonoros **sintetizados localmente** (`scripts/generate-audio.js`), portanto livres para uso comercial. Legendas embutidas.
- **Título fixo no topo:** `Cuco — Controle de escalas` durante todo o vídeo.
- **Formato:** 100% desktop dentro de mockup de notebook, capturas reais em 1920×1080.
- **Identidade:** logo `logo-escuro-compacto.png`, Cuco em SVG com a asa acenando e balões animados.

## Roteiro falado / cena a cena

Não há fala em áudio. O Cuco "fala" por balões de texto animados (entrada com escala + leve flutuação).

| Tempo | Duração | Cena | Legenda na tela | Balão do Cuco |
| --- | --- | --- | --- | --- |
| 0:00–0:03 | 3 s | Abertura: logo + Cuco | — | `Oi, eu sou o Cuco! Vamos ver o que eu faço.` |
| 0:03–0:15 | 12 s | Notebook: Visão geral | `Visão geral` / `Escalas, horas e avisos do mês.` | `Tem escala hoje? Eu te mostro.` |
| 0:15–0:28 | 13 s | Notebook: Escalas | `Escala semanal` / `O gestor monta os turnos em poucos cliques.` | `Cadastre, filtre e troque o status em um clique.` |
| 0:28–0:41 | 13 s | Notebook: Conformidade | `Conformidade` / `Regras da CLT e da EC 141 antes de publicar.` | `Eu confiro jornada, repouso e horas extras.` |
| 0:41–0:54 | 13 s | Notebook: Convites | `Convites` / `O administrador aprova quem entra no sistema.` | `Gere um código e aprove o vínculo.` |
| 0:54–1:07 | 13 s | Notebook: Auditoria | `Auditoria` / `Cada ação fica registrada com usuário e data.` | `Tudo registrado, com IP e data.` |
| 1:07–1:15 | 8 s | Encerramento: logo + Cuco | `Ver repositório` / `github.com/MapheBR/cuco` | `Veja o código no repositório!` |

## Lista de textos e legendas

**Título fixo:** `Cuco — Controle de escalas`

**Legendas das cenas:**
1. `Visão geral` — `Escalas, horas e avisos do mês.`
2. `Escala semanal` — `O gestor monta os turnos em poucos cliques.`
3. `Conformidade` — `Regras da CLT e da EC 141 antes de publicar.`
4. `Convites` — `O administrador aprova quem entra no sistema.`
5. `Auditoria` — `Cada ação fica registrada com usuário e data.`
6. `Ver repositório` — `github.com/MapheBR/cuco`

**Balões do Cuco:** ver coluna da tabela acima.

## Áudio e animação

- `videos/audio-linkedin.wav` — música (pad de acordes + arpeggio suave) e pops suaves nas transições, gerados por `scripts/generate-audio.js`. Sem voz, sem samples de terceiros.
- O Cuco é o SVG original do projeto (`public/assets/mascote_passarinho.svg`) com a asa animada por CSS. Os balões entram com escala e flutuação leve, controlados quadro a quadro por `scripts/render-video-linkedin.js`.

## Instruções de gravação / reprodução

1. Suba uma instância temporária com dados fictícios (não toca no banco real):
   ```powershell
   $env:DB_PATH="$env:TEMP\cuco-video-demo.db"
   $env:SEED_DEMO='1'
   $env:PORT='4310'
   node --no-warnings=ExperimentalWarning server/index.js
   ```
2. Capture as telas: `node scripts/capture-video-screens.js` (login `admin`/`admin123`, viewport 1920×1080, sem cursor e após o desaparecimento do confete).
3. Gere o áudio: `node scripts/generate-audio.js`.
4. Renderize: `node scripts/render-video-linkedin.js`.
   - Projeto editável: `videos/composition-linkedin.html`.
   - Render: Chrome headless (`puppeteer-core`), 750 frames determinísticos, encode com `ffmpeg-static` e AAC.
5. Resultado: `videos/cuco-linkedin-final.mp4`.

## Entregáveis

- Vídeo: `videos/cuco-linkedin-final.mp4`
- Roteiro: `videos/ROTEIRO-linkedin.md`
- Áudio: `videos/audio-linkedin.wav`
- Animação/composição: `videos/composition-linkedin.html` + `scripts/render-video-linkedin.js`
- Capturas: `videos/capture/*.png`

## Checklist de publicação — vídeo

- [x] MP4 H.264/yuv420p + AAC, 1080×1350, 75 s
- [x] Título fixo no topo
- [x] Legendas curtas e explicativas em cada cena
- [x] Balões do Cuco animados
- [x] Música e efeitos sintetizados localmente (uso comercial livre)
- [x] Logo, Cuco e paleta do projeto em todas as cenas
- [x] Chamada final para o repositório
- [ ] Sua revisão final
- [ ] Post nativo no LinkedIn

## Texto curto para o post

> Apresento o **Cuco**: controle de escalas com conformidade trabalhista, convites com aprovação e auditoria completa. Tudo em um painel simples, rodando local com Node 22 + SQLite. O vídeo mostra cada função em 75 segundos. O código está no repositório (link nos comentários).
