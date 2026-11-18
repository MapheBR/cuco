'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { fail } = require('./utils');

const dataDir = path.join(__dirname, '..', 'data');
const secretPath = path.join(dataDir, '.secret');

function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!fs.existsSync(secretPath)) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(secretPath, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  }
  return fs.readFileSync(secretPath, 'utf8').trim();
}

const secret = loadSecret();
const COOKIE = 'cuco_session';
const MAX_AGE = 7 * 24 * 60 * 60;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function signToken(userId) {
  const payload = Buffer.from(JSON.stringify({ id: userId, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    const [payload, signature] = String(token).split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(data.id) || data.exp < Date.now()) return null;
    return data.id;
  } catch {
    return null;
  }
}

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index > -1) acc[part.slice(0, index).trim()] = part.slice(index + 1).trim();
    return acc;
  }, {});
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, login: user.login, role: user.role, active: Boolean(user.active), photo: user.photo || '', member_id: user.member_id || null };
}

function currentUser(req) {
  const db = require('./db');
  const id = verifyToken(parseCookies(req.headers.cookie)[COOKIE]);
  if (!id) return null;
  return db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(id);
}

function requireUser(req) {
  const user = currentUser(req);
  if (!user) throw fail(401, 'Faça login para continuar');
  return user;
}

function requireAdmin(req) {
  const user = requireUser(req);
  if (user.role !== 'admin') throw fail(403, 'Acesso restrito a administradores');
  return user;
}

const CSRF_COOKIE = 'cuco_csrf';
const secureFlag = () => (process.env.SECURE_COOKIES === '1' || process.env.NODE_ENV === 'production' ? '; Secure' : '');

function sessionCookie(user, remember = true) {
  const age = remember ? `; Max-Age=${MAX_AGE}` : '';
  return `${COOKIE}=${signToken(user.id)}; HttpOnly; SameSite=Lax; Path=/${age}${secureFlag()}`;
}

function createCsrf(userId) {
  const nonce = crypto.randomBytes(24).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${nonce}.${userId}`).digest('base64url');
  return `${nonce}.${signature}`;
}

function verifyCsrf(token, userId) {
  try {
    const [nonce, signature] = String(token || '').split('.');
    if (!nonce || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${nonce}.${userId}`).digest('base64url');
    return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function csrfCookie(token) {
  return `${CSRF_COOKIE}=${token}; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}${secureFlag()}`;
}

function clearCookie() {
  return [
    `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag()}`,
    `${CSRF_COOKIE}=; SameSite=Lax; Path=/; Max-Age=0${secureFlag()}`,
  ];
}

module.exports = {
  hashPassword, verifyPassword, currentUser, requireUser, requireAdmin, publicUser,
  sessionCookie, createCsrf, verifyCsrf, csrfCookie, clearCookie,
};
