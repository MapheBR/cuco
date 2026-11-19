'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const read = (file) => fs.readFileSync(path.join(publicDir, file), 'utf8');

test('nome do usuário é escapado no modal de perfil (XSS armazenado)', () => {
  const app = read('js/app.js');
  assert.match(app, /value="\$\{esc\(user\.name\)\}"/);
  assert.doesNotMatch(app, /value="\$\{user\.name\}"/);
  assert.match(app, /src="\$\{esc\(store\.user\.photo\)\}"/);
});

test('service worker não cacheia respostas autenticadas da API', () => {
  const sw = read('sw.js');
  assert.doesNotMatch(sw, /CACHEABLE_API/);
  assert.match(sw, /if \(url\.pathname\.startsWith\('\/api\/'\)\) return;/);
  assert.match(sw, /const CACHE = 'cuco-v\d+';/);
});

test('logout limpa os caches do aplicativo', () => {
  const app = read('js/app.js');
  assert.match(app, /async function clearAppCaches\(\)/);
  assert.match(app, /await clearAppCaches\(\)/);
});

test('modal tem rótulo acessível e devolve o foco ao gatilho', () => {
  const ui = read('js/ui.js');
  assert.match(ui, /aria-labelledby="\$\{titleId\}"/);
  assert.match(ui, /modalTrigger = document\.activeElement/);
  assert.match(ui, /document\.contains\(trigger\)/);
});

test('CSV neutraliza fórmulas de planilha', () => {
  const shifts = read('js/views/shifts.js');
  assert.match(shifts, /const csvCell =/);
  assert.match(shifts, /if \(\/\^\[=\+\\-@\\t\\r\]\/\.test\(text\)\) text = `'\$\{text\}`;/);
});

test('nome do titular é escapado na tela de privacidade', () => {
  const privacy = read('js/views/privacy.js');
  assert.match(privacy, /Titular: \$\{esc\(store\.user\?\.name \|\| ''\)\}/);
});
