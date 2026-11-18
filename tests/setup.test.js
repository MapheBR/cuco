'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 4318;
const BASE = `http://127.0.0.1:${PORT}`;
const dbPath = path.join(os.tmpdir(), `cuco-setup-${process.pid}.db`);
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch { /* aguardando */ }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Servidor de setup não iniciou');
}

before(async () => {
  server = spawn(process.execPath, ['--no-warnings=ExperimentalWarning', 'server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbPath, SEED_DEMO: '0' },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(() => {
  if (server) server.kill('SIGTERM');
  try { fs.unlinkSync(dbPath); } catch { /* já removido */ }
});

test('instalação limpa cria apenas o primeiro administrador', async () => {
  const beforeStatus = await (await fetch(`${BASE}/api/setup/status`)).json();
  assert.equal(beforeStatus.data.needsSetup, true);

  const response = await fetch(`${BASE}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin Real', login: 'adminreal', password: 'senha123', confirm: 'senha123' }),
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.data.role, 'admin');
  assert.ok(payload.data.csrf);
  const cookies = (response.headers.getSetCookie() || []).map((item) => item.split(';')[0]).join('; ');
  assert.match(cookies, /cuco_session=/);

  const afterStatus = await (await fetch(`${BASE}/api/setup/status`)).json();
  assert.equal(afterStatus.data.needsSetup, false);

  const second = await fetch(`${BASE}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Outro', login: 'outro', password: 'senha123', confirm: 'senha123' }),
  });
  assert.equal(second.status, 409);

  const login = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'adminreal', password: 'senha123' }),
  });
  assert.equal(login.status, 200);
  const members = await (await fetch(`${BASE}/api/members`, { headers: { Cookie: cookies } })).json();
  const shifts = await (await fetch(`${BASE}/api/shifts`, { headers: { Cookie: cookies } })).json();
  assert.equal(members.data.length, 0);
  assert.equal(shifts.data.length, 0);
});
