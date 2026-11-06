/**
 * @typedef {{ manager: 'npm'|'pnpm'|'yarn'|'bun'|'npx'|'pnpm dlx'|'bunx'|'yarn dlx', name: string, spec?: string, raw: string }} InstallRequest
 * @typedef {{ package: string, version?: string, verdict: 'ALLOW'|'REVIEW'|'BLOCK', summary?: string, findings?: {severity?: string, title: string}[], safeVersion?: {version: string, reason?: string} }} Report
 */

const valueFlags = {
  npm: new Set(['--registry', '--prefix', '--tag', '-w', '--workspace', '--cache', '--userconfig']),
  pnpm: new Set(['--registry', '--tag', '--filter', '-F', '--dir', '-C', '--store-dir', '--config-dir']),
  yarn: new Set(['--registry', '--tag', '--cwd', '--cache-folder', '--modules-folder', '--mutex', '--use-yarnrc']),
  bun: new Set(['--registry', '--tag', '--cwd', '--filter', '--cache-dir', '--backend', '--linker', '--config', '-c']),
};
const npmInstalls = new Set(['install', 'install-test', 'it', 'i', 'add', 'in', 'ins', 'inst', 'insta', 'instal', 'isnt', 'isnta', 'isntal', 'isntall']);
const managers = new Set(['npm', 'pnpm', 'yarn', 'bun', 'npx', 'bunx']);
const nonInstallVerbs = new Set(['ci', 'run', 'run-script', 'test', 't', 'start', 'stop', 'restart', 'list', 'ls', 'll', 'la',
  'view', 'info', 'show', 'config', 'get', 'set', 'help', 'docs', 'repo', 'bugs', 'search', 'audit', 'outdated',
  'why', 'explain', 'remove', 'rm', 'uninstall', 'unlink', 'pack', 'publish', 'whoami', 'ping', 'root', 'prefix', 'cache', 'store']);
const binaryName = token => token?.replace(/\\/g, '/').split('/').at(-1)?.replace(/\.(?:cmd|exe|ps1)$/i, '').toLowerCase();
const mentionsInstall = command => /\b(?:npm|pnpm|yarn|bun)(?:\.(?:cmd|exe|ps1))?\b[^;&|\n]*\b(?:install(?:-test)?|i|it|in|ins|inst|insta|instal|isnt|isnta|isntal|isntall|add|exec|x|dlx)\b|\b(?:npx|bunx)\b/i.test(command);

// Shell-like tokenization, without evaluating expansions or executing anything.
// Separators inside quotes remain part of their argument.
function tokenize(command) {
  const segments = [];
  let groups = 0, malformed = false;
  let tokens = [], token = '', started = false, quote = '';
  const flush = () => {
    if (started) tokens.push(token);
    token = '';
    started = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === '\\' && quote !== "'" && i + 1 < command.length) {
      const next = command[i + 1];
      if (next === '\n' || (next === '\r' && command[i + 2] === '\n')) {
        i += next === '\r' ? 2 : 1;
        continue;
      }
      if ((!quote && /[\s'"\\;&|]/.test(next)) || (quote === '"' && /["\\$`]/.test(next))) {
        token += next;
        started = true;
        i++;
        continue;
      }
    }
    if (quote) {
      if (c === quote) quote = '';
      else token += c;
      started = true;
    } else if (c === "'" || c === '"') {
      quote = c;
      started = true;
    } else if (c === '#' && !started) {
      while (i < command.length && command[i] !== '\n') i++;
      flush();
      segments.push(tokens);
      tokens = [];
    } else if (/[();&|\n\r]/.test(c)) {
      if (c === '(') groups++;
      if (c === ')' && --groups < 0) malformed = true;
      flush();
      segments.push(tokens);
      tokens = [];
    } else if (/\s/.test(c)) flush();
    else {
      token += c;
      started = true;
    }
  }
  flush();
  segments.push(tokens);
  return { segments, malformed: malformed || Boolean(quote) || groups !== 0 };
}

function parsePackage(raw, manager) {
  let value = raw;
  const alias = value.indexOf('@npm:');
  if (alias > 0) value = value.slice(alias + 5);
  else if (value.startsWith('npm:')) value = value.slice(4);
  if (/^(?:\.{0,2}[\\/]|~[\\/]|[a-z]:[\\/]|file:|link:|git\+|git:|github:|https?:)/i.test(value)) return null;
  if (/\.tgz(?:[?#].*)?$/i.test(value)) return null;
  const at = value.indexOf('@', value.startsWith('@') ? 1 : 0);
  const name = at < 0 ? value : value.slice(0, at);
  const spec = at < 0 ? undefined : value.slice(at + 1);
  if (!/^(?:@[a-z0-9_.~-]+\/)?[a-z0-9_.~-]+$/i.test(name)) return null;
  // A registry package name with a non-registry version is still a local/git install.
  if (spec && /^(?:\.{0,2}[\\/]|~[\\/]|[a-z]:[\\/]|file:|link:|git\+|git:|github:|https?:)/i.test(spec)) return null;
  if (spec && (/\.tgz(?:[?#].*)?$/i.test(spec) || /^[^@\s]+\/[^\s]+$/.test(spec))) return null;
  return { manager, name, ...(spec ? { spec } : {}), raw };
}

function skipFlag(tokens, i, executable, runner = false) {
  const flags = valueFlags[executable === 'npx' ? 'npm' : executable === 'bunx' ? 'bun' : executable];
  const takesValue = flags?.has(tokens[i]) || (runner && ['npx', 'npm'].includes(executable) && ['-p', '--package'].includes(tokens[i]));
  return takesValue && !tokens[i].includes('=') ? i + 2 : i + 1;
}

/** Find explicit registry installs in a shell command. @param {string} command @returns {InstallRequest[]} */
export function findInstalls(command) {
  return parseCommand(command).installs;
}

/** Parse supported shell forms, retaining uncertainty so the hook can ask for review. */
export function parseCommand(command, depth = 0) {
  const installs = [];
  if (depth >= 5) return { installs, uncertain: mentionsInstall(command) };
  const { segments, malformed } = tokenize(command);
  let uncertain = mentionsInstall(command) && (malformed || /\$[({]|`/.test(command));
  for (const tokens of segments) {
    let i = 0;
    let queryOnly = false;
    while (i < tokens.length) {
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) { i++; continue; }
      const wrapper = binaryName(tokens[i]);
      if (!['env', 'sudo', 'command', 'corepack'].includes(wrapper)) break;
      i++;
      if (wrapper === 'command' && ['-v', '-V'].includes(tokens[i])) { queryOnly = true; break; }
      while (tokens[i]?.startsWith('-')) {
        const valueOptions = wrapper === 'sudo'
          ? ['-u', '-g', '-h', '-p', '--user', '--group', '--host', '--prompt']
          : wrapper === 'env' ? ['-u', '--unset', '-C', '--chdir'] : [];
        i += valueOptions.includes(tokens[i]) ? 2 : 1;
      }
    }
    if (queryOnly) continue;
    const executable = binaryName(tokens[i++]);
    if (['bash', 'sh'].includes(executable)) {
      while (tokens[i]?.startsWith('-') && !/^-[a-z]*c[a-z]*$/.test(tokens[i])) i++;
      if (/^-[a-z]*c[a-z]*$/.test(tokens[i] ?? '') && tokens[i + 1] !== undefined) {
        const nested = parseCommand(tokens[i + 1], depth + 1);
        installs.push(...nested.installs);
        uncertain ||= nested.uncertain;
      } else uncertain ||= mentionsInstall(command);
      continue;
    }
    if (!managers.has(executable)) {
      if (!['echo', 'printf', 'command'].includes(executable)) uncertain ||= mentionsInstall(tokens.join(' '));
      continue;
    }
    let manager = executable;
    let runner = executable === 'npx' || executable === 'bunx';
    if (!runner) {
      while (tokens[i]?.startsWith('-')) i = skipFlag(tokens, i, executable);
      let verb = tokens[i++]?.toLowerCase();
      if (executable === 'yarn' && verb === 'global') verb = tokens[i++]?.toLowerCase();
      if (executable === 'npm' && ['exec', 'x'].includes(verb)) {
        manager = 'npx';
        runner = true;
      } else if (['pnpm', 'yarn'].includes(executable) && verb === 'dlx') {
        manager = `${executable} dlx`;
        runner = true;
      } else if (!(executable === 'npm' ? npmInstalls.has(verb)
        : executable === 'yarn' ? verb === 'add' : ['add', 'install', 'i'].includes(verb))) {
        if (!nonInstallVerbs.has(verb)) uncertain ||= mentionsInstall(tokens.join(' '));
        continue;
      }
    }
    const packages = [], explicit = [];
    for (; i < tokens.length;) {
      const token = tokens[i];
      if (token === '--') {
        packages.push(...tokens.slice(i + 1));
        break;
      }
      if (token.startsWith('-')) {
        if (runner && ['npm', 'npx'].includes(executable) && /^(?:--package|-p)(?:=|$)/.test(token)) {
          const value = token.includes('=') ? token.slice(token.indexOf('=') + 1) : tokens[i + 1];
          if (value) explicit.push(value);
        }
        const next = skipFlag(tokens, i, executable, runner);
        if (next > tokens.length) uncertain = true;
        i = next;
      } else {
        packages.push(token);
        // Runner arguments belong to the invoked program, not the package manager.
        if (runner) break;
        i++;
      }
    }
    const candidates = runner ? (explicit.length ? explicit : packages.slice(0, 1)) : packages;
    for (const raw of candidates) {
      const parsed = parsePackage(raw, manager);
      if (parsed) installs.push(parsed);
      else uncertain = true;
    }
  }
  return { installs, uncertain };
}

/** Combine package reports into one hook decision. @param {Report[]} reports */
export function decide(reports) {
  const decision = reports.some(report => report.verdict === 'BLOCK') ? 'deny'
    : reports.some(report => report.verdict === 'REVIEW') ? 'ask' : 'allow';
  const reason = reports.map(report => {
    const label = `${report.package}${report.version && report.version !== '-' ? `@${report.version}` : ''}`;
    const findings = (report.findings ?? []).slice(0, report.verdict === 'BLOCK' ? 2 : 1).map(finding => finding.title).join('; ');
    const detail = findings || report.summary || 'No findings reported';
    const advice = report.verdict === 'BLOCK' && report.safeVersion?.version
      ? ` Install ${report.package}@${report.safeVersion.version} instead.`
      : report.verdict === 'REVIEW' ? ' Ask the user before installing.' : '';
    return `Dep Bouncer ${report.verdict} ${label}: ${detail.replace(/[\r\n]+/g, ' ').replace(/\.+$/, '')}.${advice}`;
  }).join('\n');
  return { decision, reason };
}
