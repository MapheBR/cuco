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

  await t.test('convite, vínculo, organização, tarefas e chamados', async () => {
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

    const employeeHeaders = { Cookie: employee.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': employee.payload.data.csrf };
    const task = await (await fetch(`${BASE}/api/tasks`, {
      method: 'POST', headers,
      body: JSON.stringify({ title: 'Conferir estoque', assigned_to: (await (await fetch(`${BASE}/api/me`, { headers: { Cookie: employee.cookies } })).json()).data.id, department_id: department.data.id }),
    })).json();
    const myTasks = await (await fetch(`${BASE}/api/tasks`, { headers: { Cookie: employee.cookies } })).json();
    assert.ok(myTasks.data.some((item) => item.id === task.data.id));
    const updated = await fetch(`${BASE}/api/tasks/${task.data.id}`, {
      method: 'PUT', headers: employeeHeaders, body: JSON.stringify({ status: 'concluida' }),
    });
    assert.equal(updated.status, 200);
    const comment = await fetch(`${BASE}/api/tasks/${task.data.id}/comments`, {
      method: 'POST', headers: employeeHeaders, body: JSON.stringify({ message: 'Concluído' }),
    });
    assert.equal(comment.status, 201);

    const ticket = await (await fetch(`${BASE}/api/tickets`, {
      method: 'POST', headers: employeeHeaders,
      body: JSON.stringify({ title: 'Lâmpada queimada', department_id: department.data.id }),
    })).json();
    const ticketUpdate = await fetch(`${BASE}/api/tickets/${ticket.data.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ status: 'em_andamento' }),
    });
    assert.equal(ticketUpdate.status, 200);
    const message = await fetch(`${BASE}/api/tickets/${ticket.data.id}/messages`, {
      method: 'POST', headers: employeeHeaders, body: JSON.stringify({ message: 'Ainda aguardando' }),
    });
    assert.equal(message.status, 201);
  });

  await t.test('mapa do local e chamada a pessoa específica', async () => {
    const admin = await login('admin', 'admin123');
    const headers = { Cookie: admin.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': admin.payload.data.csrf };
    const layout = await fetch(`${BASE}/api/zones/default`, { method: 'POST', headers, body: '{}' });
    assert.equal(layout.status, 201);
    const zones = await (await fetch(`${BASE}/api/zones`, { headers: { Cookie: admin.cookies } })).json();
    assert.equal(zones.data.length, 6);
    const flow = await fetch(`${BASE}/api/zone-flows`, {
      method: 'POST', headers, body: JSON.stringify({ from_zone: zones.data[0].id, to_zone: zones.data[1].id, label: 'Vendas → Estoque' }),
    });
    assert.equal(flow.status, 201);

    const employee = await login('funcionario', 'funcionario123');
    const employeeHeaders = { Cookie: employee.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': employee.payload.data.csrf };
    const me = await (await fetch(`${BASE}/api/me`, { headers: { Cookie: employee.cookies } })).json();
    const here = await fetch(`${BASE}/api/locations/me`, {
      method: 'PUT', headers: employeeHeaders, body: JSON.stringify({ zone_id: zones.data[0].id, note: 'No salão' }),
    });
    assert.equal(here.status, 200);
    const locations = await (await fetch(`${BASE}/api/locations`, { headers: { Cookie: admin.cookies } })).json();
    assert.ok(locations.data.some((item) => item.user_id === me.data.id && item.zone_id === zones.data[0].id));

    const ticket = await (await fetch(`${BASE}/api/tickets`, {
      method: 'POST', headers: employeeHeaders,
      body: JSON.stringify({ title: 'Chamar técnico', user_ids: [me.data.id] }),
    })).json();
    const myTickets = await (await fetch(`${BASE}/api/tickets`, { headers: { Cookie: employee.cookies } })).json();
    assert.ok(myTickets.data.some((item) => item.id === ticket.data.id));
    const calls = await (await fetch(`${BASE}/api/tickets/${ticket.data.id}/calls`, { headers: { Cookie: employee.cookies } })).json();
    assert.equal(calls.data.length, 1);
    const accepted = await fetch(`${BASE}/api/tickets/${ticket.data.id}/calls/${calls.data[0].id}`, {
      method: 'PUT', headers: employeeHeaders, body: JSON.stringify({ status: 'aceito' }),
    });
    assert.equal(accepted.status, 200);
  });

  await t.test('geolocalização identifica o raio correto', async () => {
    const employee = await login('funcionario', 'funcionario123');
    const headers = { Cookie: employee.cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': employee.payload.data.csrf };
    const inside = await (await fetch(`${BASE}/api/locations/me`, {
      method: 'PUT', headers,
      body: JSON.stringify({ latitude: -23.55050, longitude: -46.63330 }),
    })).json();
    assert.equal(inside.data.zone_name, 'Vendas');
    assert.ok(inside.data.distance < 30);
    const outside = await (await fetch(`${BASE}/api/locations/me`, {
      method: 'PUT', headers,
      body: JSON.stringify({ latitude: -23.60000, longitude: -46.70000 }),
    })).json();
    assert.equal(outside.data.zone_name, null);
    assert.match(outside.data.message, /fora de todos os raios/);
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
