'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const root = path.join(__dirname, '..');
const assets = path.join(root, 'videos', 'assets');
const framesDir = path.join(root, 'videos', 'frames-hd');
const output = path.join(root, 'videos', 'cuco-linkedin-hd.mp4');
fs.mkdirSync(framesDir, { recursive: true });
for (const file of fs.readdirSync(framesDir)) fs.unlinkSync(path.join(framesDir, file));

let svg = fs.readFileSync(path.join(root, 'public', 'assets', 'mascote_passarinho.svg'), 'utf8');
svg = svg.replace(/<path d="M347 315/g, '<path class="wave-arm" d="M347 315')
  .replace(/<path d="M355 321/g, '<path class="wave-arm" d="M355 321')
  .replace(/<path d="M391 304/g, '<path class="wave-arm" d="M391 304');

const assetUrl = `file:///${assets.replace(/\\/g, '/')}/`;
const slides = [
  { key: 'intro', title: 'CUCO', sub: 'Controle de escalas com conformidade', bullets: ['Do turno à auditoria', 'Em uma só plataforma'] },
  { key: 'desktop', title: 'Visão operacional', sub: 'Gestão completa no computador', bullets: ['Escalas, equipe e usuários', 'Filtros, tabelas e ações rápidas'] },
  { key: 'mobile', title: 'Mobilidade', sub: 'A operação acompanha o gestor', bullets: ['Layout responsivo', 'Telas e indicadores no celular'] },
  { key: 'arquitetura', title: 'Arquitetura técnica', sub: 'Simples de rodar, fácil de manter', bullets: ['Node 22 + node:sqlite', 'API REST + front vanilla + PWA', 'Zero dependências de runtime'] },
  { key: 'compliance', title: 'Conformidade trabalhista', sub: 'Regras configuráveis por convenção', bullets: ['EC 141/2026: 44h → 42h → 40h', 'Dossiê PDF com hash SHA-256', 'Auditoria com IP, usuário e data'] },
  { key: 'acesso', title: 'Acesso controlado', sub: 'Convites com aprovação de vínculo', bullets: ['Administrador e funcionário', 'RBAC no servidor', 'CSRF, scrypt e cookies protegidos'] },
  { key: 'seguranca', title: 'Segurança e privacidade', sub: 'Dados localmente sob seu controle', bullets: ['LGPD e direitos do titular', 'Backup automático e CI', 'SQLite local, sem nuvem obrigatória'] },
  { key: 'cta', title: 'Comece do zero', sub: 'Crie o administrador e cadastre sua operação', bullets: ['Instalação limpa', 'Acesso: marcos'] },
];

const laptop = (img) => `<div class="laptop"><div class="laptop-screen"><img src="${assetUrl}${img}"></div><div class="laptop-base"><span></span></div></div>`;
const phone = (img) => `<div class="phone"><div class="notch"></div><img src="${assetUrl}${img}"></div>`;

const slideHtml = slides.map((s, i) => {
  let content = '';
  if (s.key === 'intro' || s.key === 'cta' || s.key === 'seguranca') {
    content = `<div class="bird-large">${svg}</div>`;
  } else if (s.key === 'desktop') {
    content = laptop('desktop-dashboard.jpg');
  } else if (s.key === 'mobile') {
    content = `<div class="phones">${phone('mobile-dashboard.jpg')}${phone('mobile-shifts.jpg')}${phone('mobile-compliance.jpg')}</div>`;
  } else if (s.key === 'arquitetura') {
    content = `<div class="boxes"><div class="box">NODE 22</div><div class="arrow">→</div><div class="box">API REST</div><div class="arrow">→</div><div class="box">SQLITE</div><div class="arrow">→</div><div class="box">PWA</div></div><div class="bird-small">${svg}</div>`;
  } else if (s.key === 'compliance') {
    content = laptop('desktop-compliance.jpg');
  } else {
    content = laptop('desktop-invitations.jpg');
  }
  return `<section class="slide" data-slide="${i}">
    <h1>${s.title}</h1><p class="sub">${s.sub}</p>
    <div class="bullets">${s.bullets.map((b) => `<div class="bullet"><i></i>${b}</div>`).join('')}</div>
    ${content}
  </section>`;
}).join('');

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#0A4A2B;font-family:'Segoe UI',sans-serif;color:#fff}
#stage{position:relative;width:1280px;height:720px;background:linear-gradient(135deg,#0E5B34 0%,#062A18 100%);overflow:hidden}
#stage:after{content:'';position:absolute;width:620px;height:620px;border:2px solid rgba(255,255,255,.08);border-radius:50%;right:-180px;top:-220px}
.brand{position:absolute;left:72px;top:42px;z-index:5}
.brand img{width:200px;height:auto;display:block}
.rule{width:70px;height:5px;background:#F5B942;margin-top:12px;border-radius:4px}
.slide{position:absolute;inset:0;padding:150px 72px 70px;opacity:0}
h1{font-size:52px;line-height:1.05;margin:0 0 10px;font-weight:800;letter-spacing:-1px}
.sub{font-size:23px;color:#CFEBD9;margin:0 0 26px}
.bullet{font-size:20px;font-weight:700;margin:13px 0;display:flex;align-items:center;gap:12px;max-width:560px}
.bullet i{width:10px;height:10px;background:#F5B942;border-radius:3px;display:block;flex:0 0 10px}
.laptop{position:absolute;left:655px;top:185px;width:555px;filter:drop-shadow(0 24px 34px rgba(0,0,0,.38))}
.laptop-screen{border:11px solid #1B211E;border-bottom-width:13px;border-radius:16px;background:#fff;height:325px;overflow:hidden}
.laptop-screen img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
.laptop-base{height:15px;margin:0 42px;background:linear-gradient(#39423C,#151A17);border-radius:0 0 16px 16px;position:relative}
.laptop-base span{position:absolute;width:96px;height:5px;background:#202722;border-radius:0 0 8px 8px;left:50%;transform:translateX(-50%);top:0}
.phones{position:absolute;left:640px;top:175px;display:flex;gap:18px}
.phone{width:195px;height:415px;border:11px solid #121713;border-radius:30px;background:#fff;overflow:hidden;position:relative;filter:drop-shadow(0 18px 24px rgba(0,0,0,.35))}
.phone img{width:100%;height:100%;object-fit:cover;object-position:left top;display:block}
.notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:62px;height:14px;background:#121713;border-radius:0 0 12px 12px;z-index:2}
.boxes{position:absolute;left:650px;top:250px;display:flex;align-items:center;gap:12px}
.box{width:110px;height:92px;background:#fff;color:#0E4B2B;border-radius:12px;display:grid;place-items:center;font-size:15px;font-weight:800}
.arrow{color:#F5B942;font-size:30px;font-weight:800}
.bird-large{position:absolute;right:60px;top:150px;width:330px}
.bird-small{position:absolute;right:80px;bottom:70px;width:180px}
.bird-large svg,.bird-small svg{width:100%;height:auto;display:block;filter:drop-shadow(0 16px 22px rgba(0,0,0,.3))}
.wave-arm{transform-origin:340px 380px;transform-box:view-box;transform:rotate(var(--wave,0deg))}
.progress{position:absolute;left:72px;bottom:42px;width:1136px;height:4px;background:rgba(255,255,255,.18);border-radius:4px}
.progress span{display:block;height:100%;background:#F5B942;border-radius:4px;width:0}
.footer{position:absolute;left:72px;bottom:22px;font-size:13px;color:rgba(255,255,255,.55)}
</style></head><body><div id="stage">
  <div class="brand"><img src="${assetUrl}../../public/assets/logo-escuro-compacto.png"><div class="rule"></div></div>
  ${slideHtml}
  <div class="progress"><span id="bar"></span></div><div class="footer">cuco · controle de escalas</div>
</div><script>
const slides=[...document.querySelectorAll('.slide')];
window.setFrame=function(f){
  const total=600, per=75, idx=Math.min(7,Math.floor(f/per)), local=(f%per)/per;
  const wave=Math.sin(f*0.28)*16;
  document.getElementById('stage').style.setProperty('--wave',wave+'deg');
  slides.forEach((s,i)=>{ s.style.opacity=i===idx?Math.min(1,local*7):0; });
  const active=slides[idx];
  active.querySelectorAll('.bullet').forEach((b,i)=>{ b.style.opacity=Math.max(0,Math.min(1,(local-0.15-i*0.1)*7)); });
  document.getElementById('bar').style.width=(f/total*100)+'%';
};
window.setFrame(0);
</script></body></html>`;

fs.writeFileSync(path.join(root, 'videos', 'composition.html'), html);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`file:///${path.join(root, 'videos', 'composition.html').replace(/\\/g, '/')}`);
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 600; i++) {
    await page.evaluate((frame) => window.setFrame(frame), i);
    await page.screenshot({ path: path.join(framesDir, `frame${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();

  const result = spawnSync(ffmpeg, [
    '-y', '-framerate', '10', '-i', path.join(framesDir, 'frame%04d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', output,
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.slice(-1200));
  console.log('Vídeo gerado:', output);
})().catch((error) => { console.error(error.message); process.exit(1); });
