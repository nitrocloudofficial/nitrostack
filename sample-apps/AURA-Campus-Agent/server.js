const { spawn } = require('child_process');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_PORT = 8000;

// Start FastAPI Backend
console.log('Starting FastAPI backend subprocess...');
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
const pythonProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', BACKEND_PORT.toString()], {
  cwd: __dirname,
  env: { ...process.environ, PYTHONPATH: __dirname }
});

pythonProcess.stdout.on('data', (data) => {
  console.log(`[FastAPI] ${data.toString().trim()}`);
});

pythonProcess.stderr.on('data', (data) => {
  console.error(`[FastAPI Error] ${data.toString().trim()}`);
});

pythonProcess.on('close', (code) => {
  console.log(`FastAPI process exited with code ${code}`);
});

// Proxy API requests to the Python FastAPI backend
app.use('/api', createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true,
}));

app.use('/agent', createProxyMiddleware({
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true,
}));

// Serve static frontend files from Vite build output
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Fallback to index.html for Single Page Application (SPA) routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Clean shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down...');
  pythonProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Shutting down...');
  pythonProcess.kill();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`AURA Node.js Web Server is listening on port ${PORT}`);
  console.log(`Proxying backend requests to FastAPI on port ${BACKEND_PORT}`);
});
