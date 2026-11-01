import { describe, it, expect } from 'vitest';
import { DOWNLOAD_TTL_SECONDS, signDownloadToken, verifyDownloadToken } from '../../src/common/download-token.js';
import { handleReportDownload, registerReportRoutes, reportRoutesActive, type Req, type Res } from '../../src/modules/report/download.js';
import { publicBase, linkProvider } from '../../src/modules/report/links.js';
import { sha256, keyIdOf, authorize } from '../../src/common/auth/keys.js';
import { ReportCache } from '../../src/modules/report/report.js';
import { dataOf, manyFindings } from '../helpers/report-fixtures.js';

const SECRET = 'a'.repeat(32);
const ID = 'a1b2c3d4e5f60718293a4b5c';
const NOW = 1_800_000_000;
const KID = 'abcdef012345';

describe('download token', () => {
  it('accepts a valid token', () => {
    const t = signDownloadToken({ id: ID, ext: 'pdf', kid: KID }, SECRET, NOW);
    expect(verifyDownloadToken(t, { id: ID, ext: 'pdf' }, SECRET, NOW + 5)).toEqual({ ok: true, kid: KID });
  });
  it('lives 10 minutes', () => {
    expect(DOWNLOAD_TTL_SECONDS).toBe(600);
    const t = signDownloadToken({ id: ID, ext: 'pdf', kid: KID }, SECRET, NOW);
    expect(verifyDownloadToken(t, { id: ID, ext: 'pdf' }, SECRET, NOW + 599).ok).toBe(true);
    expect(verifyDownloadToken(t, { id: ID, ext: 'pdf' }, SECRET, NOW + 600)).toEqual({ ok: false, reason: 'expired' });
  });
  it('rejects a tampered payload or signature', () => {
    const t = signDownloadToken({ id: ID, ext: 'pdf', kid: KID }, SECRET, NOW);
    const [p, s] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ v: 2, id: ID, ext: 'pdf', kid: KID, exp: NOW + 99999 })).toString('base64url');
    expect(verifyDownloadToken(`${forged}.${s}`, { id: ID, ext: 'pdf' }, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
    expect(verifyDownloadToken(`${p}.${s.slice(0, -2)}AA`, { id: ID, ext: 'pdf' }, SECRET, NOW).ok).toBe(false);
  });
  it('is bound to id and extension', () => {
    const t = signDownloadToken({ id: ID, ext: 'pdf', kid: KID }, SECRET, NOW);
    expect(verifyDownloadToken(t, { id: 'b'.repeat(24), ext: 'pdf' }, SECRET, NOW)).toEqual({ ok: false, reason: 'mismatch' });
    expect(verifyDownloadToken(t, { id: ID, ext: 'sarif' }, SECRET, NOW)).toEqual({ ok: false, reason: 'mismatch' });
  });
  it('carries the key id and refuses claims without a valid one', () => {
    const t = signDownloadToken({ id: ID, ext: 'pdf', kid: 'anon' }, SECRET, NOW);
    expect(verifyDownloadToken(t, { id: ID, ext: 'pdf' }, SECRET, NOW)).toEqual({ ok: true, kid: 'anon' });
    for (const bad of ['', 'UPPER', 'has space', 'x'.repeat(13), 'a.b']) expect(() => signDownloadToken({ id: ID, ext: 'pdf', kid: bad }, SECRET, NOW)).toThrow(/kid/);
    // an old (v1) token without a kid is refused even with a good signature
    const part = Buffer.from(JSON.stringify({ v: 1, id: ID, ext: 'pdf', exp: NOW + 100 })).toString('base64url');
    const sig = signDownloadToken({ id: ID, ext: 'pdf', kid: KID }, SECRET, NOW).split('.')[1];
    expect(verifyDownloadToken(`${part}.${sig}`, { id: ID, ext: 'pdf' }, SECRET, NOW).ok).toBe(false);
  });
  it('never puts the plain key or its hash into the token', () => {
    const key = ['plain', 'key', 'for', 'tests', '0001'].join('-'); // built at runtime so secret scanners see no literal
    const entry = { label: 'ci', scope: 'read' as const, hash: sha256(key) };
    const kid = keyIdOf(entry);
    expect(kid).toMatch(/^[a-f0-9]{12}$/);
    const t = signDownloadToken({ id: ID, ext: 'pdf', kid }, SECRET, NOW);
    const payload = Buffer.from(t.split('.')[0], 'base64url').toString('utf8');
    for (const secret of [key, entry.hash.toString('hex'), entry.hash.toString('hex').slice(0, 16)]) {
      expect(payload).not.toContain(secret);
      expect(t).not.toContain(secret);
    }
    expect(kid).not.toBe(entry.hash.toString('hex').slice(0, 12)); // not simply a prefix of the stored hash
  });
  it('rejects another secret and malformed input', () => {
    const t = signDownloadToken({ id: ID, ext: 'pdf', kid: KID }, SECRET, NOW);
    expect(verifyDownloadToken(t, { id: ID, ext: 'pdf' }, 'b'.repeat(32), NOW).ok).toBe(false);
    for (const bad of [undefined, '', 'x', 'a.b.c', 'a b.c', 'é.é', 'a'.repeat(600), 42]) {
      expect(verifyDownloadToken(bad, { id: ID, ext: 'pdf' }, SECRET, NOW).ok).toBe(false);
    }
  });
  it('refuses a short secret to sign or verify', () => {
    expect(() => signDownloadToken({ id: ID, ext: 'pdf' }, 'short', NOW)).toThrow(/at least 32/);
    expect(() => verifyDownloadToken('x.y', { id: ID, ext: 'pdf' }, 'short', NOW)).toThrow(/at least 32/);
  });
});

function fakeRes() {
  const r = { code: 0, headers: {} as Record<string, string | number>, body: undefined as Buffer | string | undefined };
  const res: Res = {
    status(c) {
      r.code = c;
      return res;
    },
    setHeader(n, v) {
      r.headers[n.toLowerCase()] = v;
    },
    send(b) {
      r.body = b;
    }
  };
  return { r, res };
}
const call = (file: string | undefined, query: Record<string, unknown>, deps: Parameters<typeof handleReportDownload>[2]) => {
  const { r, res } = fakeRes();
  handleReportDownload({ params: { file }, query } as Req, res, deps);
  return r;
};

describe('GET /reports/:file handler', () => {
  const cache = new ReportCache();
  const pdf = Buffer.from('%PDF-1.7 test');
  cache.put(ID, [
    { format: 'pdf', mimeType: 'application/pdf', data: pdf },
    { format: 'sarif', mimeType: 'application/sarif+json', data: Buffer.from('{"version":"2.1.0"}') },
    { format: 'sbom', mimeType: 'application/vnd.cyclonedx+json', data: Buffer.from('{"bomFormat":"CycloneDX"}') }
  ], KID);
  const nowSec = Math.floor(Date.now() / 1000);
  const deps = { cache, secret: SECRET, now: () => nowSec };
  const tok = (ext: string, at = nowSec) => signDownloadToken({ id: ID, ext, kid: KID }, SECRET, at);

  it('serves the file with download headers', () => {
    const r = call(`${ID}.pdf`, { t: tok('pdf') }, deps);
    expect(r.code).toBe(200);
    expect(r.body).toEqual(pdf);
    expect(r.headers['content-type']).toBe('application/pdf');
    expect(r.headers['content-disposition']).toBe('attachment; filename="metamorph-report-a1b2c3d4.pdf"');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.headers['content-length']).toBe(pdf.length);
  });
  it('serves sarif and cdx.json with their types', () => {
    expect(call(`${ID}.sarif`, { t: tok('sarif') }, deps).headers['content-type']).toBe('application/sarif+json');
    const r = call(`${ID}.cdx.json`, { t: tok('cdx.json') }, deps);
    expect(r.code).toBe(200);
    expect(r.headers['content-type']).toBe('application/vnd.cyclonedx+json');
  });
  it('returns 404 with a clear message when the cache has no entry', () => {
    const other = 'c'.repeat(24);
    const r = call(`${other}.pdf`, { t: signDownloadToken({ id: other, ext: 'pdf', kid: KID }, SECRET, nowSec) }, deps);
    expect(r.code).toBe(404);
    expect(String(r.body)).toContain('Run generate_report again');
  });
  it('refuses a validly signed link whose key id differs from the entry owner, with the same answer as a bad signature', () => {
    const owned = new ReportCache();
    owned.put(ID, [{ format: 'pdf', mimeType: 'application/pdf', data: pdf }], KID);
    const d = { cache: owned, secret: SECRET, now: () => nowSec };
    const own = call(`${ID}.pdf`, { t: tok('pdf') }, d);
    expect(own.code).toBe(200);
    const other = call(`${ID}.pdf`, { t: signDownloadToken({ id: ID, ext: 'pdf', kid: '0123456789ab' }, SECRET, nowSec) }, d);
    expect(other.code).toBe(403);
    expect(other.body).not.toEqual(pdf);
    expect(other.body).toBe(call(`${ID}.pdf`, { t: tok('pdf').slice(0, -3) + 'abc' }, d).body);
    // an 'anon' claim cannot open a key-owned entry, and a key claim cannot open an anon entry
    expect(call(`${ID}.pdf`, { t: signDownloadToken({ id: ID, ext: 'pdf', kid: 'anon' }, SECRET, nowSec) }, d).code).toBe(403);
    const anon = new ReportCache();
    anon.put(ID, [{ format: 'pdf', mimeType: 'application/pdf', data: pdf }]);
    expect(call(`${ID}.pdf`, { t: tok('pdf') }, { cache: anon, secret: SECRET, now: () => nowSec }).code).toBe(403);
    expect(call(`${ID}.pdf`, { t: signDownloadToken({ id: ID, ext: 'pdf', kid: 'anon' }, SECRET, nowSec) }, { cache: anon, secret: SECRET, now: () => nowSec }).code).toBe(200);
  });
  it('returns 404 once the cached report has expired', () => {
    let t = 0;
    const c = new ReportCache(() => t);
    c.put(ID, [{ format: 'pdf', mimeType: 'application/pdf', data: pdf }], KID);
    t += 10 * 60 * 1000 + 1;
    const r = call(`${ID}.pdf`, { t: tok('pdf') }, { cache: c, secret: SECRET, now: () => nowSec });
    expect(r.code).toBe(404);
  });
  it('returns 403 for a missing, wrong, tampered or expired token', () => {
    expect(call(`${ID}.pdf`, {}, deps).code).toBe(403);
    expect(call(`${ID}.pdf`, { t: tok('sarif') }, deps).code).toBe(403);
    expect(call(`${ID}.pdf`, { t: tok('pdf').slice(0, -3) + 'abc' }, deps).code).toBe(403);
    expect(call(`${ID}.pdf`, { t: ['x', 'y'] }, deps).code).toBe(403);
    const expired = call(`${ID}.pdf`, { t: tok('pdf', nowSec - 1000) }, deps);
    expect(expired.code).toBe(403);
    expect(String(expired.body)).toContain('expired');
    expect(expired.body).not.toEqual(pdf);
  });
  it('rejects path traversal and anything that is not <24 hex>.<known ext>', () => {
    for (const f of ['../../etc/passwd', `..%2f${ID}.pdf`, `${ID}.pdf/../x`, `${ID}.exe`, `${ID.toUpperCase()}.pdf`, 'index.html', '', `${ID}.pdf\u0000.txt`, undefined]) {
      const r = call(f, { t: tok('pdf') }, deps);
      expect(r.code).toBe(404);
      expect(r.body).not.toEqual(pdf);
    }
  });
  it('answers 503 when the secret is missing or short', () => {
    expect(call(`${ID}.pdf`, { t: 'x' }, { cache, secret: 'short' }).code).toBe(503);
    const saved = process.env.METAMORPH_TOKEN_SECRET;
    delete process.env.METAMORPH_TOKEN_SECRET;
    try {
      expect(call(`${ID}.pdf`, { t: 'x' }, { cache }).code).toBe(503);
    } finally {
      if (saved !== undefined) process.env.METAMORPH_TOKEN_SECRET = saved;
    }
  });
  it('registers exactly one GET route and no listing', () => {
    const paths: string[] = [];
    expect(reportRoutesActive()).toBe(false);
    registerReportRoutes({ get: (p) => paths.push(p) });
    expect(paths).toEqual(['/reports/:file']);
    expect(reportRoutesActive()).toBe(true);
  });
});

describe('link provider', () => {
  it('normalises the public URL and rejects odd ones', () => {
    expect(publicBase('https://m.example.com/')).toBe('https://m.example.com');
    expect(publicBase('https://m.example.com/mcp-host/')).toBe('https://m.example.com/mcp-host');
    expect(publicBase('http://localhost:3000')).toBe('http://localhost:3000');
    for (const bad of [undefined, '', 'javascript:alert(1)', 'ftp://x', 'not a url', 'https://u:p@x.com', 'https://x.com/?a=1']) expect(publicBase(bad)).toBeUndefined();
  });
  it('signs a link per file and verifies against the same secret', () => {
    const p = linkProvider({ secret: SECRET, publicUrl: 'https://m.example.com', routesActive: true, keyId: KID, now: NOW });
    const l = p.link(ID, 'pdf');
    expect(l?.url).toBe(`https://m.example.com${l?.path}`);
    const token = new URL(l?.url as string).searchParams.get('t');
    expect(verifyDownloadToken(token, { id: ID, ext: 'pdf' }, SECRET, NOW + 1)).toEqual({ ok: true, kid: KID });
  });
  it('has no links without routes or without a valid secret', () => {
    expect(linkProvider({ secret: SECRET, routesActive: false, keyId: KID }).link(ID, 'pdf')).toBeUndefined();
    expect(linkProvider({ secret: 'short', routesActive: true, keyId: KID }).link(ID, 'pdf')).toBeUndefined();
    expect(linkProvider({ secret: 'short', routesActive: true, keyId: KID }).hint).toContain('METAMORPH_TOKEN_SECRET');
  });
});

describe('key id from the guard', () => {
  const KEY = 'write-key-for-tests-0003';
  const table = [{ label: 'owner', scope: 'write' as const, hash: sha256(KEY) }];
  it('is returned by authorize, stable, and differs per key entry', () => {
    const a = authorize(KEY, 'read', table);
    expect(a.ok && a.keyId).toBe(keyIdOf(table[0]));
    expect(keyIdOf(table[0])).toBe(keyIdOf({ hash: sha256(KEY) }));
    expect(keyIdOf({ hash: sha256('another-key-0001') })).not.toBe(keyIdOf(table[0]));
    expect(JSON.stringify(a)).not.toContain(KEY);
  });
});

describe('generateReport ownership and guard key id', () => {
  const data = dataOf(manyFindings(2));
  it('records the owner on the cache entry, and two keys get different ids for identical input', async () => {
    const { generateReport } = await import('../../src/modules/report/report.js');
    const cache = new ReportCache();
    const a = await generateReport(data, undefined, cache, 'aaaaaaaaaaaa');
    const b = await generateReport(data, undefined, cache, 'bbbbbbbbbbbb');
    expect(a.reportId).not.toBe(b.reportId);
    expect(cache.ownerOf(a.reportId)).toBe('aaaaaaaaaaaa');
    expect(cache.ownerOf(b.reportId)).toBe('bbbbbbbbbbbb');
    expect(cache.ownerOf('f'.repeat(24))).toBeUndefined();
    const anon = await generateReport(data, undefined, cache);
    expect(cache.ownerOf(anon.reportId)).toBe('anon');
  });
  it("end to end: the link issued for key A opens only A's report", async () => {
    const { generateReport } = await import('../../src/modules/report/report.js');
    const cache = new ReportCache();
    const now = Math.floor(Date.now() / 1000);
    const mk = (kid: string) => linkProvider({ secret: SECRET, publicUrl: 'https://m.example.com', routesActive: true, keyId: kid });
    const a = await generateReport(data, mk('aaaaaaaaaaaa'), cache, 'aaaaaaaaaaaa');
    const b = await generateReport(data, mk('bbbbbbbbbbbb'), cache, 'bbbbbbbbbbbb');
    const tokenOf = (url?: string) => new URL(url as string).searchParams.get('t');
    const fileOf = (r: typeof a) => r.files.find((f) => f.format === 'sarif')!;
    const d = { cache, secret: SECRET, now: () => now };
    expect(call(`${a.reportId}.sarif`, { t: tokenOf(fileOf(a).downloadUrl) }, d).code).toBe(200);
    // A's token against B's report id: the signature covers the id, so it fails
    expect(call(`${b.reportId}.sarif`, { t: tokenOf(fileOf(a).downloadUrl) }, d).code).toBe(403);
    // a token validly signed for B's id but carrying A's key id is refused by the owner check
    expect(call(`${b.reportId}.sarif`, { t: signDownloadToken({ id: b.reportId, ext: 'sarif', kid: 'aaaaaaaaaaaa' }, SECRET, now) }, d).code).toBe(403);
    expect(call(`${b.reportId}.sarif`, { t: tokenOf(fileOf(b).downloadUrl) }, d).code).toBe(200);
  });
  it('requestKeyId: anon when auth is off, the guard-recorded id otherwise, and it refuses to guess', async () => {
    const { requestKeyId } = await import('../../src/common/auth/scope.guard.js');
    const saved = process.env.METAMORPH_AUTH;
    try {
      process.env.METAMORPH_AUTH = 'off';
      expect(requestKeyId({})).toBe('anon');
      delete process.env.METAMORPH_AUTH;
      expect(requestKeyId({ auth: { claims: { keyId: 'abcdef012345' } } })).toBe('abcdef012345');
      for (const bad of [{}, { auth: {} }, { auth: { claims: { keyId: 'anon' } } }, { auth: { claims: { keyId: 'not-hex-id!!' } } }]) expect(() => requestKeyId(bad as never)).toThrow(/could not identify/);
    } finally {
      if (saved === undefined) delete process.env.METAMORPH_AUTH;
      else process.env.METAMORPH_AUTH = saved;
    }
  });
});
