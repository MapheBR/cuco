'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const auth = require('./auth');
const { sendJson, fail, readJson, asText, isDate, isTime, monthRange, currentMonth, SECURITY_HEADERS } = require('./utils');
const { buildPdf } = require('./pdf');

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
const ATTEMPT_WINDOW = 15 * 60 * 1000;

function clientIp(req) {
  if (process.env.TRUST_PROXY === '1') {
    return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  }
  return String(req.socket.remoteAddress || '').replace('::ffff:', '');
}

function pruneAttempts(now) {
  for (const [key, value] of loginAttempts) {
    if (now - value.started > ATTEMPT_WINDOW) loginAttempts.delete(key);
  }
  if (loginAttempts.size > 5000) loginAttempts.clear();
}

function validPhoto(value) {
  if (value === '' || value === null || value === undefined) return '';
  const text = asText(value, 300);
  if (!/^\/uploads\/[a-zA-Z0-9_.-]+\.(png|jpg|webp|gif)$/.test(text)) throw fail(400, 'Foto inválida');
  return text;
}

function listMembers() {
  return db.prepare(`
    SELECT m.*, d.name AS department_name, t.name AS team_name, p.name AS position_name
    FROM members m
    LEFT JOIN departments d ON d.id = m.department_id
    LEFT JOIN teams t ON t.id = m.team_id
    LEFT JOIN positions p ON p.id = m.position_id
    ORDER BY m.active DESC, m.name ASC
  `).all();
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
  for (const [field, table] of [['department_id', 'departments'], ['team_id', 'teams'], ['position_id', 'positions']]) {
    if (body[field] === undefined) continue;
    const value = Number(body[field]) || null;
    if (value && !db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(value)) throw fail(400, `${field} inválido`);
    data[field] = value;
  }
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

function companyName() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'company_name'").get();
  return row?.value || 'Cuco';
}

function getRules() {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'rule_%'").all();
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const number = (key, fallback) => {
    const parsed = Number(values[key]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    hoursBefore: number('rule_hours_before', 44),
    hours2026: number('rule_hours_2026', 42),
    hours2027: number('rule_hours_2027', 40),
    minRest: number('rule_min_rest', 11),
    maxWorked7: number('rule_max_worked_7', 5),
    maxDaily: number('rule_max_daily', 8),
    overtime: number('rule_overtime_daily', 2),
    breakAfter: number('rule_break_after', 6),
    source: values.rule_source || 'Regra geral CLT / EC 141/2026',
  };
}

function getCompliance(month, extraShifts = new Map(), excludeShiftId = null) {
  const range = monthRange(month) || monthRange(currentMonth());
  const rules = getRules();
  const limitFor = (date) => (date >= '2027-12-16' ? rules.hours2027 : date >= '2026-12-16' ? rules.hours2026 : rules.hoursBefore);
  const weeklyLimit = limitFor(range.from);
  const issues = [];
  const members = db.prepare('SELECT id, name FROM members ORDER BY name').all();

  for (const member of members) {
    const rows = db.prepare(`
      SELECT date, start_time, end_time, title FROM shifts
      WHERE member_id = ? AND date BETWEEN ? AND ? ${excludeShiftId ? 'AND id != ?' : ''}
      ORDER BY date ASC, start_time ASC
    `).all(...(excludeShiftId ? [member.id, range.from, range.to, excludeShiftId] : [member.id, range.from, range.to]));
    if (extraShifts.has(member.id)) rows.push({ ...extraShifts.get(member.id), title: extraShifts.get(member.id).title || 'Escala' });
    rows.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
    const weekly = new Map();
    const workedDates = new Set();
    let run = [];
    let maxRun = 0;
    let previous = null;

    for (const shift of rows) {
      const day = new Date(`${shift.date}T12:00:00`);
      workedDates.add(shift.date);
      const hours = hoursOf(shift.start_time, shift.end_time);
      const monday = new Date(day);
      monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      const bucket = weekly.get(weekKey) || { hours: 0, limit: limitFor(weekKey) };
      bucket.hours += hours;
      weekly.set(weekKey, bucket);

      if (hours > rules.maxDaily + rules.overtime) issues.push({
        rule: 'horas-extras', severity: 'warning', member: member.name, date: shift.date,
        message: `Jornada de ${Math.round(hours)}h em ${shift.title}; limite diário é ${rules.maxDaily}h + ${rules.overtime}h extras`,
      });
      if (hours > rules.breakAfter) issues.push({
        rule: 'intervalo', severity: 'info', member: member.name, date: shift.date,
        message: `Jornada acima de ${rules.breakAfter}h: registrar intervalo mínimo de 1h (CLT art. 71)`,
      });
      if (previous) {
        const endsAt = new Date(`${previous.date}T${previous.end_time}:00`);
        const startsAt = new Date(`${shift.date}T${shift.start_time}:00`);
        const gap = (startsAt - endsAt) / 3600000;
        if (gap <= 0) issues.push({
          rule: 'sobreposicao', severity: 'critical', member: member.name, date: shift.date,
          message: `Turno sobreposto ao anterior (${previous.title})`,
        });
        else if (gap < rules.minRest) issues.push({
          rule: 'interjornada', severity: 'critical', member: member.name, date: shift.date,
          message: `Apenas ${gap.toFixed(1)}h entre turnos; o mínimo é ${rules.minRest}h`,
        });
      }
      const previousDay = run.length ? new Date(`${run[run.length - 1]}T12:00:00`) : null;
      if (!previousDay || day - previousDay === 86400000) run.push(shift.date);
      else run = [shift.date];
      maxRun = Math.max(maxRun, run.length);
      previous = shift;
    }

    if (maxRun >= rules.maxWorked7 + 1) issues.push({
      rule: 'descanso-semanal', severity: 'critical', member: member.name, date: range.from,
      message: `${maxRun} dias consecutivos escalados; a regra geral prevê 2 dias de repouso semanal`,
    });
    for (const date of [...workedDates].sort()) {
      const start = new Date(`${date}T12:00:00`);
      let worked = 0;
      for (let offset = 0; offset < 7; offset += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() - offset);
        if (workedDates.has(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`)) worked += 1;
      }
      if (worked > rules.maxWorked7) {
        issues.push({
          rule: 'descanso-semanal', severity: 'critical', member: member.name, date,
          message: `${worked} dias trabalhados em 7; o máximo configurado é ${rules.maxWorked7}`,
        });
        break;
      }
    }
    for (const [week, bucket] of weekly) {
      if (bucket.hours > bucket.limit) issues.push({
        rule: 'jornada-semanal', severity: 'critical', member: member.name, date: week,
        message: `${Math.round(bucket.hours)}h na semana iniciada em ${week.slice(8, 10)}/${week.slice(5, 7)}; limite de ${bucket.limit}h`,
      });
    }
  }

  const counts = {
    critical: issues.filter((issue) => issue.severity === 'critical').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length,
  };
  return { month: range.from.slice(0, 7), weeklyLimit, rules, total: issues.length, counts, issues: issues.slice(0, 400) };
}

function checkDraftShift(body, excludeShiftId = null) {
  const data = validateShift(body);
  const month = data.date.slice(0, 7);
  const extras = new Map([[data.member_id, data]]);
  const result = getCompliance(month, extras, excludeShiftId);
  const member = db.prepare('SELECT name FROM members WHERE id = ?').get(data.member_id);
  return result.issues.filter((issue) => issue.member === member.name);
}

function saveUpload(body) {
  const raw = String(body.data || '');
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(raw);
  if (!match || !UPLOAD_TYPES[match[1]]) throw fail(400, 'Formato de imagem não aceito (PNG, JPG, WebP ou GIF)');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw fail(400, 'A imagem deve ter até 2 MB');
  if (!UPLOAD_SIGNATURES[match[1]](buffer)) throw fail(400, 'O conteúdo do arquivo não é uma imagem válida');
  const directory = path.join(__dirname, '..', 'data', 'uploads');
  fs.mkdirSync(directory, { recursive: true });
  const filename = `${crypto.randomUUID()}.${UPLOAD_TYPES[match[1]]}`;
  fs.writeFileSync(path.join(directory, filename), buffer);
  return `/uploads/${filename}`;
}

function logActivity(req, action, detail = '') {
  const user = auth.currentUser(req);
  if (!user) return;
  const ip = clientIp(req).slice(0, 60);
  const agent = asText(req.headers['user-agent'], 160);
  db.prepare('INSERT INTO activity_log (user_id, user_name, action, detail, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, user.name, action, asText(detail, 300), ip, agent);
}

function notifyUser(userId, message) {
  if (!userId) return;
  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)').run(userId, asText(message, 240));
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
    const now = Date.now();
    pruneAttempts(now);
    const login = asText(body.login, 40).toLowerCase();
    const key = `${clientIp(req)}:${login}`;
    const attempt = loginAttempts.get(key);
    if (attempt && attempt.count >= 5 && now - attempt.started < ATTEMPT_WINDOW) {
      throw fail(429, 'Muitas tentativas. Aguarde alguns minutos.');
    }
    const user = db.prepare('SELECT * FROM users WHERE login = ? AND active = 1').get(login);
    if (!user || !auth.verifyPassword(body.password, user.password_hash)) {
      const current = attempt && now - attempt.started < ATTEMPT_WINDOW ? attempt : { count: 0, started: now };
      current.count += 1;
      loginAttempts.set(key, current);
      throw fail(401, 'Usuário ou senha incorretos');
    }
    loginAttempts.delete(key);
    const csrf = auth.createCsrf(user.id);
    db.prepare('INSERT INTO activity_log (user_id, user_name, action, detail, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.id, user.name, 'login', `Login: ${login}`,
        clientIp(req).slice(0, 60),
        asText(req.headers['user-agent'], 160));
    return sendJson(res, 200,
      { data: { ...auth.publicUser(user), csrf } },
      { 'Set-Cookie': [auth.sessionCookie(user, body.remember !== false), auth.csrfCookie(csrf)] });
  }
  if (route === '/api/logout' && method === 'POST') {
    const current = auth.currentUser(req);
    if (current) db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(current.id);
    logActivity(req, 'logout', 'Encerrando sessão');
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie() });
  }
  if (route === '/api/me' && method === 'GET') {
    return sendJson(res, 200, { data: auth.publicUser(auth.requireUser(req)) });
  }

  // --- primeira instalação ---
  if (route === '/api/setup/status' && method === 'GET') {
    const total = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
    return sendJson(res, 200, { data: { needsSetup: total === 0 } });
  }
  if (route === '/api/setup' && method === 'POST') {
    if (db.prepare('SELECT COUNT(*) AS total FROM users').get().total > 0) throw fail(409, 'A configuração inicial já foi concluída');
    const body = await readJson(req);
    const name = asText(body.name, 80);
    const login = asText(body.login, 40).toLowerCase();
    const password = String(body.password || '');
    if (name.length < 2) throw fail(400, 'Informe o nome (mínimo 2 caracteres)');
    if (!/^[a-z0-9._-]{3,40}$/.test(login)) throw fail(400, 'Login inválido (3 a 40 caracteres: letras, números, . _ -)');
    if (password.length < 6) throw fail(400, 'A senha precisa ter ao menos 6 caracteres');
    if (password !== String(body.confirm || '')) throw fail(400, 'As senhas não coincidem');
    const result = db.prepare("INSERT INTO users (name, login, password_hash, role, active) VALUES (?, ?, ?, 'admin', 1)")
      .run(name, login, auth.hashPassword(password));
    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const csrf = auth.createCsrf(created.id);
    return sendJson(res, 201,
      { data: { ...auth.publicUser(created), csrf } },
      { 'Set-Cookie': [auth.sessionCookie(created, true), auth.csrfCookie(csrf)] });
  }

  // --- cadastro por convite (público) ---
  if (route === '/api/register' && method === 'POST') {
    const body = await readJson(req);
    const name = asText(body.name, 80);
    const login = asText(body.login, 40).toLowerCase();
    const password = String(body.password || '');
    if (name.length < 2) throw fail(400, 'Informe o nome (mínimo 2 caracteres)');
    if (!/^[a-z0-9._-]{3,40}$/.test(login)) throw fail(400, 'Login inválido (3 a 40 caracteres: letras, números, . _ -)');
    if (password.length < 6) throw fail(400, 'A senha precisa ter ao menos 6 caracteres');
    if (password !== String(body.confirm || '')) throw fail(400, 'As senhas não coincidem');
    if (db.prepare('SELECT 1 FROM users WHERE login = ?').get(login)) throw fail(400, 'Este login já está em uso');
    const code = asText(body.invite_code, 40).toUpperCase();
    const invite = db.prepare("SELECT * FROM invitations WHERE code = ? AND status = 'novo'").get(code);
    if (!invite) throw fail(400, 'Convite inválido ou já utilizado');
    if (invite.expires_at < new Date().toISOString().slice(0, 10)) throw fail(400, 'Convite expirado');
    const result = db.prepare("INSERT INTO users (name, login, password_hash, role, active, member_id) VALUES (?, ?, ?, ?, 0, ?)")
      .run(name, login, auth.hashPassword(password), invite.role, invite.member_id);
    db.prepare('UPDATE invitations SET used_by = ?, status = ? WHERE id = ?').run(result.lastInsertRowid, 'usado', invite.id);
    for (const admin of db.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1").all()) {
      notifyUser(admin.id, `${name} solicitou vínculo através do convite ${code}`);
    }
    return sendJson(res, 201, { data: { message: 'Cadastro recebido. Aguarde a aprovação do administrador.' } });
  }

  const user = auth.requireUser(req);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const origin = req.headers.origin;
    const host = req.headers.host || '';
    if (origin && origin !== `http://${host}` && origin !== `https://${host}`) throw fail(403, 'Origem inválida');
    if (!auth.verifyCsrf(req.headers['x-csrf-token'], user.id)) throw fail(403, 'Token de segurança inválido');
  }
  const employeeAllowed = (route === '/api/upload' && method === 'POST')
    || (route === '/api/me/profile' && method === 'PUT')
    || (route === '/api/me/data' && ['GET', 'DELETE'].includes(method))
    || (route === '/api/settings' && method === 'GET')
    || (route === '/api/my-shifts' && method === 'GET')
    || (/^\/api\/shifts\/\d+\/swap$/.test(route) && method === 'POST')
    || (route === '/api/swaps' && method === 'GET')
    || (route === '/api/team-options' && method === 'GET')
    || (route === '/api/notifications' && method === 'GET')
    || (/^\/api\/notifications\/\d+\/read$/.test(route) && method === 'PUT')
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
      const revoke = body.password ? ', token_version = token_version + 1' : '';
      db.prepare(`UPDATE users SET ${update.sql}${revoke} WHERE id = ?`).run(...update.values, user.id);
    }
    logActivity(req, 'profile', 'Atualização do próprio perfil');
    return sendJson(res, 200, { data: auth.publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
  }

  // --- direitos do titular (LGPD art. 18) ---
  if (route === '/api/me/data' && method === 'GET') {
    const member = user.member_id ? db.prepare('SELECT * FROM members WHERE id = ?').get(user.member_id) : null;
    const shifts = member
      ? db.prepare('SELECT * FROM shifts WHERE member_id = ? ORDER BY date DESC LIMIT 200').all(member.id)
      : [];
    const activity = db.prepare('SELECT action, detail, created_at FROM activity_log WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(user.id);
    return sendJson(res, 200, { data: {
      user: auth.publicUser(user),
      member,
      shifts,
      activity,
      policy: {
        base: 'Art. 7º, II e V da LGPD (obrigação legal e execução do contrato)',
        retention: 'Registros de jornada: até 5 anos após o desligamento',
        rights: 'Acesso, correção, anonimização, bloqueio e eliminação (art. 18)',
      },
    } });
  }
  if (route === '/api/me/data' && method === 'DELETE') {
    logActivity(req, 'data.erase', 'Solicitação de exclusão (art. 18)');
    const suffix = crypto.randomBytes(8).toString('hex');
    db.prepare("UPDATE users SET name = 'Usuário removido', login = ?, password_hash = ?, photo = '', active = 0, token_version = token_version + 1 WHERE id = ?")
      .run(`removido-${user.id}-${suffix}`, auth.hashPassword(crypto.randomBytes(24).toString('hex')), user.id);
    return sendJson(res, 200, { ok: true });
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
    if (shift.date < todayISO() || ['concluido', 'falta'].includes(shift.status)) {
      throw fail(409, 'Não é possível confirmar uma escala encerrada');
    }
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
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) throw fail(404, 'Usuário não encontrado');
    const body = await readJson(req);
    const data = validateUser({ ...body, id }, true);
    const nextRole = data.role ?? target.role;
    const nextActive = data.active ?? target.active;
    if (target.role === 'admin' && target.active === 1 && (nextRole !== 'admin' || nextActive !== 1)) {
      const admins = db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1").get().total;
      if (admins <= 1) throw fail(400, 'Não é possível rebaixar ou desativar o último administrador');
    }
    const update = buildUpdate(data);
    const revoke = body.password ? ', token_version = token_version + 1' : '';
    db.prepare(`UPDATE users SET ${update.sql}${revoke} WHERE id = ?`).run(...update.values, id);
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
    const result = db.prepare(`INSERT INTO members (name, role, email, color, active, photo, department_id, team_id, position_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(data.name, data.role, data.email, data.color, data.active ?? 1, data.photo ?? '',
        data.department_id ?? null, data.team_id ?? null, data.position_id ?? null);
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
    const body = await readJson(req);
    const data = validateShift(body);
    const issues = checkDraftShift(data).filter((issue) => issue.severity === 'critical');
    if (issues.length && !body.override) {
      const blocked = fail(409, 'A escala viola regras de conformidade');
      blocked.issues = issues;
      throw blocked;
    }
    if (issues.length) logActivity(req, 'compliance.override', `${issues.length} apontamento(s) crítico(s) substituído(s)`);
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
    const current = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id);
    if (!current) throw fail(404, 'Escala não encontrada');
    const body = await readJson(req);
    const issues = checkDraftShift({ ...current, ...body }, id).filter((issue) => issue.severity === 'critical');
    if (issues.length && !body.override) {
      const blocked = fail(409, 'A escala viola regras de conformidade');
      blocked.issues = issues;
      throw blocked;
    }
    if (issues.length) logActivity(req, 'compliance.override', `Escala #${id}: ${issues.length} apontamento(s) crítico(s) substituído(s)`);
    const update = buildUpdate(validateShift(body, true));
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
  if (route === '/api/compliance/check' && method === 'POST') {
    auth.requireAdmin(req);
    return sendJson(res, 200, { data: checkDraftShift(await readJson(req)) });
  }
  if (route === '/api/compliance/rules' && method === 'GET') {
    return sendJson(res, 200, { data: getRules() });
  }
  if (route === '/api/compliance/rules' && method === 'PUT') {
    auth.requireAdmin(req);
    const body = await readJson(req);
    const numeric = ['hoursBefore', 'hours2026', 'hours2027', 'minRest', 'maxWorked7', 'maxDaily', 'overtime', 'breakAfter'];
    const keys = {
      hoursBefore: 'rule_hours_before', hours2026: 'rule_hours_2026', hours2027: 'rule_hours_2027',
      minRest: 'rule_min_rest', maxWorked7: 'rule_max_worked_7', maxDaily: 'rule_max_daily',
      overtime: 'rule_overtime_daily', breakAfter: 'rule_break_after', source: 'rule_source',
    };
    const update = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const field of numeric) {
      if (body[field] === undefined) continue;
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value <= 0 || value > 200) throw fail(400, `Valor inválido: ${field}`);
      update.run(keys[field], String(value));
    }
    if (body.source !== undefined) update.run(keys.source, asText(body.source, 120));
    logActivity(req, 'rules.update', 'Regras de conformidade atualizadas');
    return sendJson(res, 200, { data: getRules() });
  }
  if (route === '/api/compliance/publish' && method === 'POST') {
    auth.requireAdmin(req);
    const body = await readJson(req);
    const month = monthRange(body.month) ? body.month : currentMonth();
    const snapshot = {
      month,
      rules: getRules(),
      compliance: getCompliance(month),
      summary: getSummary(month),
      published_at: new Date().toISOString(),
    };
    const text = JSON.stringify(snapshot);
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const result = db.prepare('INSERT INTO published_schedules (month, payload, hash, author) VALUES (?, ?, ?, ?)')
      .run(month, text, hash, user.name);
    logActivity(req, 'schedule.publish', `${month} · hash ${hash.slice(0, 12)}`);
    return sendJson(res, 201, { data: { id: Number(result.lastInsertRowid), month, hash, author: user.name, published_at: snapshot.published_at } });
  }
  if (route === '/api/compliance/published' && method === 'GET') {
    const month = params.get('month') || currentMonth();
    const row = db.prepare('SELECT id, month, hash, author, created_at FROM published_schedules WHERE month = ? ORDER BY id DESC LIMIT 1').get(month);
    return sendJson(res, 200, { data: row || null });
  }
  if (route === '/api/compliance/dossier' && method === 'GET') {
    auth.requireAdmin(req);
    const month = params.get('month') || currentMonth();
    const published = db.prepare('SELECT * FROM published_schedules WHERE month = ? ORDER BY id DESC LIMIT 1').get(month);
    const compliance = getCompliance(month);
    const lines = [
      'CUCO - DOSSIE DE CONFORMIDADE',
      `Empresa: ${asText(companyName(), 80)}`,
      `Mes: ${month}   Emitido em: ${new Date().toLocaleString('pt-BR')}`,
      `Fonte da regra: ${compliance.rules.source}`,
      `Limite semanal: ${compliance.weeklyLimit}h   Repouso minimo: ${compliance.rules.minRest}h`,
      `Hash SHA-256: ${published?.hash || 'nao publicado'}`,
      `Publicado por: ${published?.author || '-'} em ${published?.created_at || '-'}`,
      '',
      `APONTAMENTOS (${compliance.total})`,
      ...compliance.issues.map((issue) => `${issue.date} | ${issue.member} | ${issue.rule} | ${issue.message}`).slice(0, 500),
      '',
      'Documento gerado automaticamente. Nao constitui parecer juridico.',
    ];
    const pdf = buildPdf(lines);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cuco-dossie-${month}.pdf"`,
      'Content-Length': pdf.length,
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS,
    });
    return res.end(pdf);
  }

  if (route === '/api/team-options' && method === 'GET') {
    return sendJson(res, 200, { data: db.prepare('SELECT id, name FROM members WHERE active = 1 ORDER BY name').all() });
  }
  if (route === '/api/user-options' && method === 'GET') {
    return sendJson(res, 200, { data: db.prepare('SELECT id, name, role FROM users WHERE active = 1 ORDER BY name').all() });
  }

  // --- troca de turnos ---
  const swapMatch = /^\/api\/shifts\/(\d+)\/swap$/.exec(route);
  if (swapMatch && method === 'POST') {
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(Number(swapMatch[1]));
    if (!shift) throw fail(404, 'Escala não encontrada');
    if (user.role !== 'admin' && shift.member_id !== user.member_id) throw fail(403, 'Você só pode trocar os próprios turnos');
    if (shift.date < todayISO() || ['concluido', 'falta'].includes(shift.status)) {
      throw fail(409, 'Não é possível trocar uma escala encerrada');
    }
    const body = await readJson(req);
    const toMemberId = Number(body.to_member_id);
    if (!db.prepare('SELECT 1 FROM members WHERE id = ?').get(toMemberId)) throw fail(400, 'Integrante destino inválido');
    const result = db.prepare('INSERT INTO shift_swaps (shift_id, from_user_id, to_member_id) VALUES (?, ?, ?)')
      .run(shift.id, user.id, toMemberId);
    const targets = db.prepare('SELECT id FROM users WHERE member_id = ? AND active = 1').all(toMemberId);
    for (const target of targets) notifyUser(target.id, `${user.name} solicitou trocar o turno de ${shift.date}`);
    logActivity(req, 'swap.request', `Escala #${shift.id} → integrante #${toMemberId}`);
    return sendJson(res, 201, { data: { id: Number(result.lastInsertRowid) } });
  }
  if (route === '/api/swaps' && method === 'GET') {
    const where = user.role === 'admin' ? '' : 'WHERE sw.from_user_id = ? OR sw.to_member_id = ?';
    const values = user.role === 'admin' ? [] : [user.id, user.member_id];
    const rows = db.prepare(`
      SELECT sw.*, sh.date, sh.start_time, sh.end_time, sh.title,
        m.name AS to_member_name, u.name AS from_user_name
      FROM shift_swaps sw
      JOIN shifts sh ON sh.id = sw.shift_id
      JOIN members m ON m.id = sw.to_member_id
      JOIN users u ON u.id = sw.from_user_id
      ${where} ORDER BY sw.id DESC LIMIT 200
    `).all(...values);
    return sendJson(res, 200, { data: rows });
  }
  const swapIdMatch = /^\/api\/swaps\/(\d+)$/.exec(route);
  if (swapIdMatch && method === 'PUT') {
    auth.requireAdmin(req);
    const id = Number(swapIdMatch[1]);
    const swap = db.prepare('SELECT * FROM shift_swaps WHERE id = ?').get(id);
    if (!swap) throw fail(404, 'Solicitação não encontrada');
    const { status } = await readJson(req);
    if (!['aprovado', 'recusado'].includes(status)) throw fail(400, 'Status inválido');
    if (status === 'aprovado') {
      db.prepare('UPDATE shifts SET member_id = ?, status = ? WHERE id = ?').run(swap.to_member_id, 'planejado', swap.shift_id);
      notifyUser(swap.from_user_id, `Sua troca da escala #${swap.shift_id} foi aprovada`);
      const targets = db.prepare('SELECT id FROM users WHERE member_id = ? AND active = 1').all(swap.to_member_id);
      for (const target of targets) notifyUser(target.id, `Você recebeu o turno da escala #${swap.shift_id}`);
    }
    db.prepare('UPDATE shift_swaps SET status = ? WHERE id = ?').run(status, id);
    logActivity(req, 'swap.review', `Troca #${id}: ${status}`);
    return sendJson(res, 200, { data: db.prepare('SELECT * FROM shift_swaps WHERE id = ?').get(id) });
  }

  // --- notificações ---
  if (route === '/api/notifications' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(user.id);
    const unread = db.prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read = 0').get(user.id).total;
    return sendJson(res, 200, { data: { rows, unread } });
  }
  const notificationMatch = /^\/api\/notifications\/(\d+)\/read$/.exec(route);
  if (notificationMatch && method === 'PUT') {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(Number(notificationMatch[1]), user.id);
    return sendJson(res, 200, { ok: true });
  }

  // --- convites e aprovação de vínculo ---
  if (route === '/api/invitations' && method === 'GET') {
    auth.requireAdmin(req);
    const rows = db.prepare(`
      SELECT i.*, u.name AS user_name, u.login AS user_login, d.name AS department_name, t.name AS team_name, m.name AS member_name
      FROM invitations i
      LEFT JOIN users u ON u.id = i.used_by
      LEFT JOIN departments d ON d.id = i.department_id
      LEFT JOIN teams t ON t.id = i.team_id
      LEFT JOIN members m ON m.id = i.member_id
      ORDER BY i.id DESC LIMIT 200
    `).all();
    return sendJson(res, 200, { data: rows });
  }
  if (route === '/api/invitations' && method === 'POST') {
    auth.requireAdmin(req);
    const body = await readJson(req);
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    const role = body.role === 'admin' ? 'admin' : 'user';
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    db.prepare(`INSERT INTO invitations (code, role, department_id, team_id, member_id, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      code, role, Number(body.department_id) || null, Number(body.team_id) || null,
      Number(body.member_id) || null, user.id, expires.toISOString().slice(0, 10),
    );
    logActivity(req, 'invite.create', code);
    return sendJson(res, 201, { data: { code, role, expires_at: expires.toISOString().slice(0, 10) } });
  }
  const invitationMatch = /^\/api\/invitations\/(\d+)\/(approve|reject)$/.exec(route);
  if (invitationMatch && method === 'PUT') {
    auth.requireAdmin(req);
    const id = Number(invitationMatch[1]);
    const decision = invitationMatch[2];
    const invite = db.prepare('SELECT * FROM invitations WHERE id = ?').get(id);
    if (!invite || !invite.used_by) throw fail(404, 'Solicitação não encontrada');
    const status = decision === 'approve' ? 'aprovado' : 'recusado';
    if (decision === 'approve') {
      db.prepare('UPDATE users SET active = 1 WHERE id = ?').run(invite.used_by);
      notifyUser(invite.used_by, 'Seu vínculo foi aprovado. Você já pode entrar no sistema.');
    }
    db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run(status, id);
    logActivity(req, 'invite.review', `Convite #${id}: ${status}`);
    return sendJson(res, 200, { data: { id, status } });
  }

  // --- organização: setores, equipes e cargos ---
  const catalogs = {
    departments: { table: 'departments', label: 'Setor' },
    teams: { table: 'teams', label: 'Equipe' },
    positions: { table: 'positions', label: 'Cargo' },
  };
  const catalogMatch = /^\/api\/(departments|teams|positions)(?:\/(\d+))?$/.exec(route);
  if (catalogMatch) {
    const config = catalogs[catalogMatch[1]];
    const id = catalogMatch[2] ? Number(catalogMatch[2]) : null;
    if (method === 'GET') {
      return sendJson(res, 200, { data: db.prepare(`SELECT * FROM ${config.table} ORDER BY name`).all() });
    }
    auth.requireAdmin(req);
    if (method === 'POST') {
      const body = await readJson(req);
      const name = asText(body.name, 80);
      if (name.length < 2) throw fail(400, `Informe o nome do ${config.label.toLowerCase()}`);
      const result = config.table === 'positions'
        ? db.prepare('INSERT INTO positions (name, description, level) VALUES (?, ?, ?)').run(name, asText(body.description, 300), Math.max(1, Number(body.level) || 1))
        : config.table === 'teams'
          ? db.prepare('INSERT INTO teams (name, department_id, description) VALUES (?, ?, ?)').run(name, Number(body.department_id) || null, asText(body.description, 300))
          : db.prepare('INSERT INTO departments (name, description, responsible_user_id) VALUES (?, ?, ?)')
            .run(name, asText(body.description, 300), Number(body.responsible_user_id) || null);
      logActivity(req, `${config.table}.create`, name);
      return sendJson(res, 201, { data: db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(result.lastInsertRowid) });
    }
    if (method === 'PUT' && id) {
      const current = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(id);
      if (!current) throw fail(404, `${config.label} não encontrado`);
      const body = await readJson(req);
      const name = body.name !== undefined ? asText(body.name, 80) : current.name;
      if (name.length < 2) throw fail(400, 'Nome muito curto');
      const active = body.active === undefined ? current.active : (body.active ? 1 : 0);
      if (config.table === 'positions') {
        db.prepare('UPDATE positions SET name = ?, description = ?, level = ?, active = ? WHERE id = ?')
          .run(name, body.description !== undefined ? asText(body.description, 300) : current.description,
            body.level !== undefined ? Math.max(1, Number(body.level) || 1) : current.level, active, id);
      } else if (config.table === 'teams') {
        db.prepare('UPDATE teams SET name = ?, department_id = ?, description = ?, active = ? WHERE id = ?')
          .run(name, body.department_id !== undefined ? (Number(body.department_id) || null) : current.department_id,
            body.description !== undefined ? asText(body.description, 300) : current.description, active, id);
      } else {
        db.prepare('UPDATE departments SET name = ?, description = ?, active = ?, responsible_user_id = ? WHERE id = ?')
          .run(name, body.description !== undefined ? asText(body.description, 300) : current.description, active,
            body.responsible_user_id !== undefined ? (Number(body.responsible_user_id) || null) : (current.responsible_user_id || null), id);
      }
      return sendJson(res, 200, { data: db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(id) });
    }
    if (method === 'DELETE' && id) {
      const result = db.prepare(`DELETE FROM ${config.table} WHERE id = ?`).run(id);
      if (!result.changes) throw fail(404, `${config.label} não encontrado`);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (route === '/api/settings' && method === 'GET') {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    return sendJson(res, 200, { data: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
  }
  if (route === '/api/settings' && method === 'PUT') {
    auth.requireAdmin(req);
    const body = await readJson(req);
    const allowed = ['company_name', 'contact_email', 'company_address', 'default_start', 'default_end', 'alert_days'];
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

module.exports = { handleApi, hoursOf, getCompliance, checkDraftShift, validateShift, validateMember, validateUser, validPhoto };
