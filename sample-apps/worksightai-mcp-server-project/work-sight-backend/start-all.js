import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Work Sight AI - Multi-Service Orchestrator');
console.log('--------------------------------------------');

const apiPath = path.resolve('..', 'api');

// 1. Spawn Python API Server (Flask on Port 5000)
console.log(`[Python API] Starting Flask server on http://localhost:5000...`);
const pythonProc = spawn('python', ['app.py'], {
  cwd: apiPath,
  shell: true,
  stdio: 'inherit',
});

pythonProc.on('error', (err) => {
  console.error('❌ Failed to start Python API process:', err);
});

// 2. Spawn NitroStack Server in Production Dual Mode (HTTP + STDIO on Port 3000)
setTimeout(() => {
  console.log('[NitroStack] Starting NitroStack Server (HTTP + STDIO Dual Mode on Port 3000)...');
  const nitroProc = spawn('npx', ['nitrostack-cli', 'start'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000' }
  });

  nitroProc.on('error', (err) => {
    console.error('❌ Failed to start NitroStack process:', err);
  });
}, 2000);

process.on('SIGINT', () => {
  console.log('\nShutting down all processes...');
  pythonProc.kill();
  process.exit();
});
