'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const root = path.join(__dirname, '..');
const capture = path.join(root, 'videos', 'capture');
const framesDir = path.join(root, 'videos', 'frames-linkedin');
const output = path.join(root, 'videos', 'cuco-linkedin-final.mp4');
fs.mkdirSync(framesDir, { recursive: true });
for (const file of fs.readdirSync(framesDir)) fs.unlinkSync(path.join(framesDir, file));

let svg = fs.readFileSync(path.join(root, 'public', 'assets', 'mascote_passarinho.svg'), 'utf8');
svg = svg.replace(/<path d="M347 315/g, '<path class="wave-arm" d="M347 315')
  .replace(/<path d="M355 321/g, '<path class="wave-arm" d="M355 321')
  .replace(/<path d="M391 304/g, '<path class="wave-arm" d="M391 304');

const fileUrl = (p) => `file:///${p.replace(/\\/g, '/')}`;
const logo = fileUrl(path.join(root, 'public', 'assets', 'logo-escuro-compacto.png'));
const screen = (name) => fileUrl(path.join(capture, `${name}.png`));

const scenes = [
  { frames: 30, type: 'open', caption: '', desc: '', speech: 'Oi, eu sou o Cuco! Vamos ver o que eu faço.' },
  { frames: 120, type: 'app', image: 'dashboard', caption: 'Visão geral', desc: 'Escalas, horas e avisos do mês.', speech: 'Tem escala hoje? Eu te mostro.' },
  { frames: 130, type: 'app', image: 'shifts', caption: 'Escala semanal', desc: 'O gestor monta os turnos em poucos cliques.', speech: 'Cadastre, filtre e troque o status em um clique.' },
  { frames: 130, type: 'app', image: 'compliance', caption: 'Conformidade', desc: 'Regras da CLT e da EC 141 antes de publicar.', speech: 'Eu confiro jornada, repouso e horas extras.' },
  { frames: 130, type: 'app', image: 'invitations', caption: 'Convites', desc: 'O administrador aprova quem entra no sistema.', speech: 'Gere um código e aprove o vínculo.' },
  { frames: 130, type: 'app', image: 'audit', caption: 'Auditoria', desc: 'Cada ação fica registrada com usuário e data.', speech: 'Tudo registrado, com IP e data.' },
  { frames: 80, type: 'close', caption: 'Ver repositório', desc: 'github.com/MapheBR/cuco', speech: 'Veja o código no repositório!' },
];

let start = 0;
const sceneHtml = scenes.map((scene, index) => {
  const content = scene.type === 'app'
    ? `<div class="laptop"><div class="screen"><img src="${screen(scene.image)}"></div><div class="base"><span></span></div></div>
       <div class="caption"><strong>${scene.caption}</strong><span>${scene.desc}</span></div>
       <div class="mascot-corner">${svg}</div><div class="speech app-speech">${scene.speech}</div>`
    : `<div class="center"><img class="center-logo" src="${logo}"><div class="mascot-center">${svg}</div><div class="speech">${scene.speech}</div>
       ${scene.caption ? `<div class="caption center-caption"><strong>${scene.caption}</strong><span>${scene.desc}</span></div>` : ''}</div>`;
  const html = `<section class="scene" data-scene="${index}" data-start="${start}" data-frames="${scene.frames}">${content}</section>`;
  start += scene.frames;
  return html;
}).join('');

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;width:1080px;height:1350px;overflow:hidden;background:#0A4A2B;font-family:'Segoe UI',sans-serif;color:#fff}
#stage{position:relative;width:1080px;height:1350px;background:linear-gradient(160deg,#0E5B34,#062A18);overflow:hidden}
#stage:before{content:'';position:absolute;width:900px;height:900px;border:2px solid rgba(255,255,255,.07);border-radius:50%;right:-460px;top:-380px}
.top-logo{position:absolute;left:64px;top:42px;width:175px;z-index:8}
.fixed-title{position:absolute;left:64px;top:112px;font-size:27px;font-weight:800;letter-spacing:-.4px;z-index:8;color:#fff}
.top-logo img{width:100%;display:block}
.scene{position:absolute;inset:0;opacity:0;display:flex;align-items:center;justify-content:center;flex-direction:column}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
.center-logo{width:430px;display:block}
.mascot-center{width:420px}
.center .caption{font-size:32px;color:#D7EFDF;margin-top:10px}
.laptop{width:940px;position:relative;filter:drop-shadow(0 30px 45px rgba(0,0,0,.4))}
.screen{height:529px;border:13px solid #1B211E;border-bottom-width:16px;border-radius:18px;background:#fff;overflow:hidden}
.screen img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
.base{height:18px;margin:0 54px;background:linear-gradient(#39423C,#151A17);border-radius:0 0 18px 18px;position:relative}
.base span{position:absolute;width:110px;height:6px;background:#202722;border-radius:0 0 8px 8px;left:50%;transform:translateX(-50%);top:0}
.caption{position:absolute;top:965px;width:100%;text-align:center}
.caption strong{display:block;font-size:34px;font-weight:800;letter-spacing:-.5px}
.caption span{display:block;font-size:21px;color:#D7EFDF;margin-top:6px}
.center-caption{position:static;margin-top:16px}
.center-caption span{font-size:20px}
.mascot-corner{position:absolute;left:70px;top:1040px;width:120px;opacity:.95}
.speech{background:#fff;color:#0E4B2B;font-size:21px;font-weight:800;padding:13px 20px;border-radius:16px;box-shadow:0 12px 26px rgba(0,0,0,.22);position:relative;max-width:590px;text-align:center;margin-top:6px;transform:scale(var(--bubble-scale,1)) translateY(var(--bubble-y,0));opacity:var(--bubble-opacity,1)}
.speech:before{content:'';position:absolute;top:-10px;left:50%;transform:translateX(-50%);border-left:11px solid transparent;border-right:11px solid transparent;border-bottom:11px solid #fff}
.app-speech{position:absolute;left:204px;top:1062px;max-width:620px;font-size:20px;padding:12px 18px}
.app-speech:before{left:-8px;top:26px;transform:none;border-top:10px solid transparent;border-bottom:10px solid transparent;border-right:11px solid #fff;border-left:0}
.scene svg{width:100%;height:auto;display:block;filter:drop-shadow(0 12px 18px rgba(0,0,0,.3))}
.wave-arm{transform-origin:340px 380px;transform-box:view-box;transform:rotate(var(--wave,0deg))}
.progress{position:absolute;left:64px;right:64px;bottom:48px;height:4px;background:rgba(255,255,255,.18);border-radius:4px}
.progress span{display:block;height:100%;width:0;background:#F5B942;border-radius:4px}
.footer{position:absolute;left:64px;bottom:20px;font-size:14px;color:rgba(255,255,255,.5)}
</style></head><body><div id="stage">
  <img class="top-logo" src="${logo}">
  <div class="fixed-title">Cuco — Controle de escalas</div>
  ${sceneHtml}
  <div class="progress"><span id="bar"></span></div><div class="footer">cuco · controle de escalas</div>
</div><script>
const scenes=[...document.querySelectorAll('.scene')];
window.setFrame=function(f){
  const total=750;
  document.getElementById('stage').style.setProperty('--wave',(Math.sin(f*0.3)*14)+'deg');
  scenes.forEach((s,i)=>{
    const start=+s.dataset.start, frames=+s.dataset.frames;
    const active=f>=start && f<start+frames;
    const local=active?(f-start)/frames:0;
    s.style.opacity=active?Math.min(1,local*8):0;
    if(active){
      const cap=s.querySelector('.caption');
      if(cap) cap.style.opacity=Math.max(0,Math.min(1,(local-0.12)*7));
      s.querySelectorAll('.speech').forEach((bubble)=>{
        const pop=Math.max(0,Math.min(1,(local-0.04)*9));
        const eased=1-Math.pow(1-pop,3);
        bubble.style.setProperty('--bubble-scale',(0.72+0.28*eased).toFixed(3));
        bubble.style.setProperty('--bubble-y',((1-eased)*14+Math.sin(f*0.25)*1.5).toFixed(1)+'px');
        bubble.style.setProperty('--bubble-opacity',eased.toFixed(3));
      });
    }
  });
  document.getElementById('bar').style.width=(f/total*100)+'%';
};
window.setFrame(0);
</script></body></html>`;

fs.writeFileSync(path.join(root, 'videos', 'composition-linkedin.html'), html);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  await page.goto(fileUrl(path.join(root, 'videos', 'composition-linkedin.html')));
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 750; i++) {
    await page.evaluate((frame) => window.setFrame(frame), i);
    await page.screenshot({ path: path.join(framesDir, `frame${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();

  const result = spawnSync(ffmpeg, [
    '-y', '-framerate', '10', '-i', path.join(framesDir, 'frame%04d.png'),
    '-i', path.join(root, 'videos', 'audio-linkedin.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', output,
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.slice(-1200));
  console.log('Vídeo gerado:', output);
})().catch((error) => { console.error(error.message); process.exit(1); });
