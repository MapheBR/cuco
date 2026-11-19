'use strict';

const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'videos', 'capture');
fs.mkdirSync(outDir, { recursive: true });
for (const file of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, file));

const BASE = 'http://localhost:4310';
const views = [
  ['dashboard', 'Ações rápidas'],
  ['shifts', 'Tabela de escalas'],
  ['team', 'Tabela de equipe'],
  ['compliance', 'Validador de escala'],
  ['invitations', 'Gerar convite'],
  ['audit', 'Trilha de auditoria'],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => {
    const splash = document.getElementById('splash');
    return splash && splash.classList.contains('hidden');
  }, { timeout: 15000 });

  await page.evaluate(() => {
    document.getElementById('login-user').value = 'admin';
    document.getElementById('login-pass').value = 'admin123';
    document.getElementById('login-form').requestSubmit();
  });
  await page.waitForFunction(() => document.getElementById('app') && !document.getElementById('app').classList.contains('hidden'));
  await new Promise((resolve) => setTimeout(resolve, 2200));

  for (const [view, marker] of views) {
    await page.evaluate((v) => document.querySelector(`[data-view="${v}"]`).click(), view);
    await page.waitForFunction((text) => document.getElementById('view').innerText.includes(text), {}, marker);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await page.screenshot({ path: path.join(outDir, `${view}.png`) });
    console.log('capturado:', view);
  }
  await browser.close();
})().catch((error) => { console.error(error.message); process.exit(1); });
