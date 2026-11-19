'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { hashPassword } = require('./auth');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(process.env.DB_PATH || path.join(dataDir, 'cuco.db'));
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#1E8A4C',
    active INTEGER NOT NULL DEFAULT 1,
    department_id INTEGER,
    team_id INTEGER,
    position_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    responsible_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    level INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'novo',
    created_by INTEGER REFERENCES users(id),
    used_by INTEGER REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Escala',
    status TEXT NOT NULL DEFAULT 'planejado',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    active INTEGER NOT NULL DEFAULT 1,
    photo TEXT NOT NULL DEFAULT '',
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    token_version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS published_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    payload TEXT NOT NULL,
    hash TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shift_swaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_member_id INTEGER NOT NULL REFERENCES members(id),
    status TEXT NOT NULL DEFAULT 'pendente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
  CREATE INDEX IF NOT EXISTS idx_shifts_member ON shifts(member_id);
  CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
`);

function migrate() {
  const memberColumns = db.prepare('PRAGMA table_info(members)').all().map((column) => column.name);
  if (!memberColumns.includes('photo')) db.exec("ALTER TABLE members ADD COLUMN photo TEXT NOT NULL DEFAULT ''");
  if (!memberColumns.includes('department_id')) db.exec('ALTER TABLE members ADD COLUMN department_id INTEGER');
  if (!memberColumns.includes('team_id')) db.exec('ALTER TABLE members ADD COLUMN team_id INTEGER');
  if (!memberColumns.includes('position_id')) db.exec('ALTER TABLE members ADD COLUMN position_id INTEGER');
  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
  if (!userColumns.includes('member_id')) db.exec('ALTER TABLE users ADD COLUMN member_id INTEGER REFERENCES members(id) ON DELETE SET NULL');
  if (!userColumns.includes('token_version')) db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
  const departmentColumns = db.prepare('PRAGMA table_info(departments)').all().map((column) => column.name);
  if (!departmentColumns.includes('responsible_user_id')) db.exec('ALTER TABLE departments ADD COLUMN responsible_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
  const logColumns = db.prepare('PRAGMA table_info(activity_log)').all().map((column) => column.name);
  if (!logColumns.includes('ip')) db.exec("ALTER TABLE activity_log ADD COLUMN ip TEXT NOT NULL DEFAULT ''");
  if (!logColumns.includes('user_agent')) db.exec("ALTER TABLE activity_log ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''");

  // Versões antigas criaram members sem FKs: referências órfãs eram possíveis.
  if (!db.prepare('PRAGMA foreign_key_list(members)').all().length) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('PRAGMA legacy_alter_table = ON');
    db.exec('BEGIN');
    try {
      db.exec(`
        UPDATE members SET department_id = NULL WHERE department_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM departments WHERE id = members.department_id);
        UPDATE members SET team_id = NULL WHERE team_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM teams WHERE id = members.team_id);
        UPDATE members SET position_id = NULL WHERE position_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM positions WHERE id = members.position_id);
        CREATE TABLE members_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          color TEXT NOT NULL DEFAULT '#1E8A4C',
          active INTEGER NOT NULL DEFAULT 1,
          department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
          team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
          position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          photo TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO members_new (id, name, role, email, color, active, department_id, team_id, position_id, created_at, photo)
          SELECT id, name, role, email, color, active, department_id, team_id, position_id, created_at, photo FROM members;
        DROP TABLE members;
        ALTER TABLE members_new RENAME TO members;
      `);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.exec('PRAGMA legacy_alter_table = OFF');
      db.exec('PRAGMA foreign_keys = ON');
      throw error;
    }
    db.exec('PRAGMA legacy_alter_table = OFF');
    db.exec('PRAGMA foreign_keys = ON');
  }
}

function seedUsers() {
  const insert = db.prepare('INSERT INTO users (name, login, password_hash, role, active, member_id) VALUES (?, ?, ?, ?, 1, ?)');
  if (!db.prepare("SELECT 1 FROM users WHERE login = 'admin'").get()) {
    insert.run('Administrador', 'admin', hashPassword('admin123'), 'admin', null);
  }
  const firstMember = db.prepare('SELECT id FROM members ORDER BY id LIMIT 1').get();
  const secondMember = db.prepare('SELECT id FROM members ORDER BY id LIMIT 1 OFFSET 1').get();
  if (!db.prepare("SELECT 1 FROM users WHERE login = 'funcionario'").get()) {
    insert.run('Funcionário', 'funcionario', hashPassword('funcionario123'), 'user', firstMember?.id ?? null);
  }
  if (!db.prepare("SELECT 1 FROM users WHERE login = 'cuco'").get()) {
    insert.run('Operadora Cuco', 'cuco', hashPassword('cuco123'), 'user', secondMember?.id ?? null);
  }
  db.prepare("UPDATE users SET member_id = COALESCE(member_id, ?) WHERE role = 'user'").run(firstMember?.id ?? null);
}

function mod(value, length) {
  return ((value % length) + length) % length;
}

function dateOffset(days) {
  const day = new Date();
  day.setHours(12, 0, 0, 0);
  day.setDate(day.getDate() + days);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

function seedSettings() {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insert.run('company_name', 'Minha Empresa');
  insert.run('contact_email', 'contato@cuco.local');
  insert.run('company_address', '');
  insert.run('default_start', '08:00');
  insert.run('default_end', '16:00');
  insert.run('alert_days', '3');
  insert.run('rule_hours_before', '44');
  insert.run('rule_hours_2026', '42');
  insert.run('rule_hours_2027', '40');
  insert.run('rule_min_rest', '11');
  insert.run('rule_max_worked_7', '5');
  insert.run('rule_max_daily', '8');
  insert.run('rule_overtime_daily', '2');
  insert.run('rule_break_after', '6');
  insert.run('rule_source', 'Regra geral CLT / EC 141/2026');
}

function seed() {
  seedSettings();
  const count = db.prepare('SELECT COUNT(*) AS total FROM members').get().total;
  if (count > 0) return;

  const insertMember = db.prepare('INSERT INTO members (name, role, email, color) VALUES (?, ?, ?, ?)');
  const members = [
    ['Ana Souza', 'Recepcionista', 'ana@cuco.local', '#1E8A4C'],
    ['Bruno Lima', 'Técnico', 'bruno@cuco.local', '#2E9E86'],
    ['Carla Dias', 'Coordenadora', 'carla@cuco.local', '#F2A93B'],
    ['Diego Rocha', 'Operador', 'diego@cuco.local', '#4C7DD6'],
    ['Elisa Martins', 'Analista', 'elisa@cuco.local', '#9B6BD6'],
  ];
  const ids = members.map((member) => insertMember.run(...member).lastInsertRowid);

  const insertShift = db.prepare(`
    INSERT INTO shifts (member_id, date, start_time, end_time, title, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const templates = [
    { start: '08:00', end: '16:00', title: 'Turno da manhã' },
    { start: '12:00', end: '20:00', title: 'Turno da tarde' },
    { start: '22:00', end: '06:00', title: 'Turno da noite' },
  ];

  for (let offset = -14; offset <= 16; offset += 1) {
    const date = dateOffset(offset);
    const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
    if (dayOfWeek === 0) continue;

    const status = offset < 0 ? 'concluido' : offset === 0 ? 'confirmado' : 'planejado';
    const first = mod(offset + (offset % 2), ids.length);
    const second = mod(first + 2, ids.length);

    insertShift.run(ids[first], date, templates[0].start, templates[0].end, templates[0].title, status, '');
    insertShift.run(ids[second], date, templates[1].start, templates[1].end, templates[1].title, status, '');
    if (dayOfWeek !== 6 && offset % 3 === 0) {
      insertShift.run(ids[mod(first + 1, ids.length)], date, templates[2].start, templates[2].end, templates[2].title, status, 'Escala noturna');
    }
  }
}

migrate();
seedSettings();
if (process.env.SEED_DEMO === '1') {
  seed();
  seedUsers();
}

module.exports = db;
