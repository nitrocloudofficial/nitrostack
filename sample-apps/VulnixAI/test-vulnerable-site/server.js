// Simple HTTP server for testing vulnerability scanner
// Run with: node test-vulnerable-site/server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Intentionally insecure headers for testing
  res.setHeader('Server', 'Apache/2.4.41 (Ubuntu)');
  res.setHeader('X-Powered-By', 'PHP/7.4.3');
  
  // Missing security headers (intentional for testing):
  // - No Strict-Transport-Security
  // - No X-Frame-Options
  // - No Content-Security-Policy
  // - No X-Content-Type-Options
  
  if (req.url === '/' || req.url === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/sentinel-verify.txt') {
    // Serve verification file for domain verification testing
    const verifyFilePath = path.join(__dirname, 'sentinel-verify.txt');
    fs.readFile(verifyFilePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Verification file not found. Create sentinel-verify.txt in test-vulnerable-site directory.');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(data);
    });
  } else if (req.url === '/directory/') {
    // Simulate directory listing
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
      <head><title>Index of /directory</title></head>
      <body>
      <h1>Index of /directory</h1>
      <ul>
        <li><a href="file1.txt">file1.txt</a></li>
        <li><a href="file2.txt">file2.txt</a></li>
      </ul>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🧪 Vulnerable test server running at http://localhost:${PORT}`);
  console.log(`📝 This server has intentional security issues for testing`);
  console.log(`⚠️  DO NOT use this in production!`);
  console.log(`\nTest your scanner against: http://localhost:${PORT}`);
  console.log(`\n🔐 Domain Verification:`);
  console.log(`   Create 'sentinel-verify.txt' in this directory with your token`);
  console.log(`   Access at: http://localhost:${PORT}/sentinel-verify.txt`);
});
