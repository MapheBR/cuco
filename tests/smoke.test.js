'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 4317;
const BASE = `http://127.0.0.1:${PORT}`;
const dbPath = path.join(os.tmpdir(), `cuco-test-${process.pid}.db`);
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch { /* servidor ainda subindo */ }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Servidor de teste não iniciou');
}

async function login(loginName, password) {
  const response = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  const payload = await response.json();
  const cookies = (response.headers.getSetCookie() || []).map((item) => item.split(';')[0]).join('; ');
  return { response, payload, cookies };
}

before(async () => {
  server = spawn(process.execPath, ['--no-warnings=ExperimentalWarning', 'server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbPath },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(() => {
  if (server) server.kill('SIGTERM');
  try { fs.unlinkSync(dbPath); } catch { /* já removido */ }
});

test('smoke Cuco', async (t) => {
  await t.test('health e autenticação básica', async () => {
    const health = await (await fetch(`${BASE}/api/health`)).json();
    assert.equal(health.ok, true);
    assert.equal((await fetch(`${BASE}/api/shifts`)).status, 401);
    const bad = await login('admin', 'senha-errada');
    assert.equal(bad.response.status, 401);
    const admin = await login('admin', 'admin123');
    assert.equal(admin.response.status, 200);
    assert.ok(admin.payload.data.csrf);
    assert.match(admin.cookies, /cuco_session=/);
    assert.match(admin.cookies, /cuco_csrf=/);
  });

  await t.test('RBAC: funcionário não acessa rotas de admin', async () => {
    const employee = await login('funcionario', 'funcionario123');
    assert.equal(employee.response.status, 200);
    const headers = { Cookie: employee.cookies };
    assert.equal((await fetch(`${BASE}/api/shifts`, { headers })).status, 403);
    assert.equal((await fetch(`${BASE}/api/settings`, { headers })).status, 200);
    assert.equal((await fetch(`${BASE}/api/my-shifts`, { headers })).status, 200);
  });

  await t.test('CSRF e CRUD de integrante', async () => {
    const admin = await login('admin', 'admin123');
    const sessionOnly = admin.cookies.split('; ').find((part) => part.startsWith('cuco_session='));
    const baseHeaders = { Cookie: admin.cookies, 'Content-Type': 'application/json' };
    const body = JSON.stringify({ name: 'Integrante Smoke', role: 'QA' });
    assert.equal((await fetch(`${BASE}/api/members`, { method: 'POST', headers: { ...baseHeaders, Cookie: sessionOnly }, body })).status, 403);
    const secureHeaders = { ...baseHeaders, 'X-CSRF-Token': admin.payload.data.csrf };
    const created = await (await fetch(`${BASE}/api/members`, { method: 'POST', headers: secureHeaders, body })).json();
    assert.equal(created.data.name, 'Integrante Smoke');
    const updated = await fetch(`${BASE}/api/members/${created.data.id}`, {
      method: 'PUT', headers: secureHeaders, body: JSON.stringify({ role: 'QA Líder' }),
    });
    assert.equal(updated.status, 200);
    const removed = await fetch(`${BASE}/api/members/${created.data.id}`, { method: 'DELETE', headers: secureHeaders });
    assert.equal(removed.status, 200);
  });

  await t.test('upload rejeita conteúdo que não é imagem', async () => {
    const admin = await login('admin', 'admin123');
    const response = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: {
        Cookie: admin.cookies, 'Content-Type': 'application/json',
        'X-CSRF-Token': admin.payload.data.csrf,
      },
      body: JSON.stringify({ data: 'data:image/png;base64,SGVsbG8gd29ybGQ=' }),
    });
    assert.equal(response.status, 400);
  });

  await t.test('sessão é revogada no logout e caminho inválido não derruba o servidor', async () => {
    const admin = await login('admin', 'admin123');
    assert.equal((await fetch(`${BASE}/api/me`, { headers: { Cookie: admin.cookies } })).status, 200);
    await fetch(`${BASE}/api/logout`, {
      method: 'POST', headers: { Cookie: admin.cookies, 'X-CSRF-Token': admin.payload.data.csrf },
    });
    assert.equal((await fetch(`${BASE}/api/me`, { headers: { Cookie: admin.cookies } })).status, 401);
    assert.equal((await fetch(`${BASE}/%ZZ`)).status, 400);
    assert.equal((await fetch(`${BASE}/api/health`)).status, 200);
  });

  await t.test('direitos do titular: exportação e eliminação (LGPD art. 18)', async () => {
    const admin = await login('admin', 'admin123');
    const headers = {
      Cookie: admin.cookies,
      'Content-Type': 'application/json',
      'X-CSRF-Token': admin.payload.data.csrf,
    };
    const created = await (await fetch(`${BASE}/api/users`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: 'Titular Teste', login: 'lgpd_test', password: 'senha123', role: 'user' }),
    })).json();
    const owner = await login('lgpd_test', 'senha123');
    assert.equal(owner.response.status, 200);
    const data = await (await fetch(`${BASE}/api/me/data`, { headers: { Cookie: owner.cookies } })).json();
    assert.equal(data.data.user.login, 'lgpd_test');
    assert.ok(data.data.policy.base.includes('LGPD'));
    const erased = await fetch(`${BASE}/api/me/data`, {
      method: 'DELETE',
      headers: { Cookie: owner.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': owner.payload.data.csrf },
    });
    assert.equal(erased.status, 200);
    assert.equal((await login('lgpd_test', 'senha123')).response.status, 401);
    await fetch(`${BASE}/api/users/${created.data.id}`, { method: 'DELETE', headers });
  });

  await t.test('validador de escala responde com limites', async () => {
    const admin = await login('admin', 'admin123');
    const response = await fetch(`${BASE}/api/compliance`, { headers: { Cookie: admin.cookies } });
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.ok([40, 42, 44].includes(data.weeklyLimit));
    assert.ok(Array.isArray(data.issues));
  });
});
