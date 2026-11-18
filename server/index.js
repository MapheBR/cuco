'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { handleApi } = require('./api');
const { sendJson, serveStatic } = require('./utils');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

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
      sendJson(res, status, { error: status === 500 ? 'Erro interno do servidor' : error.message });
    }
    return;
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
  console.log(`  Banco local: ${path.join(__dirname, '..', 'data', 'cuco.db')}\n`);
});
