'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function walk(directory, result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, result);
    else if (entry.name.endsWith('.js')) result.push(full);
  }
  return result;
}

const roots = ['server', 'public/js', 'scripts', 'tests'];
const files = roots.flatMap((root) => walk(path.join(__dirname, '..', root)));
let failed = 0;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(`Falha de sintaxe: ${file}`);
    console.error(result.stderr.trim());
    failed += 1;
  }
}

console.log(`${files.length} arquivos JavaScript verificados, ${failed} falha(s)`);
process.exit(failed ? 1 : 0);
