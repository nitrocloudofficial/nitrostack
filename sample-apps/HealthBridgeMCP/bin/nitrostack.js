#!/usr/bin/env node
// NitroCloud shim: forwards `npx nitrostack start` → `node dist/index.js`
const { execSync } = require('child_process');
const args = process.argv.slice(2);

if (args[0] === 'start') {
  try {
    execSync('node dist/index.js', { stdio: 'inherit', cwd: __dirname + '/..' });
  } catch (e) {
    process.exit(e.status ?? 1);
  }
} else {
  console.error(`Unknown nitrostack command: ${args[0]}`);
  process.exit(1);
}
