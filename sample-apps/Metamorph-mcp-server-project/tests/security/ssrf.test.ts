import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveUrl, fetchArchive, parseGithubRepo } from '../../src/common/safe-archive.js';
import { isAllowedHost } from '../../src/modules/verify/github-runner.js';
import { AssessmentTools } from '../../src/modules/assessment/assessment.tools.js';
import { PlanningTools } from '../../src/modules/planning/planning.tools.js';
import { ReportTools } from '../../src/modules/report/report.tools.js';
import { installOfflineFetch, loggedCtx, repoTarball, type Offline } from '../helpers/offline.js';

// SSRF through repo_url (the only caller-supplied location in any tool), redirects, and a guard on new outbound hosts.
// Property used throughout: whatever a caller sends, the only host this server may fetch a repository from is
// codeload.github.com, over https, with no userinfo and no port.

const MUST_REJECT: Array<[string, string]> = [
  ['userinfo (user and password)', 'https://user:pass@github.com/o/r'],
  ['userinfo (token only)', 'https://ghp_abcdefghijklmnopqrstuvwxyz0123456789@github.com/o/r'],
  ['userinfo that hides the real host', 'https://github.com@evil.example/o/r'],
  ['userinfo with encoded at sign', 'https://github.com%40evil.example/o/r'],
  ['non-default port', 'https://github.com:8443/o/r'],
  ['port 80', 'https://github.com:80/o/r'],
  ['http scheme', 'http://github.com/o/r'],
  ['uppercase scheme to http', 'HTTP://github.com/o/r'],
  ['other host', 'https://gitlab.com/o/r'],
  ['suffix trick', 'https://github.com.evil.example/o/r'],
  ['prefix trick', 'https://evilgithub.com/o/r'],
  ['path trick', 'https://evil.example/github.com/o/r'],
  ['subdomain www', 'https://www.github.com/o/r'],
  ['gist host', 'https://gist.github.com/o/r'],
  ['codeload host given directly', 'https://codeload.github.com/o/r/tar.gz/main'],
  ['raw host', 'https://raw.githubusercontent.com/o/r/main/x'],
  ['api host', 'https://api.github.com/repos/o/r'],
  ['trailing dot host', 'https://github.com./o/r'],
  ['IPv4 literal', 'https://140.82.112.3/o/r'],
  ['loopback literal', 'https://127.0.0.1/o/r'],
  ['loopback decimal', 'https://2130706433/o/r'],
  ['loopback hex', 'https://0x7f000001/o/r'],
  ['loopback octal', 'https://0177.0.0.1/o/r'],
  ['IPv6 loopback', 'https://[::1]/o/r'],
  ['IPv6 mapped', 'https://[::ffff:127.0.0.1]/o/r'],
  ['localhost', 'https://localhost/o/r'],
  ['cloud metadata address', 'https://169.254.169.254/latest/meta-data/'],
  ['cloud metadata hostname', 'https://metadata.google.internal/computeMetadata/v1/'],
  ['cyrillic lookalike (i)', 'https://gіthub.com/o/r'],
  ['cyrillic lookalike (a)', 'https://github.cоm/o/r'],
  ['greek lookalike', 'https://githυb.com/o/r'],
  ['punycode lookalike', 'https://xn--gthub-5ve.com/o/r'],
  ['ssh git@ form', 'git@github.com:o/r.git'],
  ['ssh url form', 'ssh://git@github.com/o/r.git'],
  ['git scheme', 'git://github.com/o/r'],
  ['file scheme', 'file:///etc/passwd'],
  ['ftp scheme', 'ftp://github.com/o/r'],
  ['javascript scheme', 'javascript:alert(1)'],
  ['data scheme', 'data:text/plain,hello'],
  ['scheme-relative', '//github.com/o/r'],
  ['no scheme', 'github.com/o/r'],
  ['owner/repo shorthand', 'o/r'],
  ['empty', ''],
  ['only whitespace', '   '],
  ['leading space', ' https://github.com/o/r'],
  ['trailing newline', 'https://github.com/o/r\n'],
  ['embedded newline', 'https://github.com/o/r\nhttps://evil.example/'],
  ['embedded tab', 'https://github.com/o\t/r'],
  ['NUL byte', 'https://github.com/o/r\u0000.evil'],
  ['backslash host trick', 'https://evil.example\\@github.com/o/r'],
  ['backslash path', 'https://github.com/o\\..\\r'],
  ['query string', 'https://github.com/o/r?redirect=https://evil.example'],
  ['fragment', 'https://github.com/o/r#https://evil.example'],
  ['missing repo', 'https://github.com/o'],
  ['empty owner', 'https://github.com//r'],
  ['dot owner', 'https://github.com/./r'],
  ['dot-dot owner', 'https://github.com/../r'],
  ['dot-dot repo', 'https://github.com/o/..'],
  ['non-tree subpath (blob)', 'https://github.com/o/r/blob/main/x'],
  ['non-tree subpath (pull)', 'https://github.com/o/r/pull/1'],
  ['non-tree subpath (archive)', 'https://github.com/o/r/archive/main.tar.gz'],
  ['tree without a ref', 'https://github.com/o/r/tree'],
  ['ref traversal', 'https://github.com/o/r/tree/../..'],
  ['ref traversal after branch', 'https://github.com/o/r/tree/main/../../x'],
  ['ref traversal at the end', 'https://github.com/o/r/tree/main/..'],
  ['ref traversal with encoded dots and slash', 'https://github.com/o/r/tree/main%2f..%2f..%2fetc'],
  ['ref with encoded slash only', 'https://github.com/o/r/tree/a%2fb'],
  ['ref with encoded percent', 'https://github.com/o/r/tree/%252e%252e'],
  ['ref with a question mark in it', 'https://github.com/o/r/tree/a?b'],
  ['ref with colon', 'https://github.com/o/r/tree/a:b'],
  ['ref with tilde', 'https://github.com/o/r/tree/a~1'],
  ['ref with caret', 'https://github.com/o/r/tree/a^'],
  ['ref with space (encoded)', 'https://github.com/o/r/tree/a%20b'],
  ['over-long ref', 'https://github.com/o/r/tree/' + 'a'.repeat(300)],
  ['over-long url', 'https://github.com/o/r/tree/' + 'a/'.repeat(300)],
  ['owner with unicode', 'https://github.com/ö/r'],
  ['repo with special characters', 'https://github.com/o/r;rm'],
  ['repo with encoded special characters', 'https://github.com/o/r%3Brm']
];

describe('repo_url: hostile inputs are rejected', () => {
  for (const [label, input] of MUST_REJECT) {
    it(`${label}`, () => {
      expect(() => parseGithubRepo(input)).toThrow(/invalid GitHub repository URL/);
    });
  }
  it('non-string inputs are rejected without throwing anything but the expected error', () => {
    for (const v of [undefined, null, 5, {}, [], ['https://github.com/o/r'], Symbol.iterator as unknown as string]) {
      expect(() => parseGithubRepo(v as unknown as string)).toThrow(/invalid GitHub repository URL/);
    }
  });
});

describe('repo_url: anything that parses can only ever lead to codeload.github.com', () => {
  const ODD_BUT_PARSEABLE = [
    'https://github.com/o/r',
    'https://GITHUB.COM/o/r',
    'https://github.com:443/o/r',
    'https://github.com/o/r/',
    'https://github.com/o/r.git',
    'https://ｇｉｔｈｕｂ.com/o/r', // full-width letters: the URL parser maps them to ascii github.com
    'https://github.com/o/r/tree/main',
    'https://github.com/o/r/tree/feature/a-b_c.d',
    'https://github.com/o/r/tree/main/%2e%2e', // normalised by the URL parser before our checks
    'https://github.com/o/r/tree/main/%2e%2e/%2e%2e',
    'https://github.com/o/r/tree/main/%2E%2E/x',
    'https://github.com/o/r/tree/..%2f..%2fetc',
    'https:/github.com/o/r',
    'https:github.com/o/r'
  ];
  for (const input of ODD_BUT_PARSEABLE) {
    it(`${JSON.stringify(input)} is rejected, or yields a codeload URL with clean parts`, () => {
      let parsed: ReturnType<typeof parseGithubRepo>;
      try {
        parsed = parseGithubRepo(input);
      } catch {
        return; // rejected is always acceptable
      }
      const url = new URL(archiveUrl(parsed.owner, parsed.repo, parsed.ref));
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('codeload.github.com');
      expect(url.username + url.password + url.port + url.search + url.hash).toBe('');
      expect(url.pathname.split('/').some((s) => s === '..' || s === '.')).toBe(false);
      expect(/^[A-Za-z0-9_.-]+$/.test(parsed.owner) && /^[A-Za-z0-9_.-]+$/.test(parsed.repo)).toBe(true);
      if (parsed.ref !== undefined) expect(/^[A-Za-z0-9._/-]+$/.test(parsed.ref) && !parsed.ref.includes('..')).toBe(true);
    });
  }

  it('archiveUrl refuses hostile parts even when called directly', () => {
    expect(() => archiveUrl('..', 'r')).toThrow();
    expect(() => archiveUrl('o', 'r/../x')).toThrow();
    expect(() => archiveUrl('o@evil', 'r')).toThrow();
    expect(() => archiveUrl('o', 'r', '../../etc')).toThrow();
    expect(() => archiveUrl('o', 'r', 'main?x=1')).toThrow();
    expect(() => archiveUrl('o', 'r', 'main#x')).toThrow();
    expect(() => archiveUrl('o', 'r', '')).toThrow(); // an empty ref is not "no ref"
  });
});

describe('redirects off the allowed host', () => {
  const body = () => new Response(repoTarball({ 'a.txt': 'x' }), { status: 200 });
  const redirectTo = (location: string) => {
    const calls: string[] = [];
    const fetchFn = (async (u: string | URL) => {
      calls.push(String(u));
      return calls.length === 1 ? new Response(null, { status: 302, headers: { location } }) : body();
    }) as unknown as typeof fetch;
    return { calls, fetchFn };
  };
  const OFF_HOST = [
    'https://evil.example/x',
    'http://codeload.github.com/o/r/tar.gz/main',
    'https://codeload.github.com.evil.example/o/r',
    'https://codeload.github.com@evil.example/o/r',
    'https://user:pw@codeload.github.com/o/r',
    'https://codeload.github.com:8443/o/r',
    'https://127.0.0.1/o/r',
    'https://169.254.169.254/latest/meta-data/',
    'https://[::1]/o/r',
    'https://github.com/o/r',
    'https://objects.githubusercontent.com/x',
    'file:///etc/passwd',
    'ftp://codeload.github.com/o/r',
    '//evil.example/x',
  ];
  for (const location of OFF_HOST) {
    it(`does not follow a redirect to ${location}`, async () => {
      const { calls, fetchFn } = redirectTo(location);
      await expect(fetchArchive('https://codeload.github.com/o/r/tar.gz/HEAD', { fetchFn })).rejects.toThrow();
      expect(calls).toEqual(['https://codeload.github.com/o/r/tar.gz/HEAD']); // the second hop was never requested
    });
  }
  it('follows a redirect that stays on the allowed host (relative and absolute)', async () => {
    for (const loc of ['/o/r/tar.gz/abc', 'https://codeload.github.com/o/r/tar.gz/abc', 'https://CODELOAD.GITHUB.COM/o/r/tar.gz/abc']) {
      const { calls, fetchFn } = redirectTo(loc);
      await fetchArchive('https://codeload.github.com/o/r/tar.gz/HEAD', { fetchFn });
      expect(calls).toHaveLength(2);
      expect(new URL(calls[1]).hostname).toBe('codeload.github.com');
    }
  });
  it('fetchArchive refuses a non-allowed start URL before any request', async () => {
    let called = false;
    const fetchFn = (async () => ((called = true), body())) as unknown as typeof fetch;
    for (const u of ['https://evil.example/x', 'http://codeload.github.com/x', 'https://codeload.github.com:444/x', 'https://u@codeload.github.com/x', 'not a url']) {
      await expect(fetchArchive(u, { fetchFn })).rejects.toThrow();
    }
    expect(called).toBe(false);
  });
  it('asks for redirects to be handled by us (redirect: manual), never by fetch', async () => {
    let seen: RequestInit | undefined;
    const fetchFn = (async (_u: string | URL, init?: RequestInit) => ((seen = init), body())) as unknown as typeof fetch;
    await fetchArchive('https://codeload.github.com/o/r/tar.gz/HEAD', { fetchFn });
    expect(seen?.redirect).toBe('manual');
  });
});

describe('through the real tools: no request leaves for a hostile repo_url', () => {
  let off: Offline;
  afterEach(() => off?.restore());
  const HOSTILE = ['https://169.254.169.254/latest/meta-data', 'https://user:pw@github.com/o/r', 'git@github.com:o/r.git', 'https://github.com/o/r/tree/../../etc', 'https://localhost:3001/o/r'];
  it('assess_project, plan_modernization, preview_changes, apply_stage and generate_report refuse before any network call', async () => {
    off = installOfflineFetch({ tarball: repoTarball({ 'package.json': '{}' }) });
    const { ctx } = loggedCtx();
    (ctx as unknown as { auth: unknown }).auth = { subject: 'k', scopes: ['write'], claims: { keyId: '0123456789ab' } }; // generate_report needs a key id when auth is on
    for (const repo_url of HOSTILE) {
      await expect(new AssessmentTools().assessProject({ repo_url }, ctx)).rejects.toThrow(/Invalid repository URL/);
      await expect(new PlanningTools().planModernization({ repo_url }, ctx)).rejects.toThrow(/Invalid repository URL/);
      await expect(new PlanningTools().previewChanges({ repo_url, stage: 'patch-dependencies' }, ctx)).rejects.toThrow(/Invalid repository URL/);
      await expect(new PlanningTools().applyStage({ repo_url, stage: 'patch-dependencies', approval_token: 'x'.repeat(30) }, ctx)).rejects.toThrow(/Invalid repository URL/);
      await expect(new ReportTools().generateReport({ repo_url }, ctx)).rejects.toThrow(/Invalid repository URL/);
    }
    expect(off.urls).toEqual([]);
  });
  it('the error text echoes none of the hostile input (no reflection of attacker text)', async () => {
    off = installOfflineFetch({});
    const { ctx } = loggedCtx();
    const err = await new AssessmentTools().assessProject({ repo_url: 'https://evil.example/<script>alert(1)</script>' }, ctx).catch((e: Error) => e);
    expect((err as Error).message).not.toContain('evil.example');
    expect((err as Error).message).not.toContain('<script>');
  });
  it('a valid repo reaches codeload.github.com and nothing else on the repository path', async () => {
    off = installOfflineFetch({ tarball: repoTarball({ 'package.json': '{"name":"x"}' }) });
    const { ctx } = loggedCtx();
    await new AssessmentTools().assessProject({ repo_url: 'https://GitHub.com/o/r/tree/main' }, ctx);
    const codeload = off.urls.filter((u) => new URL(u).hostname === 'codeload.github.com');
    expect(codeload).toEqual(['https://codeload.github.com/o/r/tar.gz/main']);
    // the other hosts are the fixed public data sources, never anything derived from the caller
    for (const h of off.hosts()) expect(['codeload.github.com', 'api.osv.dev', 'endoflife.date', 'www.cisa.gov', 'api.first.org'].includes(h), h).toBe(true);
  });
});

describe('runner artifact download hosts (GitHub API redirect target)', () => {
  const ok = ['https://api.github.com/x', 'https://productionresultssa1.blob.core.windows.net/a', 'https://results-receiver.actions.githubusercontent.com/x', 'https://pipelines.actions.githubusercontent.com/x', 'https://abc.actions.githubusercontent.com/x'];
  const bad = [
    'http://api.github.com/x',
    'https://api.github.com:8443/x',
    'https://u:p@api.github.com/x',
    'https://evil.blob.core.windows.net.attacker.example/x',
    'https://a.b.blob.core.windows.net/x',
    'https://blob.core.windows.net/x',
    'https://evil.example/x?host=api.github.com',
    'https://api.github.com.evil.example/x',
    'https://x.actions.githubusercontent.com.evil.example/x',
    'https://a.b.actions.githubusercontent.com/x',
    'https://127.0.0.1/x',
    'https://localhost/x',
    'https://github.com/x'
  ];
  for (const u of ok) it(`allows ${u}`, () => expect(isAllowedHost(new URL(u))).toBe(true));
  for (const u of bad) it(`refuses ${u}`, () => expect(isAllowedHost(new URL(u))).toBe(false));
});

describe('no other caller-controlled location, no new outbound host', () => {
  const root = fileURLToPath(new URL('../../src/', import.meta.url));
  const tsFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      if (n === 'widgets' || n === 'node_modules') return [];
      return statSync(p).isDirectory() ? tsFiles(p) : p.endsWith('.ts') ? [p] : [];
    });
  const files = tsFiles(root);

  it('the only tool input that names a location is repo_url (no webhook, callback, endpoint or host parameter exists)', () => {
    const names = new Set<string>();
    for (const f of files.filter((f) => f.endsWith('.tools.ts'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/^\s+([a-z_]*(?:url|uri|webhook|callback|endpoint|host|link|href|address)[a-z_]*)\s*:\s*z\./gim)) names.add(m[1]);
    }
    expect([...names].sort()).toEqual(['repo_url']);
  });

  it('every literal http(s) host in src is on the reviewed list (a new outbound host must be added here on purpose)', () => {
    const hosts = new Set<string>();
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) hosts.add(m[1].toLowerCase());
    const REVIEWED = [
      'api.first.org', // EPSS
      'api.github.com', // runner (fixed repo from env)
      'api.osv.dev', // OSV
      'aws.amazon.com', // documentation link in a source label (src/modules/cloud/eol-source.ts), never fetched
      'docs.aws.amazon.com', // documentation link in a source label, never fetched
      'endoflife.date',
      'github.com', // links and parsing only
      'google.github.io', // doc link in the report
      'json.schemastore.org', // SARIF schema id
      'localhost', // loopback address shown for local runs and used by the dashboard proxy to reach its own /mcp, never a caller-controlled target
      'metamorph.example.com', // example in comments
      'nodejs.org',
      'owasp.org', // doc links in the report
      'raw.githubusercontent.com', // doc or schema links, never fetched
      'www.cisa.gov',
      'www.php.net'
    ];
    expect([...hosts].sort()).toEqual(REVIEWED);
  });
});
