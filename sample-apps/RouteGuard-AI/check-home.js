import http from 'http';

const pages = ['/', '/global-threat-feed', '/impact-radar', '/reroute-comparator', '/stakeholder-comms'];

async function check(path) {
  return new Promise(resolve => {
    const req = http.get({ host: 'localhost', port: 3002, path }, res => {
      res.resume();
      resolve({ path, status: res.statusCode });
    });
    req.on('error', e => resolve({ path, status: 0, err: e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ path, status: 0, err: 'timeout' }); });
  });
}

const results = await Promise.all(pages.map(check));
for (const r of results) {
  const ok = r.status === 200;
  console.log(`${ok ? '✅' : '❌'} ${r.path.padEnd(28)} ${r.status}${r.err ? ' — ' + r.err : ''}`);
}
