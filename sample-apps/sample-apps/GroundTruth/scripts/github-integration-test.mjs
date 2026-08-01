/**
 * Integration test for the GitHub verification path.
 *
 * crosscheck_activity is the one tool the whole product depends on, and it is
 * the hardest to test: hitting the real API needs a token, a live repo, and
 * commits made on the right day. So this stands up a local HTTP server that
 * speaks GitHub's REST shapes, points the server at it with GITHUB_API_URL, and
 * drives the real fetch path — auth headers, date-window query params, response
 * parsing, claim matching, and verdicts — with no token and no network.
 *
 * Scenarios, each one a case the agent has to tell apart:
 *   1. Claims match real commits and a PR                 -> consistent
 *   2. Claims completion, only an unrelated commit, no PR -> unsupported
 *   3. Genuine non-code work, no commits at all           -> unsupported, but innocent
 *   4. A commit GitHub never linked to any account        -> found via commit email
 *
 * Scenario 4 is a regression guard. GitHub links a commit to a user only when the
 * commit's author email is registered on that account, so a mistyped
 * `git config user.email` makes every commit unlinked — and a login-only lookup
 * then reports "no commits" while the person committed all day.
 *
 * Run `npm run build` first, then `npm run test:github`.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'demo-org/groundtruth';
const TOKEN = 'test-token-not-a-real-credential';

// --- Fixtures, keyed by GitHub login ---------------------------------------

const TODAY = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();
const at = (hhmm) => new Date(`${TODAY}T${hhmm}:00`).toISOString();

/**
 * Commits are returned for the whole day regardless of author, because the
 * client attributes them itself — see commitBelongsTo in github.service.ts.
 * `author` is null when GitHub could not link the commit to an account, which
 * is what happens when the commit email is not registered there.
 */
const ALL_COMMITS = [
  {
    sha: 'aaaaaaa1111111111111111111111111111111111',
    html_url: 'https://example.test/c/aaaaaaa',
    author: { login: 'match-user' },
    commit: {
      message: 'Add digest dashboard widget\n\nlonger body',
      author: { date: at('10:15'), email: 'match@example.test', name: 'Match User' },
    },
  },
  {
    sha: 'bbbbbbb2222222222222222222222222222222222',
    html_url: 'https://example.test/c/bbbbbbb',
    author: { login: 'match-user' },
    commit: {
      message: 'Wire digest widget into the manager view',
      author: { date: at('14:02'), email: 'match@example.test', name: 'Match User' },
    },
  },
  {
    sha: 'ccccccc3333333333333333333333333333333333',
    html_url: 'https://example.test/c/ccccccc',
    author: { login: 'mismatch-user' },
    commit: {
      message: 'Update README with setup notes',
      author: { date: at('17:40'), email: 'mismatch@example.test', name: 'Mismatch User' },
    },
  },
  {
    // GitHub could not link this one — the commit email is not on any account.
    // A login-only lookup misses it entirely; attribution by email must catch it.
    sha: 'ddddddd4444444444444444444444444444444444',
    html_url: 'https://example.test/c/ddddddd',
    author: null,
    commit: {
      message: 'Refactor session handling',
      author: { date: at('11:20'), email: 'typo-address@example.test', name: 'Unlinked Dev' },
    },
  },
  {
    // Belongs to someone else entirely; must never be attributed to our people.
    sha: 'eeeeeee5555555555555555555555555555555555',
    html_url: 'https://example.test/c/eeeeeee',
    author: { login: 'someone-else' },
    commit: {
      message: 'Bump dependency versions',
      author: { date: at('09:05'), email: 'other@example.test', name: 'Someone Else' },
    },
  },
];

const PULLS = [
  {
    number: 12,
    title: 'Digest dashboard widget',
    state: 'open',
    merged_at: null,
    created_at: at('14:30'),
    updated_at: at('14:30'),
    html_url: 'https://example.test/pr/12',
    user: { login: 'match-user' },
  },
  {
    // Opened days ago by someone else — must not be attributed to our people.
    number: 9,
    title: 'Unrelated infra change',
    state: 'closed',
    merged_at: null,
    created_at: '2020-01-01T09:00:00.000Z',
    updated_at: '2020-01-02T09:00:00.000Z',
    html_url: 'https://example.test/pr/9',
    user: { login: 'someone-else' },
  },
];

// --- Mock GitHub -----------------------------------------------------------

const seen = { authHeaders: [], commitQueries: [] };

const gh = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  seen.authHeaders.push(req.headers.authorization ?? '(none)');

  const json = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  if (url.pathname === '/rate_limit') {
    return json(200, { resources: { core: { remaining: 4999, limit: 5000 } } });
  }

  const commitMatch = url.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/commits$/);
  if (commitMatch) {
    seen.commitQueries.push({
      author: url.searchParams.get('author'),
      since: url.searchParams.get('since'),
      until: url.searchParams.get('until'),
    });
    return json(200, ALL_COMMITS);
  }

  if (/^\/repos\/[^/]+\/[^/]+\/pulls$/.test(url.pathname)) {
    return json(200, PULLS);
  }

  return json(404, { message: `unexpected path ${url.pathname}` });
});

await new Promise((resolve) => gh.listen(0, '127.0.0.1', resolve));
const ghPort = gh.address().port;
const GITHUB_API_URL = `http://127.0.0.1:${ghPort}`;

// --- MCP client over stdio -------------------------------------------------

const child = spawn('node', ['dist/index.js'], {
  cwd: PROJECT,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'development',
    MCP_TRANSPORT_TYPE: 'stdio',
    GITHUB_API_URL,
    GITHUB_TOKEN: TOKEN,
    GITHUB_ORG: 'demo-org',
    GITHUB_REPOS: REPO,
  },
});

let buf = '';
const pending = new Map();
let nextId = 1;

child.stdout.on('data', (chunk) => {
  buf += chunk.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg);
      pending.delete(msg.id);
    }
  }
});
const stderrLines = [];
child.stderr.on('data', (d) => stderrLines.push(d.toString()));

function send(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); }
    }, 30000);
  });
}
const notify = (method, params) =>
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function toolJson(res) {
  const text = res?.result?.content?.find((c) => c.type === 'text')?.text;
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function submitAndCheck({ employeeId, login, email, reportText, confidence }) {
  await send('tools/call', {
    name: 'set_employee_github',
    arguments: { employeeId, githubUsername: login, githubEmail: email },
  });
  await send('tools/call', {
    name: 'submit_eod_report',
    arguments: { employeeId, reportText, confidence },
  });
  return toolJson(
    await send('tools/call', {
      name: 'crosscheck_activity',
      arguments: { employeeId },
    }),
  );
}

try {
  const init = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'github-integration', version: '1.0.0' },
  });
  check('server starts against mock GitHub', !!init.result, init.result?.serverInfo?.name);
  notify('notifications/initialized', {});

  await send('tools/call', { name: 'reset_demo_data', arguments: { resetRoster: true } });

  // --- Scenario 1: claims supported by real commits and a PR ---
  const consistent = await submitAndCheck({
    employeeId: 'emp-2',
    login: 'match-user',
    email: 'match@example.test',
    reportText: 'Completed the digest dashboard widget and opened a PR for review.',
    confidence: 5,
  });

  check('fetches commits through the real HTTP path',
    consistent?.commits?.length === 2,
    `${consistent?.commits?.length} commit(s)`);
  check('shortens sha and takes first message line',
    consistent?.commits?.[0]?.sha?.length === 7
      && !consistent?.commits?.[0]?.message?.includes('longer body'),
    `${consistent?.commits?.[0]?.sha} "${consistent?.commits?.[0]?.message}"`);
  check('attributes only that user\'s PRs',
    consistent?.pullRequests?.length === 1 && consistent?.pullRequests?.[0]?.number === 12,
    `${consistent?.pullRequests?.length} PR(s)`);
  check('supported claim scores as consistent',
    consistent?.verdict === 'consistent' && consistent?.matchScore >= 0.7,
    `verdict=${consistent?.verdict} score=${consistent?.matchScore}`);

  // --- Scenario 2: claims completion, unrelated commit, no PR ---
  const mismatch = await submitAndCheck({
    employeeId: 'emp-1',
    login: 'mismatch-user',
    email: 'mismatch@example.test',
    reportText: 'Finished the login module and wired up session handling.',
    confidence: 4,
  });

  check('unsupported completion claim is caught',
    mismatch?.verdict === 'unsupported' && mismatch?.matchScore === 0,
    `verdict=${mismatch?.verdict} score=${mismatch?.matchScore}`);
  check('flags the missing PR in observations',
    mismatch?.observations?.some((o) => /no pull request/i.test(o)),
    mismatch?.observations?.find((o) => /no pull request/i.test(o))?.slice(0, 60));
  check('names the specific unsupported claim',
    mismatch?.observations?.some((o) => /login module/i.test(o)));
  check('attributes only that person’s commits, not the whole day',
    mismatch?.commits?.length === 1 && /README/.test(mismatch.commits[0].message),
    `${mismatch?.commits?.length} of 5 day commits — "${mismatch?.commits?.[0]?.message}"`);

  // --- Scenario 3: real work that leaves no commits ---
  const nocode = await submitAndCheck({
    employeeId: 'emp-3',
    login: 'nocode-user',
    email: 'nocode@example.test',
    reportText: 'Spent today reviewing PRs and pairing with Divya on the widget layout.',
    confidence: 4,
  });

  check('no-commit day returns zero activity',
    nocode?.commits?.length === 0 && nocode?.pullRequests?.length === 0);
  check('no-commit day reports it plainly rather than accusing',
    nocode?.observations?.some((o) => /No commits or PRs found/i.test(o)),
    nocode?.observations?.[0]?.slice(0, 70));
  check('output tells the agent this is evidence, not a conclusion',
    /not a conclusion/i.test(nocode?.reminder ?? ''));

  // --- Regression: a commit GitHub could not link to any account ---
  // This is the failure that silently broke attribution in real use: a mistyped
  // git config user.email leaves every commit unlinked, and a login-only lookup
  // reports "no commits" while the person committed all day.
  const unlinked = await submitAndCheck({
    employeeId: 'emp-4',
    login: 'never-linked-login',
    email: 'typo-address@example.test',
    reportText: 'Refactored session handling today.',
    confidence: 4,
  });
  check('finds a commit GitHub did not link, via the commit email',
    unlinked?.commits?.length === 1 && /session handling/.test(unlinked.commits[0].message),
    `${unlinked?.commits?.length} commit(s) — "${unlinked?.commits?.[0]?.message}"`);
  check('that claim then reads as supported',
    unlinked?.verdict === 'consistent',
    `verdict=${unlinked?.verdict} score=${unlinked?.matchScore}`);

  // Without the email there is nothing to match on, and the miss must be honest.
  const unlinkedNoEmail = await submitAndCheck({
    employeeId: 'emp-4',
    login: 'never-linked-login',
    email: '',
    reportText: 'Refactored session handling today.',
    confidence: 4,
  });
  check('without a commit email the unlinked commit is honestly not found',
    unlinkedNoEmail?.commits?.length === 0,
    `${unlinkedNoEmail?.commits?.length} commit(s)`);

  // --- The request itself was well formed ---
  check('sent bearer auth on every request',
    seen.authHeaders.length > 0 && seen.authHeaders.every((h) => h === `Bearer ${TOKEN}`),
    `${seen.authHeaders.length} request(s)`);
  const q = seen.commitQueries[0];
  check('scoped the commit query to the day and attributed client-side',
    q?.author === null && !!q?.since && !!q?.until,
    `author=${q?.author} since=${q?.since}`);

  // --- Health check goes green when GitHub answers ---
  const health = await send('resources/read', { uri: 'health://checks' });
  const healthText = health.result?.contents?.[0]?.text ?? '';
  check('github health check reports up with a rate limit',
    /4999/.test(healthText) && /"status":\s*"up"/.test(healthText),
    /reachable/.test(healthText) ? 'reachable' : 'see payload');

  // --- Digest reflects the three verified people ---
  const digest = toolJson(
    await send('tools/call', {
      name: 'generate_daily_digest',
      arguments: { teamId: 'team-platform' },
    }),
  );
  check('digest shows every cross-checked person as verified',
    digest?.summary?.verified === 4 && digest?.summary?.submitted === 4,
    `verified=${digest?.summary?.verified} submitted=${digest?.summary?.submitted}`);
  check('digest ranks the unsupported claim above the clean one',
    digest?.rows?.findIndex((r) => r.employee.id === 'emp-1') <
      digest?.rows?.findIndex((r) => r.employee.id === 'emp-2'),
    digest?.rows?.map((r) => r.employee.name.split(' ')[0]).join(' > '));

} catch (err) {
  check('harness completed', false, err.message);
} finally {
  child.kill();
  gh.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\n--- server stderr (tail) ---');
    console.log(stderrLines.join('').split('\n').slice(-30).join('\n'));
  }
  process.exit(failed.length ? 1 : 0);
}
