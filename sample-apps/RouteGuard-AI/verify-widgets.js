import http from 'http';

const pages = [
  '/',
  '/global-threat-feed',
  '/impact-radar',
  '/reroute-comparator',
  '/stakeholder-comms',
];

async function checkPage(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: 3002, path }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const ok = res.statusCode === 200;
        const hasError = body.includes('SyntaxError') || body.includes('Unhandled Runtime Error');
        resolve({ path, status: res.statusCode, ok: ok && !hasError, error: hasError ? 'JS error in page' : null });
      });
    });
    req.on('error', (e) => resolve({ path, status: 0, ok: false, error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ path, status: 0, ok: false, error: 'timeout' }); });
  });
}

console.log('\n🔍 Verifying widget pages at http://localhost:3002\n');
const results = await Promise.all(pages.map(checkPage));
let allGood = true;
for (const r of results) {
  const icon = r.ok ? '✅' : '❌';
  console.log(`  ${icon} ${r.path.padEnd(25)} HTTP ${r.status}${r.error ? '  — ' + r.error : ''}`);
  if (!r.ok) allGood = false;
}
console.log('');
console.log(allGood ? '✅ All pages OK.\n' : '❌ Some pages failed.\n');
