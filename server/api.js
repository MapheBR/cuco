'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const auth = require('./auth');
const { sendJson, fail, readJson, asText, isDate, isTime, monthRange, currentMonth } = require('./utils');

const STATUSES = new Set(['planejado', 'confirmado', 'concluido', 'falta', 'troca']);
const COLORS = new Set(['#1E8A4C', '#2E9E86', '#F2A93B', '#4C7DD6', '#9B6BD6', '#E5694F']);
const UPLOAD_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const UPLOAD_SIGNATURES = {
  'image/png': (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/gif': (buffer) => buffer.subarray(0, 4).toString('ascii') === 'GIF8',
  'image/webp': (buffer) => buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
};
const loginAttempts = new Map();

function validPhoto(value) {
  if (value === '' || value === null || value === undefined) return '';
  const text = asText(value, 300);
  if (!/^\/uploads\/[a-zA-Z0-9_.-]+\.(png|jpg|webp|gif)$/.test(text)) throw fail(400, 'Foto inválida');
  return text;
}

function listMembers() {
  return db.prepare('SELECT id, name, role, email, color, active, photo, created_at FROM members ORDER BY active DESC, name ASC').all();
}

function validateMember(body, partial = false) {
  const data = {};
  if (!partial || body.name !== undefined) {
    data.name = asText(body.name, 80);
    if (data.name.length < 2) throw fail(400, 'Informe o nome (mínimo 2 caracteres)');
  }
  if (!partial || body.role !== undefined) data.role = asText(body.role, 80);
  if (!partial || body.email !== undefined) data.email = asText(body.email, 120);
  if (!partial || body.color !== undefined) data.color = COLORS.has(body.color) ? body.color : '#1E8A4C';
  if (body.active !== undefined) data.active = body.active ? 1 : 0;
  if (body.photo !== undefined) data.photo = validPhoto(body.photo);
  return data;
}

function validateUser(body, partial = false) {
  const data = {};
  if (!partial || body.name !== undefined) {
    data.name = asText(body.name, 80);
    if (data.name.length < 2) throw fail(400, 'Informe o nome (mínimo 2 caracteres)');
  }
  if (!partial || body.login !== undefined) {
    data.login = asText(body.login, 40).toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(data.login)) throw fail(400, 'Login inválido (3 a 40 caracteres: letras, números, . _ -)');
    const exists = db.prepare('SELECT id FROM users WHERE login = ?').get(data.login);
    if (exists && (!partial || exists.id !== body.id)) throw fail(400, 'Este login já está em uso');
  }
  if (!partial || body.password !== undefined) {
    const password = String(body.password || '');
    if (partial && !password) {
      // mantém a senha atual
    } else {
      if (password.length < 6) throw fail(400, 'A senha precisa ter ao menos 6 caracteres');
      data.password_hash = auth.hashPassword(password);
    }
  }
  if (!partial || body.role !== undefined) data.role = body.role === 'admin' ? 'admin' : 'user';
  if (body.active !== undefined) data.active = body.active ? 1 : 0;
  if (body.photo !== undefined) data.photo = validPhoto(body.photo);
  if (body.member_id !== undefined) {
    const memberId = Number(body.member_id) || null;
    if (memberId && !db.prepare('SELECT 1 FROM members WHERE id = ?').get(memberId)) throw fail(400, 'Integrante vinculado não encontrado');
    data.member_id = memberId;
  }
  return data;
}

function validateShift(body, partial = false) {
  const data = {};
  if (!partial || body.member_id !== undefined) {
    data.member_id = Number(body.member_id);
    if (!Number.isInteger(data.member_id)) throw fail(400, 'Selecione um integrante');
    if (!db.prepare('SELECT 1 FROM members WHERE id = ?').get(data.member_id)) throw fail(400, 'Integrante não encontrado');
  }
  if (!partial || body.date !== undefined) {
    if (!isDate(body.date)) throw fail(400, 'Data inválida');
    data.date = body.date;
  }
  if (!partial || body.start_time !== undefined) {
    if (!isTime(body.start_time)) throw fail(400, 'Horário de início inválido');
    data.start_time = body.start_time;
  }
  if (!partial || body.end_time !== undefined) {
    if (!isTime(body.end_time)) throw fail(400, 'Horário de término inválido');
    data.end_time = body.end_time;
  }
  if (data.start_time && data.end_time && data.start_time === data.end_time) throw fail(400, 'Início e término não podem ser iguais');
  if (!partial || body.title !== undefined) data.title = asText(body.title, 80) || 'Escala';
  if (!partial || body.status !== undefined) data.status = STATUSES.has(body.status) ? body.status : 'planejado';
  if (!partial || body.notes !== undefined) data.notes = asText(body.notes, 500);
  return data;
}

function buildUpdate(data) {
  const keys = Object.keys(data);
  if (!keys.length) throw fail(400, 'Nada para atualizar');
  return { sql: keys.map((key) => `${key} = ?`).join(', '), values: keys.map((key) => data[key]) };
}

function hoursOf(start, end) {
  const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  let minutes = toMinutes(end) - toMinutes(start);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

function getSummary(month) {
  const range = monthRange(month) || monthRange(currentMonth());
  const rows = db.prepare(`
    SELECT s.*, m.name AS member_name, m.color AS member_color, m.photo AS member_photo
    FROM shifts s JOIN members m ON m.id = s.member_id
    WHERE s.date BETWEEN ? AND ? ORDER BY s.date ASC, s.start_time ASC
  `).all(range.from, range.to);

  const byDay = {};
  const byMember = {};
  let hours = 0;
  for (const shift of rows) {
    (byDay[shift.date] ||= []).push(shift);
    byMember[shift.member_name] = (byMember[shift.member_name] || 0) + 1;
    hours += hoursOf(shift.start_time, shift.end_time);
  }

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const upcoming = db.prepare(`
    SELECT s.*, m.name AS member_name, m.color AS member_color, m.photo AS member_photo
    FROM shifts s JOIN members m ON m.id = s.member_id
    WHERE s.date >= ? AND s.status IN ('planejado','confirmado')
    ORDER BY s.date ASC, s.start_time ASC LIMIT 5
  `).all(todayISO);
  const attention = db.prepare(`
    SELECT s.*, m.name AS member_name, m.photo AS member_photo
    FROM shifts s JOIN members m ON m.id = s.member_id
    WHERE s.status IN ('falta','troca') OR (s.date < ? AND s.status = 'planejado')
    ORDER BY s.date DESC LIMIT 5
  `).all(todayISO);

  const statusCounts = Object.fromEntries(['planejado', 'confirmado', 'concluido', 'falta', 'troca']
    .map((status) => [status, rows.filter((item) => item.status === status).length]));
  const weekdayTrend = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => ({ day, count: 0 }));
  for (const shift of rows) {
    const weekday = new Date(`${shift.date}T12:00:00`).getDay();
    weekdayTrend[(weekday + 6) % 7].count += 1;
  }
  const hoursByMember = {};
  for (const shift of rows) {
    hoursByMember[shift.member_name] = (hoursByMember[shift.member_name] || 0) + hoursOf(shift.start_time, shift.end_time);
  }

  return {
    month,
    stats: {
      shifts: rows.length,
      hours: Math.round(hours),
      confirmed: statusCounts.confirmado,
      completed: statusCounts.concluido,
      today: (byDay[todayISO] || []).length,
      members: db.prepare('SELECT COUNT(*) AS total FROM members WHERE active = 1').get().total,
      completion: rows.length ? Math.round(statusCounts.concluido / rows.length * 100) : 0,
    },
    statusCounts,
    weekdayTrend,
    byDay,
    byMember: Object.entries(byMember).map(([name, count]) => ({ name, count, hours: Math.round(hoursByMember[name] || 0) }))
      .sort((a, b) => b.count - a.count),
    upcoming,
    attention,
  };
}

function getCompliance(month) {
  const range = monthRange(month) || monthRange(currentMonth());
  const [year, monthNumber] = range.from.split('-').map(Number);
  const weeklyLimit = (year > 2027 || (year === 2027 && monthNumber >= 12)) ? 40
    : (year > 2026 || (year === 2026 && monthNumber >= 12)) ? 42 : 44;
  const issues = [];
  const members = db.prepare('SELECT id, name FROM members ORDER BY name').all();

  for (const member of members) {
    const rows = db.prepare(`
      SELECT date, start_time, end_time, title FROM shifts
      WHERE member_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, start_time ASC
    `).all(member.id, range.from, range.to);
    const weekly = new Map();
    let run = [];
    let maxRun = 0;
    let previous = null;

    for (const shift of rows) {
      const day = new Date(`${shift.date}T12:00:00`);
      const hours = hoursOf(shift.start_time, shift.end_time);
      const monday = new Date(day);
      monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      weekly.set(weekKey, (weekly.get(weekKey) || 0) + hours);

      if (hours > 10) issues.push({
        rule: 'horas-extras', severity: 'warning', member: member.name, date: shift.date,
        message: `Jornada de ${Math.round(hours)}h em ${shift.title}; limite diário é 8h + 2h extras`,
      });
      if (hours > 6) issues.push({
        rule: 'intervalo', severity: 'info', member: member.name, date: shift.date,
        message: 'Jornada acima de 6h: registrar intervalo mínimo de 1h (CLT art. 71)',
      });
      if (previous) {
        const endsAt = new Date(`${previous.date}T${previous.end_time}:00`);
        const startsAt = new Date(`${shift.date}T${shift.start_time}:00`);
        const gap = (startsAt - endsAt) / 3600000;
        if (gap > 0 && gap < 11) issues.push({
          rule: 'interjornada', severity: 'critical', member: member.name, date: shift.date,
          message: `Apenas ${gap.toFixed(1)}h entre turnos; o mínimo é 11h`,
        });
      }
      const previousDay = run.length ? new Date(`${run[run.length - 1]}T12:00:00`) : null;
      if (!previousDay || day - previousDay === 86400000) run.push(shift.date);
      else run = [shift.date];
      maxRun = Math.max(maxRun, run.length);
      previous = shift;
    }

    if (maxRun >= 6) issues.push({
      rule: 'descanso-semanal', severity: 'critical', member: member.name, date: range.from,
      message: `${maxRun} dias consecutivos escalados; a regra geral prevê 2 dias de repouso semanal`,
    });
    for (const [week, hours] of weekly) {
      if (hours > weeklyLimit) issues.push({
        rule: 'jornada-semanal', severity: 'critical', member: member.name, date: week,
        message: `${Math.round(hours)}h na semana iniciada em ${week.slice(8, 10)}/${week.slice(5, 7)}; limite de ${weeklyLimit}h`,
      });
    }
  }

  const counts = {
    critical: issues.filter((issue) => issue.severity === 'critical').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length,
  };
  return { month: range.from.slice(0, 7), weeklyLimit, total: issues.length, counts, issues: issues.slice(0, 400) };
}

function saveUpload(body) {
  const raw = String(body.data || '');
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(raw);
  if (!match || !UPLOAD_TYPES[match[1]]) throw fail(400, 'Formato de imagem não aceito (PNG, JPG, WebP ou GIF)');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw fail(400, 'A imagem deve ter até 2 MB');
  if (!UPLOAD_SIGNATURES[match[1]](buffer)) throw fail(400, 'O conteúdo do arquivo não é uma imagem válida');
  const directory = path.join(__dirname, '..', 'public', 'uploads');
  fs.mkdirSync(directory, { recursive: true });
  const filename = `${crypto.randomUUID()}.${UPLOAD_TYPES[match[1]]}`;
  fs.writeFileSync(path.join(directory, filename), buffer);
  return `/uploads/${filename}`;
}

function logActivity(req, action, detail = '') {
  const user = auth.currentUser(req);
  if (!user) return;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().slice(0, 60);
  const agent = asText(req.headers['user-agent'], 160);
  db.prepare('INSERT INTO activity_log (user_id, user_name, action, detail, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, user.name, action, asText(detail, 300), ip, agent);
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function handleApi(req, res, url) {
  const method = req.method;
  const route = url.pathname;
  const params = url.searchParams;

  if (method === 'GET' && route === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'cuco',
      version: '1.0.0',
      uptime: Math.round(process.uptime()),
      users: db.prepare('SELECT COUNT(*) AS total FROM users').get().total,
      shifts: db.prepare('SELECT COUNT(*) AS total FROM shifts').get().total,
      time: new Date().toISOString(),
    });
  }

  // --- autenticação ---
  if (route === '/api/login' && method === 'POST') {
    const body = await readJson(req);
    const login = asText(body.login, 40).toLowerCase();
    const key = `${req.socket.remoteAddress || 'unknown'}:${login}`;
    const attempt = loginAttempts.get(key);
    if (attempt && attempt.count >= 5 && Date.now() - attempt.started < 15 * 60 * 1000) {
      throw fail(429, 'Muitas tentativas. Aguarde alguns minutos.');
    }
    const user = db.prepare('SELECT * FROM users WHERE login = ? AND active = 1').get(login);
    if (!user || !auth.verifyPassword(body.password, user.password_hash)) {
      const current = attempt && Date.now() - attempt.started < 15 * 60 * 1000 ? attempt : { count: 0, started: Date.now() };
      current.count += 1;
      loginAttempts.set(key, current);
      throw fail(401, 'Usuário ou senha incorretos');
    }
    loginAttempts.delete(key);
    const csrf = auth.createCsrf(user.id);
    db.prepare('INSERT INTO activity_log (user_id, user_name, action, detail, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.id, user.name, 'login', `Login: ${login}`,
        String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().slice(0, 60),
        asText(req.headers['user-agent'], 160));
    return sendJson(res, 200,
      { data: { ...auth.publicUser(user), csrf } },
      { 'Set-Cookie': [auth.sessionCookie(user, body.remember !== false), auth.csrfCookie(csrf)] });
  }
  if (route === '/api/logout' && method === 'POST') {
    logActivity(req, 'logout', 'Encerrando sessão');
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie() });
  }
  if (route === '/api/me' && method === 'GET') {
    return sendJson(res, 200, { data: auth.publicUser(auth.requireUser(req)) });
  }

  const user = auth.requireUser(req);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const cookieToken = String(req.headers.cookie || '').split(';')
      .map((part) => part.trim()).find((part) => part.startsWith('cuco_csrf='))?.slice(10);
    if (!auth.verifyCsrf(req.headers['x-csrf-token'] || cookieToken, user.id)) {
      throw fail(403, 'Token de segurança inválido');
    }
  }
  const employeeAllowed = (route === '/api/upload' && method === 'POST')
    || (route === '/api/me/profile' && method === 'PUT')
    || (route === '/api/summary' && method === 'GET')
    || (route === '/api/settings' && method === 'GET')
    || (route === '/api/my-shifts' && method === 'GET')
    || (/^\/api\/my-shifts\/\d+\/confirm$/.test(route) && method === 'PUT');
  if (user.role !== 'admin' && !employeeAllowed) throw fail(403, 'Área restrita a administradores');

  if (route === '/api/upload' && method === 'POST') {
    return sendJson(res, 201, { data: { url: saveUpload(await readJson(req)) } });
  }

  // --- perfil do próprio usuário ---
  if (route === '/api/me/profile' && method === 'PUT') {
    const body = await readJson(req);
    const data = {};
    if (body.name !== undefined) {
      const name = asText(body.name, 80);
      if (name.length < 2) throw fail(400, 'Informe o nome (mínimo 2 caracteres)');
      data.name = name;
    }
    if (body.photo !== undefined) data.photo = validPhoto(body.photo);
    if (body.password) {
      const password = String(body.password);
      if (password.length < 6) throw fail(400, 'A senha precisa ter ao menos 6 caracteres');
      data.password_hash = auth.hashPassword(password);
    }
    if (Object.keys(data).length) {
      const update = buildUpdate(data);
      db.prepare(`UPDATE users SET ${update.sql} WHERE id = ?`).run(...update.values, user.id);
    }
    logActivity(req, 'profile', 'Atualização do próprio perfil');
    return sendJson(res, 200, { data: auth.publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
  }

  // --- área do funcionário ---
  if (route === '/api/my-shifts' && method === 'GET') {
    if (!user.member_id) return sendJson(res, 200, { data: { shifts: [], stats: { total: 0, hours: 0, confirmed: 0, next: null } } });
    const rows = db.prepare(`
      SELECT s.*, m.name AS member_name, m.color AS member_color, m.photo AS member_photo
      FROM shifts s JOIN members m ON m.id = s.member_id
      WHERE s.member_id = ? AND s.date >= ? ORDER BY s.date ASC, s.start_time ASC LIMIT 30
    `).all(user.member_id, todayISO());
    const hours = rows.reduce((sum, item) => sum + hoursOf(item.start_time, item.end_time), 0);
    return sendJson(res, 200, { data: {
      shifts: rows,
      stats: { total: rows.length, hours: Math.round(hours), confirmed: rows.filter((item) => item.status === 'confirmado').length, next: rows[0] || null },
    } });
  }
  const confirmMatch = /^\/api\/my-shifts\/(\d+)\/confirm$/.exec(route);
  if (confirmMatch && method === 'PUT') {
    const id = Number(confirmMatch[1]);
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id);
    if (!shift || shift.member_id !== user.member_id) throw fail(404, 'Escala não encontrada');
    db.prepare("UPDATE shifts SET status = 'confirmado' WHERE id = ?").run(id);
    logActivity(req, 'confirm', `Escala #${id} confirmada`);
    return sendJson(res, 200, { data: db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) });
  }

  // --- auditoria (admin) ---
  if (route === '/api/audit' && method === 'GET') {
    const search = asText(params.get('q'), 80);
    const where = search ? 'WHERE user_name LIKE ? OR action LIKE ? OR detail LIKE ?' : '';
    const values = search ? Array(3).fill(`%${search}%`) : [];
    const limit = Math.min(500, Math.max(1, Number(params.get('limit')) || 100));
    const rows = db.prepare(`SELECT * FROM activity_log ${where} ORDER BY id DESC LIMIT ?`).all(...values, limit);
    return sendJson(res, 200, { data: rows });
  }

  // --- usuários ---
  if (route === '/api/users' && method === 'GET') {
    auth.requireAdmin(req);
    const users = db.prepare('SELECT id, name, login, role, active, photo, member_id, created_at FROM users ORDER BY name').all();
    return sendJson(res, 200, { data: users });
  }
  if (route === '/api/users' && method === 'POST') {
    auth.requireAdmin(req);
    const data = validateUser(await readJson(req));
    const result = db.prepare('INSERT INTO users (name, login, password_hash, role, active, photo, member_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(data.name, data.login, data.password_hash, data.role, data.active ?? 1, data.photo ?? '', data.member_id ?? null);
    const user = db.prepare('SELECT id, name, login, role, active, photo, member_id FROM users WHERE id = ?').get(result.lastInsertRowid);
    logActivity(req, 'user.create', data.login);
    return sendJson(res, 201, { data: user });
  }
  let match = /^\/api\/users\/(\d+)$/.exec(route);
  if (match && method === 'PUT') {
    auth.requireAdmin(req);
    const id = Number(match[1]);
    if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)) throw fail(404, 'Usuário não encontrado');
    const body = await readJson(req);
    const data = validateUser({ ...body, id }, true);
    const update = buildUpdate(data);
    db.prepare(`UPDATE users SET ${update.sql} WHERE id = ?`).run(...update.values, id);
    const user = db.prepare('SELECT id, name, login, role, active, photo, member_id FROM users WHERE id = ?').get(id);
    logActivity(req, 'user.update', `Usuário #${id}`);
    return sendJson(res, 200, { data: user });
  }
  if (match && method === 'DELETE') {
    auth.requireAdmin(req);
    const id = Number(match[1]);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) throw fail(404, 'Usuário não encontrado');
    if (user.role === 'admin' && db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1").get().total <= 1) {
      throw fail(400, 'Não é possível excluir o último administrador');
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logActivity(req, 'user.delete', user.login);
    return sendJson(res, 200, { ok: true });
  }

  // --- integrantes ---
  if (route === '/api/members' && method === 'GET') return sendJson(res, 200, { data: listMembers() });
  if (route === '/api/members' && method === 'POST') {
    const data = validateMember(await readJson(req));
    const result = db.prepare('INSERT INTO members (name, role, email, color, active, photo) VALUES (?, ?, ?, ?, ?, ?)')
      .run(data.name, data.role, data.email, data.color, data.active ?? 1, data.photo ?? '');
    logActivity(req, 'member.create', data.name);
    return sendJson(res, 201, { data: db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid) });
  }
  match = /^\/api\/members\/(\d+)$/.exec(route);
  if (match && method === 'PUT') {
    const id = Number(match[1]);
    if (!db.prepare('SELECT 1 FROM members WHERE id = ?').get(id)) throw fail(404, 'Integrante não encontrado');
    const update = buildUpdate(validateMember(await readJson(req), true));
    db.prepare(`UPDATE members SET ${update.sql} WHERE id = ?`).run(...update.values, id);
    logActivity(req, 'member.update', `Integrante #${id}`);
    return sendJson(res, 200, { data: db.prepare('SELECT * FROM members WHERE id = ?').get(id) });
  }
  if (match && method === 'DELETE') {
    const result = db.prepare('DELETE FROM members WHERE id = ?').run(Number(match[1]));
    if (!result.changes) throw fail(404, 'Integrante não encontrado');
    logActivity(req, 'member.delete', `Integrante #${match[1]}`);
    return sendJson(res, 200, { ok: true });
  }

  // --- escalas ---
  if (route === '/api/shifts' && method === 'GET') {
    const filters = [];
    const values = [];
    if (params.get('from')) { filters.push('s.date >= ?'); values.push(params.get('from')); }
    if (params.get('to')) { filters.push('s.date <= ?'); values.push(params.get('to')); }
    if (params.get('member')) { filters.push('s.member_id = ?'); values.push(Number(params.get('member'))); }
    if (params.get('status')) { filters.push('s.status = ?'); values.push(params.get('status')); }
    const search = asText(params.get('q'), 80);
    if (search) {
      filters.push('(s.title LIKE ? OR s.notes LIKE ? OR m.name LIKE ?)');
      values.push(...Array(3).fill(`%${search}%`));
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const limit = Math.min(2000, Math.max(1, Number(params.get('limit')) || 500));
    const rows = db.prepare(`
      SELECT s.*, m.name AS member_name, m.color AS member_color, m.photo AS member_photo
      FROM shifts s JOIN members m ON m.id = s.member_id
      ${where} ORDER BY s.date ASC, s.start_time ASC LIMIT ?
    `).all(...values, limit);
    return sendJson(res, 200, { data: rows });
  }
  if (route === '/api/shifts' && method === 'POST') {
    const data = validateShift(await readJson(req));
    const result = db.prepare(`
      INSERT INTO shifts (member_id, date, start_time, end_time, title, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.member_id, data.date, data.start_time, data.end_time, data.title, data.status, data.notes);
    logActivity(req, 'shift.create', `${data.date} · ${data.title}`);
    return sendJson(res, 201, { data: db.prepare('SELECT * FROM shifts WHERE id = ?').get(result.lastInsertRowid) });
  }
  match = /^\/api\/shifts\/(\d+)$/.exec(route);
  if (match && method === 'PUT') {
    const id = Number(match[1]);
    if (!db.prepare('SELECT 1 FROM shifts WHERE id = ?').get(id)) throw fail(404, 'Escala não encontrada');
    const update = buildUpdate(validateShift(await readJson(req), true));
    db.prepare(`UPDATE shifts SET ${update.sql} WHERE id = ?`).run(...update.values, id);
    logActivity(req, 'shift.update', `Escala #${id}`);
    return sendJson(res, 200, { data: db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) });
  }
  if (match && method === 'DELETE') {
    const result = db.prepare('DELETE FROM shifts WHERE id = ?').run(Number(match[1]));
    if (!result.changes) throw fail(404, 'Escala não encontrada');
    logActivity(req, 'shift.delete', `Escala #${match[1]}`);
    return sendJson(res, 200, { ok: true });
  }

  if (route === '/api/summary' && method === 'GET') {
    return sendJson(res, 200, { data: getSummary(params.get('month') || currentMonth()) });
  }
  if (route === '/api/compliance' && method === 'GET') {
    return sendJson(res, 200, { data: getCompliance(params.get('month') || currentMonth()) });
  }

  if (route === '/api/settings' && method === 'GET') {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    return sendJson(res, 200, { data: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
  }
  if (route === '/api/settings' && method === 'PUT') {
    auth.requireAdmin(req);
    const body = await readJson(req);
    const allowed = ['company_name', 'contact_email', 'default_start', 'default_end', 'alert_days'];
    const update = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    db.exec('BEGIN');
    try {
      for (const key of allowed) {
        if (body[key] === undefined) continue;
        const value = asText(body[key], 120);
        if (key.startsWith('default_') && !isTime(value)) throw fail(400, `Horário inválido: ${key}`);
        if (key === 'alert_days' && !/^\d{1,3}$/.test(value)) throw fail(400, 'Dias de aviso inválido');
        update.run(key, value);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    const rows = db.prepare('SELECT key, value FROM settings').all();
    logActivity(req, 'settings.update', 'Configurações gerais');
    return sendJson(res, 200, { data: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
  }

  throw fail(404, 'Rota não encontrada');
}

module.exports = { handleApi };
