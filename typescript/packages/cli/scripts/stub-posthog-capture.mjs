#!/usr/bin/env node
/**
 * Minimal PostHog-compatible stub: logs JSON request bodies for /batch, /capture, /i/v0/e.
 * Usage: NITROSTACK_POSTHOG_HOST=http://127.0.0.1:<port> NITROSTACK_POSTHOG_KEY=stub node dist/index.js login --token ...
 */
import http from 'http';
import zlib from 'zlib';

const port = Number(process.env.STUB_POSTHOG_PORT || '9876');

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    let raw = Buffer.concat(chunks);
    if (req.headers['content-encoding'] === 'gzip') {
      try {
        raw = zlib.gunzipSync(raw);
      } catch {
        /* keep raw */
      }
    }
    const body = raw.toString('utf8');
    // Redact api_key in output
    let display = body;
    try {
      const j = JSON.parse(body);
      if (j.api_key) j.api_key = '[REDACTED]';
      if (Array.isArray(j.batch)) {
        for (const ev of j.batch) {
          if (ev?.properties && typeof ev.properties === 'object') {
            /* no-op — properties are already minimal */
          }
        }
      }
      display = JSON.stringify(j, null, 2);
    } catch {
      display = body.length > 4000 ? `${body.slice(0, 4000)}…` : body;
    }
    console.log(`[stub-posthog] ${req.method} ${req.url}\n${display}\n`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`PostHog stub listening on http://127.0.0.1:${port}`);
});
