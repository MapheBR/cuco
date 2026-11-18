'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

process.env.DB_PATH = path.join(os.tmpdir(), `cuco-unit-${process.pid}.db`);
process.env.SEED_DEMO = '1';
const api = require('../server/api');
const db = require('../server/db');

test('horas de turno', () => {
  assert.equal(api.hoursOf('08:00', '16:00'), 8);
  assert.equal(api.hoursOf('22:00', '06:00'), 8);
  assert.equal(api.hoursOf('08:30', '12:00'), 3.5);
});

test('validação de escala', () => {
  assert.throws(() => api.validateShift({ member_id: 'x', date: '2026-11-20', start_time: '08:00', end_time: '16:00' }));
  assert.throws(() => api.validateShift({ member_id: 1, date: '20/11/2026', start_time: '08:00', end_time: '16:00' }));
  assert.throws(() => api.validateShift({ member_id: 1, date: '2026-11-20', start_time: '08:00', end_time: '08:00' }));
  const valid = api.validateShift({ member_id: 1, date: '2026-11-20', start_time: '08:00', end_time: '16:00', title: 'Turno' });
  assert.equal(valid.title, 'Turno');
});

test('foto aceita apenas caminhos de upload', () => {
  assert.equal(api.validPhoto('/uploads/abc-123.png'), '/uploads/abc-123.png');
  assert.equal(api.validPhoto(''), '');
  assert.throws(() => api.validPhoto('../segredo.png'));
  assert.throws(() => api.validPhoto('/uploads/arquivo.exe'));
});

test('validador detecta sobreposição e limites', () => {
  const shift = db.prepare('SELECT * FROM shifts ORDER BY id LIMIT 1').get();
  const issues = api.checkDraftShift({
    member_id: shift.member_id,
    date: shift.date,
    start_time: shift.start_time,
    end_time: shift.end_time,
    title: shift.title,
  });
  assert.ok(issues.some((issue) => issue.rule === 'sobreposicao' && issue.severity === 'critical'));
  const result = api.getCompliance(shift.date.slice(0, 7));
  assert.ok([40, 42, 44].includes(result.weeklyLimit));
  assert.ok(Array.isArray(result.issues));
});

test('validação de usuário exige login único e senha forte', () => {
  assert.throws(() => api.validateUser({ name: 'Teste', login: 'ab', password: '123' }));
  assert.throws(() => api.validateUser({ name: 'Teste', login: 'admin', password: 'senha123' }));
  const user = api.validateUser({ name: 'Teste Unit', login: 'unit_user', password: 'senha123' });
  assert.equal(user.role, 'user');
  assert.ok(user.password_hash.startsWith('scrypt$'));
});
