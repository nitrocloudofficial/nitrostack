import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'node:crypto';
import { canonicalHash, signApprovalToken, verifyApprovalToken } from '../../src/common/approval-token.js';
import { signDownloadToken, verifyDownloadToken } from '../../src/common/download-token.js';
import { PlanningTools } from '../../src/modules/planning/planning.tools.js';
import { handleReportDownload, type Res } from '../../src/modules/report/download.js';
import { ReportCache } from '../../src/modules/report/report.js';
import { installOfflineFetch, loggedCtx, repoTarball, type Offline } from '../helpers/offline.js';

// Forged, expired, tampered and re-used tokens; domain separation between the two token types.
const SECRET = 'security-test-secret-security-test-secret';
const KID = 'a1b2c3d4e5f6';
const OTHER = 'another-secret-another-secret-another!!';
const NOW = 1_900_000_000;
const claim = { planHash: 'a'.repeat(64), patchHash: 'b'.repeat(64), stage: 1 };
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('base64url');

describe('approval tokens: forgery', () => {
  const good = signApprovalToken(claim, SECRET, NOW);
  const [part, sig] = good.split('.');

  it('a token built by someone who knows the hashes but not the secret is refused', () => {
    // planHash and patchHash are returned by preview_changes, so an attacker can know them.
    const payload = b64({ v: 1, ph: claim.planHash, xh: claim.patchHash, st: 1, iat: NOW, exp: NOW + 600 });
    for (const forged of [`${payload}.${hmac(OTHER, payload)}`, `${payload}.${hmac('', payload)}`, `${payload}.${hmac('x', payload)}`, `${payload}.`, `${payload}`, `.${sig}`, `${payload}.${'A'.repeat(43)}`]) {
      expect(verifyApprovalToken(forged, claim, SECRET, NOW).ok, forged.slice(0, 40)).toBe(false);
    }
  });
  it('extending the expiry or changing the stage in the payload breaks the signature', () => {
    const p = JSON.parse(Buffer.from(part, 'base64url').toString());
    for (const edit of [{ exp: p.exp + 100_000 }, { st: 2 }, { ph: 'c'.repeat(64) }, { xh: 'c'.repeat(64) }, { v: 2 }, { extra: 'x' }]) {
      const forged = `${b64({ ...p, ...edit })}.${sig}`;
      expect(verifyApprovalToken(forged, { ...claim, stage: edit.st ?? 1 }, SECRET, NOW)).toMatchObject({ ok: false, reason: 'bad_signature' });
    }
  });
  it('signature truncation, padding, case and base64 alphabet tricks are refused', () => {
    for (const s of [sig.slice(0, -1), sig.slice(0, 20), `${sig}=`, `${sig}A`, sig.toUpperCase(), sig.replace(/-/g, '+').replace(/_/g, '/'), `${sig} `, ` ${sig}`]) {
      expect(verifyApprovalToken(`${part}.${s}`, claim, SECRET, NOW).ok, s).toBe(false);
    }
  });
  it('structurally odd tokens are malformed and never throw', () => {
    const odd = ['', '.', '..', 'a.b.c', `${good}.extra`, `${good}\n`, `${good}\u0000`, 'x'.repeat(100_000), `${part}.${sig}`.replace('.', '..'), '{"v":1}', 'null', '[]'];
    for (const t of odd) expect(() => verifyApprovalToken(t, claim, SECRET, NOW)).not.toThrow();
    for (const t of odd) expect(verifyApprovalToken(t, claim, SECRET, NOW).ok).toBe(false);
    for (const t of [undefined, null, 5, {}, [good]]) expect(verifyApprovalToken(t as unknown as string, claim, SECRET, NOW)).toMatchObject({ ok: false, reason: 'malformed' });
  });
  it('a correctly signed payload that is not an object or lacks fields is malformed (signature alone is not enough)', () => {
    for (const body of [null, 5, 'str', [1], {}, { v: 1 }, { v: 1, ph: 1, xh: 'x', st: 1, iat: 1, exp: NOW + 5 }, { v: 1, ph: 'a', xh: 'b', st: '1', iat: 1, exp: NOW + 5 }, { v: 1, ph: 'a', xh: 'b', st: 1, iat: 1, exp: 'soon' }]) {
      const p = b64(body);
      expect(verifyApprovalToken(`${p}.${hmac(SECRET, p)}`, claim, SECRET, NOW)).toMatchObject({ ok: false, reason: 'malformed' });
    }
  });
  it('a token signed for a long lifetime cannot be minted through the API', () => {
    expect(() => signApprovalToken({ ...claim, ttlSeconds: 901 }, SECRET, NOW)).toThrow();
    expect(() => signApprovalToken({ ...claim, ttlSeconds: 0 }, SECRET, NOW)).toThrow();
    expect(() => signApprovalToken({ ...claim, ttlSeconds: 1.5 }, SECRET, NOW)).toThrow();
  });
  it('a missing or short secret is a configuration error, never "valid"', () => {
    for (const s of ['', 'short', 'x'.repeat(31), undefined as unknown as string]) {
      expect(() => verifyApprovalToken(good, claim, s, NOW)).toThrow();
      expect(() => signApprovalToken(claim, s, NOW)).toThrow();
    }
  });
});

describe('approval tokens: expiry', () => {
  const t = signApprovalToken(claim, SECRET, NOW);
  it('valid until exp, refused at and after exp', () => {
    expect(verifyApprovalToken(t, claim, SECRET, NOW + 299).ok).toBe(true);
    expect(verifyApprovalToken(t, claim, SECRET, NOW + 300)).toMatchObject({ ok: false, reason: 'expired' });
    expect(verifyApprovalToken(t, claim, SECRET, NOW + 10 ** 9)).toMatchObject({ ok: false, reason: 'expired' });
  });
  it('a clock far in the past does not revive an old token', () => {
    expect(verifyApprovalToken(t, claim, SECRET, 0).ok).toBe(true); // before exp it is valid by definition; the server clock is the authority
    expect(verifyApprovalToken(t, claim, SECRET, Number.MAX_SAFE_INTEGER)).toMatchObject({ ok: false, reason: 'expired' });
  });
});

describe('approval tokens: reuse across stages, plans and repositories (through the real tools)', () => {
  let off: Offline;
  const saved = { s: process.env.METAMORPH_TOKEN_SECRET, a: process.env.METAMORPH_AUTH };
  const NODE = (extra: Record<string, string> = {}) => ({
    'package.json': JSON.stringify({ name: 'a', engines: { node: '>=10' }, dependencies: { lodash: '4.17.15' } }),
    'package-lock.json': JSON.stringify({ lockfileVersion: 3, packages: { '': {}, 'node_modules/lodash': { version: '4.17.15' } } }),
    '.nvmrc': '10\n',
    '.env': 'PORT=3000\n',
    ...extra
  });
  const tars: Record<string, Buffer> = {
    '/acme/one/': repoTarball(NODE()),
    '/acme/same/': repoTarball(NODE()), // identical content, different repository
    '/acme/other/': repoTarball(NODE({ 'package.json': JSON.stringify({ name: 'b', engines: { node: '>=10' }, dependencies: { lodash: '4.17.15', express: '4.16.0' } }) }))
  };
  beforeAll(() => {
    process.env.METAMORPH_TOKEN_SECRET = SECRET;
    process.env.METAMORPH_AUTH = 'off';
    off = installOfflineFetch({
      osvFixed: '4.17.21',
      extra: (url) => {
        if (url.hostname !== 'codeload.github.com') return undefined;
        const key = Object.keys(tars).find((k) => url.pathname.startsWith(k));
        return key ? new Response(tars[key], { status: 200 }) : new Response('nope', { status: 404 });
      }
    });
  });
  afterAll(() => {
    off.restore();
    for (const [k, v] of [['METAMORPH_TOKEN_SECRET', saved.s], ['METAMORPH_AUTH', saved.a]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  const { ctx } = loggedCtx();
  const preview = async (repo: string, stage: string) => (await new PlanningTools().previewChanges({ repo_url: `https://github.com/acme/${repo}`, stage }, ctx)) as { approvalToken?: string; planHash?: string; patchHash?: string };
  const apply = (repo: string, stage: string, token: string) => new PlanningTools().applyStage({ repo_url: `https://github.com/acme/${repo}`, stage, approval_token: token }, ctx);

  it('the token from preview applies to the same stage of the same repository', async () => {
    const p = await preview('one', 'upgrade-runtime');
    expect(p.approvalToken).toBeTruthy();
    expect(await apply('one', 'upgrade-runtime', p.approvalToken as string)).toMatchObject({ applied: true });
  });
  it('a token for one stage is refused on another stage of the same repository', async () => {
    const a = await preview('one', 'upgrade-runtime');
    await expect(apply('one', 'patch-dependencies', a.approvalToken as string)).rejects.toThrow(/changed since the preview|Invalid approval token/);
    await expect(apply('one', 'remove-committed-env', a.approvalToken as string)).rejects.toThrow(/changed since the preview|Invalid approval token/);
    await expect(apply('one', 'add-packaging', a.approvalToken as string)).rejects.toThrow(/changed since the preview|Invalid approval token/);
  });
  it('a token for a repository with different content is refused (the token binds the plan and the exact patch)', async () => {
    const a = await preview('one', 'upgrade-runtime');
    await expect(apply('other', 'upgrade-runtime', a.approvalToken as string)).rejects.toThrow(/changed since the preview/);
  });
  it('by design a token also fits another repository with byte-identical content (the write key is the authority, apply returns text only)', async () => {
    const a = await preview('one', 'upgrade-runtime');
    expect(await apply('same', 'upgrade-runtime', a.approvalToken as string)).toMatchObject({ applied: true });
  });
  it('a token minted for another secret, or expired, or for other hashes, is refused', async () => {
    const p = await preview('one', 'upgrade-runtime');
    const hashes = { planHash: p.planHash as string, patchHash: p.patchHash as string, stage: 2 };
    const wrongSecret = signApprovalToken(hashes, OTHER);
    const expired = signApprovalToken(hashes, SECRET, 1000);
    const wrongHashes = signApprovalToken({ ...hashes, patchHash: canonicalHash('x') }, SECRET);
    await expect(apply('one', 'upgrade-runtime', wrongSecret)).rejects.toThrow(/Invalid approval token/);
    await expect(apply('one', 'upgrade-runtime', expired)).rejects.toThrow(/expired/);
    await expect(apply('one', 'upgrade-runtime', wrongHashes)).rejects.toThrow(/changed since the preview/);
  });
  it('a correctly formed token for the right hashes and stage number, signed with the real secret, is the only thing that passes (control)', async () => {
    const p = await preview('one', 'upgrade-runtime');
    const stageIndex = ((await new PlanningTools().planModernization({ repo_url: 'https://github.com/acme/one' }, ctx)) as { stages: Array<{ id: string; index: number }> }).stages.find((s) => s.id === 'upgrade-runtime')!.index;
    const token = signApprovalToken({ planHash: p.planHash as string, patchHash: p.patchHash as string, stage: stageIndex }, SECRET);
    expect(await apply('one', 'upgrade-runtime', token)).toMatchObject({ applied: true });
  });
  it('without a configured secret preview issues no token and apply refuses everything', async () => {
    const keep = process.env.METAMORPH_TOKEN_SECRET;
    delete process.env.METAMORPH_TOKEN_SECRET;
    try {
      const p = await preview('one', 'upgrade-runtime');
      expect(p.approvalToken).toBeUndefined();
      await expect(apply('one', 'upgrade-runtime', signApprovalToken(claim, SECRET))).rejects.toThrow(/not configured|METAMORPH_TOKEN_SECRET/);
    } finally {
      process.env.METAMORPH_TOKEN_SECRET = keep;
    }
  });
});

describe('download tokens: forgery, expiry, reuse across files', () => {
  const id = 'a'.repeat(24);
  const good = signDownloadToken({ id, ext: 'pdf', kid: KID }, SECRET, NOW);
  it('valid for exactly its id and extension', () => {
    expect(verifyDownloadToken(good, { id, ext: 'pdf' }, SECRET, NOW).ok).toBe(true);
  });
  it('is refused for another extension (pdf token on the sarif and sbom files)', () => {
    for (const ext of ['sarif', 'cdx.json', 'PDF', 'pdf ', 'pdf.', '.pdf']) expect(verifyDownloadToken(good, { id, ext }, SECRET, NOW)).toMatchObject({ ok: false, reason: 'mismatch' });
  });
  it('is refused for another report id', () => {
    for (const other of ['b'.repeat(24), 'a'.repeat(23), 'A'.repeat(24), `${id}x`, '']) expect(verifyDownloadToken(good, { id: other, ext: 'pdf' }, SECRET, NOW)).toMatchObject({ ok: false, reason: 'mismatch' });
  });
  it('expires at its ttl and the ttl cannot be raised above an hour', () => {
    expect(verifyDownloadToken(good, { id, ext: 'pdf' }, SECRET, NOW + 599).ok).toBe(true);
    expect(verifyDownloadToken(good, { id, ext: 'pdf' }, SECRET, NOW + 600)).toMatchObject({ ok: false, reason: 'expired' });
    expect(() => signDownloadToken({ id, ext: 'pdf', kid: KID, ttlSeconds: 3601 }, SECRET, NOW)).toThrow();
    expect(() => signDownloadToken({ id, ext: 'pdf', kid: KID, ttlSeconds: -5 }, SECRET, NOW)).toThrow();
  });
  it('tampering with any part is refused', () => {
    const [part, sig] = good.split('.');
    const p = JSON.parse(Buffer.from(part, 'base64url').toString());
    for (const edit of [{ exp: p.exp + 10 ** 6 }, { id: 'b'.repeat(24) }, { ext: 'sarif' }, { v: 1 }, { kid: 'ffffffffffff' }]) {
      expect(verifyDownloadToken(`${b64({ ...p, ...edit })}.${sig}`, { id: edit.id ?? id, ext: edit.ext ?? 'pdf' }, SECRET, NOW).ok).toBe(false);
    }
    expect(verifyDownloadToken(`${part}.${sig.slice(0, -2)}`, { id, ext: 'pdf' }, SECRET, NOW).ok).toBe(false);
    expect(verifyDownloadToken(good, { id, ext: 'pdf' }, OTHER, NOW)).toMatchObject({ ok: false, reason: 'bad_signature' });
  });
  it('odd inputs are malformed and never throw', () => {
    for (const t of [undefined, null, 5, {}, ['a.b'], '', '.', 'a.b.c', 'x'.repeat(100_000), `${good}\n`, `${good}\u0000`]) {
      expect(() => verifyDownloadToken(t, { id, ext: 'pdf' }, SECRET, NOW)).not.toThrow();
      expect(verifyDownloadToken(t, { id, ext: 'pdf' }, SECRET, NOW).ok).toBe(false);
    }
  });
  it('a short secret is a configuration error', () => {
    expect(() => signDownloadToken({ id, ext: 'pdf', kid: KID }, 'short', NOW)).toThrow();
    expect(() => verifyDownloadToken(good, { id, ext: 'pdf' }, 'short', NOW)).toThrow();
  });
});

describe('domain separation between approval and download tokens (same secret)', () => {
  const id = 'c'.repeat(24);
  const approval = signApprovalToken(claim, SECRET, NOW);
  const download = signDownloadToken({ id, ext: 'pdf', kid: KID }, SECRET, NOW);

  it('an approval token is not a download token and a download token is not an approval token', () => {
    expect(verifyDownloadToken(approval, { id, ext: 'pdf' }, SECRET, NOW)).toMatchObject({ ok: false, reason: 'bad_signature' });
    expect(verifyApprovalToken(download, claim, SECRET, NOW)).toMatchObject({ ok: false, reason: 'bad_signature' });
  });
  it('re-labelling the payload of one type as the other does not help', () => {
    const [ap] = approval.split('.');
    const [dp] = download.split('.');
    expect(verifyDownloadToken(`${dp}.${approval.split('.')[1]}`, { id, ext: 'pdf' }, SECRET, NOW).ok).toBe(false);
    expect(verifyApprovalToken(`${ap}.${download.split('.')[1]}`, claim, SECRET, NOW).ok).toBe(false);
  });
  it('an approval-style signature (no prefix) over a download payload is refused, and the download signature is prefixed', () => {
    const payload = b64({ v: 2, id, ext: 'pdf', kid: KID, exp: NOW + 600 });
    expect(verifyDownloadToken(`${payload}.${hmac(SECRET, payload)}`, { id, ext: 'pdf' }, SECRET, NOW).ok).toBe(false);
    expect(verifyDownloadToken(`${payload}.${hmac(SECRET, `metamorph-download.${payload}`)}`, { id, ext: 'pdf' }, SECRET, NOW).ok).toBe(true);
  });
  it('the approval signer cannot be used as an oracle for download signatures: its signed text is base64url, which cannot contain the "." prefix', () => {
    // preview_changes signs base64url(JSON). A download signature is over "metamorph-download." + part. The first
    // string can never start with that prefix because "." is outside the base64url alphabet.
    expect(approval.split('.')[0].startsWith('metamorph-download.')).toBe(false);
    expect(/^[A-Za-z0-9_-]+$/.test(approval.split('.')[0])).toBe(true);
  });
});

describe('report download route: tokens at the HTTP edge', () => {
  const id = 'd'.repeat(24);
  const cache = new ReportCache();
  cache.put(id, [
    { format: 'pdf', mimeType: 'application/pdf', data: Buffer.from('%PDF-1.7 test') },
    { format: 'sarif', mimeType: 'application/sarif+json', data: Buffer.from('{"version":"2.1.0"}') }
  ], KID);
  const idB = 'e'.repeat(24);
  const KID_B = 'b2c3d4e5f6a1';
  cache.put(idB, [{ format: 'pdf', mimeType: 'application/pdf', data: Buffer.from('%PDF-1.7 key B') }], KID_B);
  const call = (file: string, query: Record<string, unknown>, now = NOW) => {
    const out = { code: 0, body: '' as string | Buffer, headers: {} as Record<string, string | number> };
    const res: Res = {
      status(c) {
        out.code = c;
        return res;
      },
      setHeader(n, v) {
        out.headers[n.toLowerCase()] = v;
      },
      send(b) {
        out.body = b;
      }
    };
    handleReportDownload({ params: { file }, query }, res, { cache, secret: SECRET, now: () => now });
    return out;
  };
  const pdfToken = signDownloadToken({ id, ext: 'pdf', kid: KID }, SECRET, NOW);

  it('serves the file for its own token', () => {
    const r = call(`${id}.pdf`, { t: pdfToken });
    expect(r.code).toBe(200);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['cache-control']).toBe('no-store');
  });
  it('refuses the same token on a different extension, id, with a repeated or array parameter, or none', () => {
    expect(call(`${id}.sarif`, { t: pdfToken }).code).toBe(403);
    expect(call(`${'e'.repeat(24)}.pdf`, { t: pdfToken }).code).toBe(403);
    expect(call(`${id}.pdf`, { t: [pdfToken, pdfToken] }).code).toBe(403);
    expect(call(`${id}.pdf`, { t: { toString: () => pdfToken } }).code).toBe(403);
    expect(call(`${id}.pdf`, {}).code).toBe(403);
    expect(call(`${id}.pdf`, { t: '' }).code).toBe(403);
  });
  it('a link issued for key A is refused for a report owned by key B, with the same message as a bad signature', () => {
    const forKeyA = signDownloadToken({ id: idB, ext: 'pdf', kid: KID }, SECRET, NOW); // validly signed, but the entry belongs to B
    const wrongOwner = call(`${idB}.pdf`, { t: forKeyA });
    const badSig = call(`${idB}.pdf`, { t: `${forKeyA.split('.')[0]}.${'A'.repeat(43)}` });
    expect(wrongOwner.code).toBe(403);
    expect(String(wrongOwner.body)).not.toContain('%PDF');
    expect({ code: wrongOwner.code, body: wrongOwner.body }).toEqual({ code: badSig.code, body: badSig.body });
    expect(call(`${idB}.pdf`, { t: signDownloadToken({ id: idB, ext: 'pdf', kid: KID_B }, SECRET, NOW) }).code).toBe(200);
  });
  it('a token without a kid, with a malformed kid, or in the old v1 shape is refused', () => {
    for (const body of [{ v: 2, id, ext: 'pdf', exp: NOW + 600 }, { v: 2, id, ext: 'pdf', kid: 'ABC', exp: NOW + 600 }, { v: 2, id, ext: 'pdf', kid: 'x'.repeat(13), exp: NOW + 600 }, { v: 1, id, ext: 'pdf', exp: NOW + 600 }]) {
      const part = b64(body);
      expect(verifyDownloadToken(`${part}.${createHmac('sha256', SECRET).update(`metamorph-download.${part}`).digest('base64url')}`, { id, ext: 'pdf' }, SECRET, NOW)).toMatchObject({ ok: false, reason: 'malformed' });
    }
    expect(() => signDownloadToken({ id, ext: 'pdf', kid: 'NOT VALID' }, SECRET, NOW)).toThrow();
  });
  it('refuses an approval token and an expired token', () => {
    expect(call(`${id}.pdf`, { t: signApprovalToken(claim, SECRET, NOW) }).code).toBe(403);
    expect(call(`${id}.pdf`, { t: pdfToken }, NOW + 601).code).toBe(403);
  });
  it('file names that are not <24 hex>.<ext> never reach the token check or the cache (no traversal, no listing)', () => {
    for (const f of ['../etc/passwd', `${id}.pdf/../x`, `${id}.PDF`, `${id}.pdf.exe`, `${id}`, '', 'index', '%2e%2e%2fetc', `${id}.cdx.json.bak`, `${'g'.repeat(24)}.pdf`]) {
      expect(call(f, { t: pdfToken }).code, f).toBe(404);
    }
  });
  it('without a valid secret the route answers 503 and serves nothing', () => {
    const res = { code: 0, body: '' as string | Buffer };
    const r: Res = { status: (c) => ((res.code = c), r), setHeader: () => undefined, send: (b) => void (res.body = b) };
    handleReportDownload({ params: { file: `${id}.pdf` }, query: { t: pdfToken } }, r, { cache, secret: 'short', now: () => NOW });
    expect(res.code).toBe(503);
    expect(String(res.body)).not.toContain('%PDF');
  });
});
