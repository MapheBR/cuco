'use strict';

const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'social');
fs.mkdirSync(outDir, { recursive: true });
for (const file of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, file));

const fileUrl = (p) => `file:///${p.replace(/\\/g, '/')}`;
const logo = fileUrl(path.join(root, 'public', 'assets', 'logo-escuro-compacto.png'));
const capture = (name) => fileUrl(path.join(root, 'videos', 'capture', `${name}.png`));

let svg = fs.readFileSync(path.join(root, 'public', 'assets', 'mascote_passarinho.svg'), 'utf8');
svg = svg.replace(/<path d="M347 315/g, '<path class="wave-arm" d="M347 315')
  .replace(/<path d="M355 321/g, '<path class="wave-arm" d="M355 321')
  .replace(/<path d="M391 304/g, '<path class="wave-arm" d="M391 304');

const slides = [
  {
    file: '01-capa.png',
    kind: 'cover',
    kicker: 'CONTROLE DE ESCALAS',
    title: 'Cuco',
    desc: 'Semanas de trabalho mudaram. A organização precisa acompanhar.',
  },
  {
    file: '02-contexto.png',
    kind: 'facts',
    kicker: 'CONTEXTO',
    title: 'A regra mudou',
    facts: ['42h · 16/12/2026', '40h · 16/12/2027', '2 dias de repouso'],
    note: 'EC 141/2026 — sem redução salarial',
  },
  {
    file: '03-painel.png', kind: 'app', image: 'dashboard', kicker: 'VISÃO GERAL', title: 'Painel', desc: 'Escalas, horas e avisos em um só lugar.' },
  {
    file: '04-escalas.png', kind: 'app', image: 'shifts', kicker: 'OPERAÇÃO', title: 'Escala semanal', desc: 'Montagem, filtros e troca de status em poucos cliques.' },
  {
    file: '05-conformidade.png', kind: 'app', image: 'compliance', kicker: 'CONFORMIDADE', title: 'Regras trabalhistas', desc: 'CLT e EC 141 verificadas antes de publicar.' },
  {
    file: '06-convites.png', kind: 'app', image: 'invitations', kicker: 'ACESSO', title: 'Convites', desc: 'Cadastro por código e vínculo aprovado pelo administrador.' },
  {
    file: '07-auditoria.png', kind: 'app', image: 'audit', kicker: 'EVIDÊNCIA', title: 'Auditoria', desc: 'Cada ação registrada. Código em github.com/MapheBR/cuco' },
];

const html = slides.map((s) => {
  if (s.kind === 'facts') {
    return `<section class="slide"><div class="kicker">${s.kicker}</div><h1>${s.title}</h1>
      <div class="facts">${s.facts.map((f) => `<div>${f}</div>`).join('')}</div>
      <p class="note">${s.note}</p><div class="mascot">${svg}</div></section>`;
  }
  if (s.kind === 'cover') {
    return `<section class="slide center"><div class="kicker">${s.kicker}</div><h1>${s.title}</h1>
      <p class="desc">${s.desc}</p><div class="mascot-big">${svg}</div></section>`;
  }
  return `<section class="slide"><div class="kicker">${s.kicker}</div><h2>${s.title}</h2>
    <p class="desc">${s.desc}</p>
    <div class="frame"><img src="${capture(s.image)}"></div>
    <div class="mascot">${svg}</div></section>`;
}).join('');

const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;width:1080px;height:1350px;overflow:hidden;background:#0A4A2B;font-family:'Segoe UI',sans-serif;color:#fff}
body{background:linear-gradient(160deg,#0E5B34 0%,#062A18 100%)}
.slide{position:none;padding:110px 84px;width:1080px;height:1350px;display:block}
.top{position:absolute;left:84px;top:70px;width:170px}
.top img{width:100%;display:block}
.rule{width:64px;height:4px;background:#F5B942;margin-top:18px}
.kicker{font-size:16px;letter-spacing:2px;font-weight:800;color:#F5B942;margin-top:170px}
h1{font-size:92px;margin:18px 0 0;line-height:1;letter-spacing:-3px}
h2{font-size:54px;margin:14px 0 0;line-height:1.05;letter-spacing:-1.5px}
.desc{font-size:26px;color:#D7EFDF;margin:18px 0 0;max-width:820px;line-height:1.35}
.facts{margin-top:80px;display:flex;flex-direction:column;gap:22px}
.facts div{font-size:44px;font-weight:800;border-left:4px solid #F5B942;padding-left:22px}
.note{margin-top:70px;font-size:20px;color:rgba(255,255,255,.6)}
.center{text-align:center}
.center .kicker{margin-top:150px}
.center .desc{max-width:760px;margin-left:auto;margin-right:auto}
.mascot-big{width:420px;margin:70px auto 0}
.mascot{position:absolute;left:84px;bottom:70px;width:120px;opacity:.95}
.slide svg{width:100%;height:auto;display:block;filter:drop-shadow(0 12px 18px rgba(0,0,0,.3))}
.wave-arm{transform-origin:340px 380px;transform-box:view-box;transform:rotate(-12deg)}
.frame{margin-top:54px;width:912px;border:10px solid #1B211E;border-radius:16px;overflow:hidden;box-shadow:0 24px 40px rgba(0,0,0,.35)}
.frame img{width:100%;display:block}
.footer{position:absolute;left:84px;bottom:34px;font-size:14px;color:rgba(255,255,255,.45)}
</style></head><body>
<img class="top" src="${logo}"><div class="rule"></div>
${html}
<div class="footer">cuco · controle de escalas · © 2026 Marcos Moraes</div>
</body></html>`;

fs.writeFileSync(path.join(root, 'social', 'composition.html'), doc);

function setSlide(page, index) {
  return page.evaluate((i) => {
    const nodes = [...document.querySelectorAll('.slide')];
    nodes.forEach((node, pos) => { node.style.display = pos === i ? 'block' : 'none'; });
  }, index);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
  await page.goto(fileUrl(path.join(root, 'social', 'composition.html')));
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < slides.length; i++) {
    await setSlide(page, i);
    await page.screenshot({ path: path.join(outDir, slides[i].file) });
    console.log('imagem:', slides[i].file);
  }
  await browser.close();
})().catch((error) => { console.error(error.message); process.exit(1); });
