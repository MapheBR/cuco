'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { handleApi } = require('./api');
const auth = require('./auth');
const { sendJson, serveStatic } = require('./utils');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');

function serveStaticWithType(res, filePath, contentType) {
  fs.readFile(filePath, (error, data) => {
    if (error) return sendJson(res, 404, { error: 'Arquivo não encontrado' });
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    return sendJson(res, 400, { error: 'URL inválida' });
  }

  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, url);
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('[cuco] erro interno:', error);
      sendJson(res, status, { error: status === 500 ? 'Erro interno do servidor' : error.message, issues: error.issues });
    }
    return;
  }

  if (url.pathname.startsWith('/uploads/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Método não permitido' });
    const name = url.pathname.slice('/uploads/'.length);
    if (!/^[a-zA-Z0-9_.-]+\.(png|jpg|webp|gif)$/.test(name) || name.includes('..')) {
      return sendJson(res, 400, { error: 'Arquivo inválido' });
    }
    if (!auth.currentUser(req)) return sendJson(res, 401, { error: 'Autenticação necessária' });
    const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
    return serveStaticWithType(res, path.join(UPLOAD_DIR, name), types[path.extname(name).toLowerCase()]);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Método não permitido' });
  }

  let relative;
  try {
    relative = decodeURIComponent(url.pathname);
  } catch {
    return sendJson(res, 400, { error: 'Caminho inválido' });
  }
  if (relative === '/' || relative === '') relative = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(relative).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, 'index.html')) {
    return sendJson(res, 403, { error: 'Acesso negado' });
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) return serveStatic(res, filePath);
    serveStatic(res, path.join(PUBLIC_DIR, 'index.html'));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Cuco rodando em http://localhost:${PORT}`);
  console.log(`  Banco local: ${process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cuco.db')}\n`);
});
