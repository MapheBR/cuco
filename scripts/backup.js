'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const source = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cuco.db');
const directory = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
if (!fs.existsSync(source)) {
  console.error('Banco não encontrado:', source);
  process.exit(1);
}
fs.mkdirSync(directory, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const destination = path.join(directory, `cuco-${stamp}.db`);
const db = new DatabaseSync(source);
db.exec(`VACUUM INTO '${destination.replace(/\\/g, '/').replace(/'/g, "''")}'`);
db.close();

const files = fs.readdirSync(directory).filter((name) => name.endsWith('.db')).sort();
while (files.length > 7) fs.unlinkSync(path.join(directory, files.shift()));

console.log(`Backup criado: ${destination}`);
console.log(`Arquivos mantidos: ${Math.min(files.length + 1, 7)}`);
