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
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbPath, SEED_DEMO: '1' },
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
    assert.equal((await fetch(`${BASE}/api/team-options`, { headers })).status, 200);
    for (const route of ['/api/summary', '/api/user-options', '/api/departments', '/api/teams', '/api/positions']) {
      assert.equal((await fetch(`${BASE}${route}`, { headers })).status, 403, `funcionário não deve acessar ${route}`);
    }
  });

  await t.test('módulos removidos continuam inexistentes', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies };
    for (const route of ['/api/tasks', '/api/tickets', '/api/zones', '/api/zone-flows', '/api/locations']) {
      assert.equal((await fetch(`${BASE}${route}`, { headers })).status, 404, `${route} deve responder 404`);
    }
    assert.equal((await fetch(`${BASE}/api/health`)).status, 200);
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

  await t.test('regras configuráveis, selo com hash e dossiê PDF', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf };
    const rules = await (await fetch(`${BASE}/api/compliance/rules`, {
      method: 'PUT', headers, body: JSON.stringify({ minRest: 10, source: 'Acordo coletivo teste' }),
    })).json();
    assert.equal(rules.data.minRest, 10);
    const published = await (await fetch(`${BASE}/api/compliance/publish`, {
      method: 'POST', headers, body: JSON.stringify({}),
    })).json();
    assert.equal(published.data.hash.length, 64);
    const latest = await (await fetch(`${BASE}/api/compliance/published`, { headers: { Cookie: admin.cookies } })).json();
    assert.equal(latest.data.hash, published.data.hash);
    const dossier = await fetch(`${BASE}/api/compliance/dossier`, { headers: { Cookie: admin.cookies } });
    assert.equal(dossier.status, 200);
    assert.match(dossier.headers.get('content-type'), /application\/pdf/);
    const buffer = Buffer.from(await dossier.arrayBuffer());
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
    await fetch(`${BASE}/api/compliance/rules`, {
      method: 'PUT', headers, body: JSON.stringify({ minRest: 11, source: 'Regra geral CLT / EC 141/2026' }),
    });
  });

  await t.test('troca de turno com aprovação e notificação', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf };
    const created = await (await fetch(`${BASE}/api/shifts`, {
      method: 'POST', headers,
      body: JSON.stringify({
        member_id: 1, date: '2026-12-02', start_time: '08:00', end_time: '16:00',
        title: 'Turno para troca', override: true,
      }),
    })).json();
    const employee = await login('funcionario', 'funcionario123');
    const swap = await (await fetch(`${BASE}/api/shifts/${created.data.id}/swap`, {
      method: 'POST',
      headers: { Cookie: employee.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': employee.payload.data.csrf },
      body: JSON.stringify({ to_member_id: 2 }),
    })).json();
    const approved = await (await fetch(`${BASE}/api/swaps/${swap.data.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ status: 'aprovado' }),
    })).json();
    assert.equal(approved.data.status, 'aprovado');
    const shift = await (await fetch(`${BASE}/api/shifts?from=2026-12-02&to=2026-12-02`, { headers: { Cookie: admin.cookies } })).json();
    assert.ok(shift.data.some((item) => item.id === created.data.id && item.member_id === 2));
    const notes = await (await fetch(`${BASE}/api/notifications`, { headers: { Cookie: employee.cookies } })).json();
    assert.ok(notes.data.rows.length > 0);
  });

  await t.test('convite, vínculo e organização', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf };
    const invite = await (await fetch(`${BASE}/api/invitations`, {
      method: 'POST', headers, body: JSON.stringify({ role: 'user' }),
    })).json();
    assert.match(invite.data.code, /^[A-F0-9]{10}$/);

    const registered = await fetch(`${BASE}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Novo Usuario', login: 'novo_user', password: 'senha123', confirm: 'senha123', invite_code: invite.data.code }),
    });
    assert.equal(registered.status, 201);
    assert.equal((await login('novo_user', 'senha123')).response.status, 401);

    const invites = await (await fetch(`${BASE}/api/invitations`, { headers: { Cookie: admin.cookies } })).json();
    const pending = invites.data.find((item) => item.code === invite.data.code);
    const approved = await fetch(`${BASE}/api/invitations/${pending.id}/approve`, { method: 'PUT', headers, body: '{}' });
    assert.equal(approved.status, 200);
    const employee = await login('novo_user', 'senha123');
    assert.equal(employee.response.status, 200);

    const department = await (await fetch(`${BASE}/api/departments`, {
      method: 'POST', headers, body: JSON.stringify({ name: 'Operações', description: 'Área teste' }),
    })).json();
    const team = await (await fetch(`${BASE}/api/teams`, {
      method: 'POST', headers, body: JSON.stringify({ name: 'Turno A', department_id: department.data.id }),
    })).json();
    const position = await (await fetch(`${BASE}/api/positions`, {
      method: 'POST', headers, body: JSON.stringify({ name: 'Operador', level: 1 }),
    })).json();
    assert.ok(department.data.id && team.data.id && position.data.id);
  });

  await t.test('validador de escala responde com limites', async () => {
    const admin = await login('admin', 'admin123');
    const response = await fetch(`${BASE}/api/compliance`, { headers: { Cookie: admin.cookies } });
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.ok([40, 42, 44].includes(data.weeklyLimit));
    assert.ok(Array.isArray(data.issues));
  });

  await t.test('edição de escala não acusa sobreposição consigo mesma', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf };
    const created = await (await fetch(`${BASE}/api/shifts`, {
      method: 'POST', headers,
      body: JSON.stringify({ member_id: 4, date: '2032-03-15', start_time: '08:00', end_time: '16:00', title: 'Edição QA' }),
    })).json();
    const updated = await fetch(`${BASE}/api/shifts/${created.data.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ title: 'Edição QA 2' }),
    });
    assert.equal(updated.status, 200);
    await fetch(`${BASE}/api/shifts/${created.data.id}`, { method: 'DELETE', headers });
  });

  await t.test('funcionário lista próprias trocas sem erro interno', async () => {
    const employee = await login('funcionario', 'funcionario123');
    const response = await fetch(`${BASE}/api/swaps`, { headers: { Cookie: employee.cookies } });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray((await response.json()).data));
  });

  await t.test('último administrador não pode ser rebaixado', async () => {
    const admin = await login('admin', 'admin123');
    const response = await fetch(`${BASE}/api/users/1`, {
      method: 'PUT',
      headers: { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf },
      body: JSON.stringify({ role: 'user' }),
    });
    assert.equal(response.status, 400);
  });

  await t.test('data inexistente é rejeitada', async () => {
    const admin = await login('admin', 'admin123');
    const response = await fetch(`${BASE}/api/shifts`, {
      method: 'POST',
      headers: { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf },
      body: JSON.stringify({ member_id: 4, date: '2032-02-31', start_time: '08:00', end_time: '16:00', override: true }),
    });
    assert.equal(response.status, 400);
  });

  await t.test('escala encerrada não pode ser confirmada nem trocada', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf };
    const created = await (await fetch(`${BASE}/api/shifts`, {
      method: 'POST', headers,
      body: JSON.stringify({ member_id: 1, date: '2026-10-10', start_time: '08:00', end_time: '12:00', status: 'concluido', override: true }),
    })).json();
    const employee = await login('funcionario', 'funcionario123');
    const employeeHeaders = { Cookie: employee.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': employee.payload.data.csrf };
    const confirm = await fetch(`${BASE}/api/my-shifts/${created.data.id}/confirm`, { method: 'PUT', headers: employeeHeaders, body: '{}' });
    assert.equal(confirm.status, 409);
    const swap = await fetch(`${BASE}/api/shifts/${created.data.id}/swap`, {
      method: 'POST', headers: employeeHeaders, body: JSON.stringify({ to_member_id: 2 }),
    });
    assert.equal(swap.status, 409);
    await fetch(`${BASE}/api/shifts/${created.data.id}`, { method: 'DELETE', headers });
  });

  await t.test('troca de senha revoga sessão anterior', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf };
    await fetch(`${BASE}/api/users`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: 'QA Senha', login: 'qa_senha', password: 'senha123', role: 'user' }),
    });
    const before = await login('qa_senha', 'senha123');
    const changed = await fetch(`${BASE}/api/me/profile`, {
      method: 'PUT',
      headers: { Cookie: before.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': before.payload.data.csrf },
      body: JSON.stringify({ password: 'senha456' }),
    });
    assert.equal(changed.status, 200);
    assert.equal((await fetch(`${BASE}/api/me`, { headers: { Cookie: before.cookies } })).status, 401);
    assert.equal((await login('qa_senha', 'senha456')).response.status, 200);
  });

  await t.test('integridade: FKs de membros e duplicidade retornam erro tratado', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf };
    const department = await (await fetch(`${BASE}/api/departments`, {
      method: 'POST', headers, body: JSON.stringify({ name: 'QA FK' }),
    })).json();
    const member = await (await fetch(`${BASE}/api/members`, {
      method: 'POST', headers, body: JSON.stringify({ name: 'QA FK Member', department_id: department.data.id }),
    })).json();
    assert.equal((await fetch(`${BASE}/api/departments/${department.data.id}`, { method: 'DELETE', headers })).status, 200);
    const members = await (await fetch(`${BASE}/api/members`, { headers: { Cookie: admin.cookies } })).json();
    assert.equal(members.data.find((item) => item.id === member.data.id).department_id, null);
    await fetch(`${BASE}/api/departments`, {
      method: 'POST', headers, body: JSON.stringify({ name: 'QA FK' }),
    });
    const duplicate = await fetch(`${BASE}/api/departments`, {
      method: 'POST', headers, body: JSON.stringify({ name: 'QA FK' }),
    });
    assert.equal(duplicate.status, 409);
  });

  await t.test('payload acima do limite responde 413', async () => {
    const admin = await login('admin', 'admin123');
    const response = await fetch(`${BASE}/api/members`, {
      method: 'POST',
      headers: { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf },
      body: 'x'.repeat(9 * 1024 * 1024),
    });
    assert.equal(response.status, 413);
  });
});
