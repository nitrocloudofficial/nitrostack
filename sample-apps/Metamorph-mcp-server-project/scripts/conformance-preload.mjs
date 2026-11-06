// Test-only preload for scripts/conformance.mjs and scripts/load.mjs (loaded into the SERVER process with --import).
// It replaces global fetch so the run needs no network:
//   codeload.github.com  -> the local fixture tarball named by METAMORPH_CONF_TARBALL
//   api.osv.dev          -> a fake advisory for every queried package (so findings and fixes exist)
//   anything else        -> 503 (feeds degrade, as they do when a feed is down)
// Options used by scripts/load.mjs only (all off by default, so the conformance run is unchanged):
//   METAMORPH_CONF_FEEDS=1          answer CISA KEV, FIRST EPSS, endoflife.date, php.net and nodejs.org with small valid bodies
//   METAMORPH_CONF_DELAY_MS=20000   hold every request to the hosts in METAMORPH_CONF_DELAY_HOSTS (comma separated) for that
//                                   long before answering; an abort (the caller's timeout) ends the wait with an AbortError
//   METAMORPH_CONF_MEMFILE=path     append process.memoryUsage() as one JSON line every 250 ms
// It never ships with the server; nothing in src/ imports it.
import { appendFileSync, readFileSync } from 'node:fs';

const tarball = process.env.METAMORPH_CONF_TARBALL;
const delayMs = Number(process.env.METAMORPH_CONF_DELAY_MS || 0);
const delayHosts = (process.env.METAMORPH_CONF_DELAY_HOSTS || '').split(',').filter(Boolean);
const richFeeds = process.env.METAMORPH_CONF_FEEDS === '1';
const memFile = process.env.METAMORPH_CONF_MEMFILE;

if (memFile) {
  setInterval(() => appendFileSync(memFile, JSON.stringify({ t: Date.now(), ...process.memoryUsage() }) + '\n'), 250).unref();
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('The operation was aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted', 'AbortError'));
    }, { once: true });
  });

const json = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
const rss = (title) => new Response(`<?xml version="1.0"?><rss version="2.0"><channel><item><title>${title}</title><link>https://example.org/release</link><pubDate>Mon, 20 Oct 2026 10:00:00 GMT</pubDate><description>Stub release note.</description></item></channel></rss>`, { status: 200, headers: { 'content-type': 'application/rss+xml' } });

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
  if (delayMs > 0 && delayHosts.includes(url.hostname)) await sleep(delayMs, init.signal);
  if (url.hostname === 'codeload.github.com' && tarball) {
    const body = readFileSync(tarball);
    return new Response(body, { status: 200, headers: { 'content-type': 'application/gzip', 'content-length': String(body.length) } });
  }
  if (url.hostname === 'api.osv.dev') {
    const req = init.body ? JSON.parse(String(init.body)) : {};
    const vuln = (pkg) => ({
      id: 'GHSA-aaaa-bbbb-cccc',
      modified: '2024-01-01T00:00:00Z',
      aliases: ['CVE-2024-0001'],
      summary: 'Fake advisory used by the conformance run',
      database_specific: { severity: 'HIGH', cwe_ids: ['CWE-79'] },
      affected: pkg ? [{ package: { name: pkg.name, ecosystem: pkg.ecosystem }, ranges: [{ events: [{ introduced: '0' }, { fixed: '99.0.0' }] }] }] : []
    });
    if (url.pathname.endsWith('/querybatch')) return json({ results: (req.queries ?? []).map(() => ({ vulns: [{ id: 'GHSA-aaaa-bbbb-cccc', modified: '2024-01-01T00:00:00Z' }] })) });
    if (url.pathname.endsWith('/query')) return json({ vulns: [vuln(req.package)] });
    if (url.pathname.includes('/vulns/')) return json(vuln(undefined));
  }
  if (richFeeds) {
    if (url.hostname === 'www.cisa.gov') return json({ vulnerabilities: [{ cveID: 'CVE-2021-44228', vendorProject: 'Apache', product: 'Log4j2', dateAdded: '2021-12-10', dueDate: '2021-12-24', knownRansomwareCampaignUse: 'Known' }] });
    if (url.hostname === 'api.first.org') return json({ status: 'OK', data: [{ cve: 'CVE-2021-44228', epss: '0.97', percentile: '0.999', date: '2026-10-30' }] });
    if (url.hostname === 'endoflife.date') return json([{ cycle: '8.4', eol: false, latest: '8.4.1' }, { cycle: '8.1', eol: '2025-12-31', latest: '8.1.30' }, { cycle: '22', eol: false, latest: '22.11.0' }, { cycle: '10', eol: '2021-04-30', latest: '10.24.1' }]);
    if (url.hostname === 'www.php.net') return rss('PHP 8.4.1 Released');
    if (url.hostname === 'nodejs.org') return rss('Node.js security releases');
  }
  return new Response('offline in conformance run', { status: 503 });
};
