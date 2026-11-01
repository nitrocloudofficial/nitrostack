// PHP version selection for the Metamorph runner. Pure functions, no I/O, no dependencies.
// Reads a project's composer.json (require.php, config.platform.php) and composer.lock (php requirements of the
// locked packages) and picks one of the PHP versions installed in the image. Used by metamorph-run.mjs and unit tests.

/** Parse a version such as 7.4.33, v8.1, 8 or 7.4.* into numeric parts. Missing parts are undefined, wildcards null. */
function parseVersion(text) {
  const m = String(text).trim().match(/^v?(\d+|[*xX])(?:\.(\d+|[*xX]))?(?:\.(\d+|[*xX]))?(?:\.(\d+|[*xX]))?(?:[-@.]?(?:dev|alpha|beta|rc|a|b|p|patch)[\w.]*)?$/i);
  if (!m) return undefined;
  const parts = [m[1], m[2], m[3]].map((p) => (p === undefined ? undefined : /^[*xX]$/.test(p) ? null : Number(p)));
  if (parts[0] === null) return { parts: [], wildcard: true };
  // everything after the first wildcard is a wildcard too
  const wi = parts.findIndex((p) => p === null);
  return { parts: wi === -1 ? parts.filter((p) => p !== undefined) : parts.slice(0, wi), wildcard: wi !== -1 };
}

const pad3 = (parts) => [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}
/** Exclusive upper bound of "parts" treated as a prefix: [7,4] -> 7.5.0, [7] -> 8.0.0, [7,4,1] -> 7.4.2. */
function nextPrefix(parts) {
  const p = [...parts];
  p[p.length - 1] += 1;
  return pad3(p);
}

/** One constraint token -> list of [op, [maj,min,patch]] bounds that must all hold. undefined = not understood. */
function tokenBounds(token) {
  const m = token.match(/^(>=|<=|!=|<>|==|>|<|=|\^|~)?(.+)$/);
  if (!m) return undefined;
  const op = m[1] ?? '';
  const v = parseVersion(m[2]);
  if (!v) return undefined;
  if (v.parts.length === 0) return []; // "*": anything
  const lo = pad3(v.parts);
  if (op === '' || op === '=' || op === '==') {
    // 7.4.* or a partial version: the whole prefix range; a full x.y.z: exactly that version
    if (v.wildcard || v.parts.length < 3) return [['>=', lo], ['<', nextPrefix(v.parts)]];
    return [['==', lo]];
  }
  if (op === '!=' || op === '<>') return v.wildcard ? [['!range', lo, nextPrefix(v.parts)]] : [['!=', lo]];
  if (op === '>=') return [['>=', lo]];
  if (op === '>') return [v.wildcard || v.parts.length < 3 ? ['>=', nextPrefix(v.parts)] : ['>', lo]];
  if (op === '<') return [['<', lo]];
  if (op === '<=') return [v.wildcard || v.parts.length < 3 ? ['<', nextPrefix(v.parts)] : ['<=', lo]];
  if (op === '~') {
    // ~7.4.1 -> >=7.4.1 <7.5 ; ~7.4 -> >=7.4 <8 ; ~7 -> >=7 <8
    const keep = v.parts.length >= 3 ? 2 : 1;
    return [['>=', lo], ['<', nextPrefix(v.parts.slice(0, Math.max(1, v.parts.length === 1 ? 1 : keep)))]];
  }
  if (op === '^') {
    const p = pad3(v.parts);
    const upper = p[0] > 0 ? [p[0] + 1, 0, 0] : p[1] > 0 ? [0, p[1] + 1, 0] : [0, 0, p[2] + 1];
    return [['>=', lo], ['<', upper]];
  }
  return undefined;
}

/**
 * Parse a composer version constraint into OR-groups of AND-bounds.
 * Returns undefined when any part is not understood (dev branches, aliases, odd syntax): the caller must say so.
 */
export function parseConstraint(text) {
  let s = String(text ?? '').trim();
  if (!s || s.length > 200) return undefined;
  s = s.replace(/@(?:dev|alpha|beta|rc|stable)\b/gi, '').replace(/\s+as\s+\S+/gi, '');
  // "a - b" hyphen ranges, then glue operators to their version (">= 7.2" -> ">=7.2")
  s = s.replace(/(\S+)\s+-\s+(\S+)/g, (_, a, b) => `>=${a} <=${b}`);
  s = s.replace(/(>=|<=|!=|<>|==|[><=^~])\s+/g, '$1');
  const groups = [];
  for (const orPart of s.split(/\s*\|\|?\s*/)) {
    const tokens = orPart.split(/[\s,]+/).filter(Boolean);
    if (!tokens.length) return undefined;
    const bounds = [];
    for (const t of tokens) {
      const b = tokenBounds(t);
      if (!b) return undefined;
      bounds.push(...b);
    }
    groups.push(bounds);
  }
  return groups.length ? groups : undefined;
}

/** Does a full version string (7.4.33) satisfy a parsed constraint? */
export function satisfies(version, groups) {
  const v = parseVersion(version);
  if (!v) return false;
  const x = pad3(v.parts);
  return groups.some((bounds) =>
    bounds.every(([op, a, b]) => {
      const c = cmp(x, a);
      if (op === '>=') return c >= 0;
      if (op === '>') return c > 0;
      if (op === '<') return c < 0;
      if (op === '<=') return c <= 0;
      if (op === '==') return c === 0;
      if (op === '!=') return c !== 0;
      if (op === '!range') return c < 0 || cmp(x, b) >= 0;
      return false;
    })
  );
}

const minorKey = (label) => {
  const [a, b] = label.split('.').map(Number);
  return a * 100 + (b || 0);
};

/**
 * Pick an installed PHP version for a project.
 *   composerJson: parsed composer.json (or undefined)
 *   lock: parsed composer.lock (or undefined)
 *   installed: [{ label: '7.4', version: '7.4.33' }, ...]
 *   defaultLabel: version used when the project states no PHP requirement at all
 * Returns { supported, selected?, version?, constraint?, constraintSource, reason }.
 * `supported:false` means a constraint exists that no installed version satisfies; nothing is silently substituted.
 */
export function selectPhp({ composerJson, lock, installed, defaultLabel }) {
  const list = installed.length ? installed : [];
  const labels = list.map((i) => i.label).join(', ');
  const req = typeof composerJson?.require?.php === 'string' ? composerJson.require.php.trim() : '';
  const platformRaw = composerJson?.config?.platform?.php;
  const platform = typeof platformRaw === 'string' && parseVersion(platformRaw) && !parseVersion(platformRaw).wildcard ? platformRaw.trim() : '';

  // php constraints of the locked packages (what composer's own platform check enforces)
  const lockReqs = new Set();
  for (const p of [...(lock?.packages ?? []), ...(lock?.['packages-dev'] ?? [])]) {
    const r = p?.require?.php;
    if (typeof r === 'string' && r.length <= 200) lockReqs.add(r.trim());
    if (lockReqs.size >= 200) break;
  }

  let candidates = list;
  let constraint = '';
  let constraintSource = 'default';
  let parseNote = '';

  if (req) {
    constraint = req;
    constraintSource = 'require.php';
    const parsed = parseConstraint(req);
    if (!parsed) {
      const dflt = list.find((i) => i.label === defaultLabel);
      return {
        supported: !!dflt,
        ...(dflt ? { selected: dflt.label, version: dflt.version } : {}),
        constraint: req.slice(0, 200),
        constraintSource,
        reason: dflt ? `could not parse require.php "${req.slice(0, 80)}"; using default ${dflt.label}` : `no supported PHP version for constraint ${req.slice(0, 80)} (constraint not understood)`
      };
    }
    candidates = list.filter((i) => satisfies(i.version, parsed));
    if (!candidates.length) {
      return { supported: false, constraint: req.slice(0, 200), constraintSource, reason: `no supported PHP version for constraint ${req.slice(0, 120)} (installed: ${labels})` };
    }
  } else if (platform) {
    constraint = platform;
    constraintSource = 'config.platform.php';
  }

  // narrow by what the locked packages need, unless that would leave nothing (composer then reports the conflict itself)
  let lockNote = '';
  if (lockReqs.size) {
    const parsedLock = [...lockReqs].map(parseConstraint).filter(Boolean);
    const narrowed = candidates.filter((i) => parsedLock.every((g) => satisfies(i.version, g)));
    if (narrowed.length) {
      if (narrowed.length < candidates.length) lockNote = `; narrowed by php requirements of locked packages (${lockReqs.size} distinct)`;
      candidates = narrowed;
      if (!req && !platform && narrowed.length < list.length) {
        constraintSource = 'composer.lock';
        constraint = 'php requirements of locked packages';
      }
    } else lockNote = '; locked packages need a PHP version not installed together with the project constraint (composer will report it)';
  }

  const hasSignal = !!req || !!platform || constraintSource === 'composer.lock';
  if (!hasSignal) {
    const dflt = list.find((i) => i.label === defaultLabel) ?? candidates[candidates.length - 1];
    if (!dflt) return { supported: false, constraintSource: 'default', reason: 'no PHP version installed' };
    return { supported: true, selected: dflt.label, version: dflt.version, constraintSource: 'default', reason: `no PHP constraint declared; using default ${dflt.label}` };
  }

  const sorted = [...candidates].sort((a, b) => minorKey(a.label) - minorKey(b.label));
  let pick;
  let why;
  if (platform) {
    // config.platform.php says which version the project targets: nearest candidate at or above it, else the highest below
    const pk = minorKey(platform.replace(/^v/, '').split('.').slice(0, 2).join('.'));
    pick = sorted.find((i) => minorKey(i.label) >= pk) ?? sorted[sorted.length - 1];
    why = `config.platform.php ${platform}: nearest installed version${req ? ` satisfying ${req}` : ''} at or above it is ${pick.label}`;
    if (req) constraint = req;
  } else {
    // no target version: the lowest version the project allows is the one legacy dependencies are most likely to install on
    pick = sorted[0];
    why = `lowest installed version satisfying ${constraint}: ${pick.label}`;
  }
  return { supported: true, selected: pick.label, version: pick.version, constraint: constraint.slice(0, 200), constraintSource, reason: `${why}${lockNote} (installed: ${labels})`.slice(0, 400) };
}

/**
 * True when composer.lock cannot be installed from: it has packages but at least one has neither a dist nor a source entry.
 * Stub locks like that are produced by hand or by generators; `composer install` refuses them.
 */
export function lockIsStub(lock) {
  if (!lock || typeof lock !== 'object') return false;
  const pkgs = [...(lock.packages ?? []), ...(lock['packages-dev'] ?? [])];
  if (!pkgs.length) return false;
  return pkgs.some((p) => !p || (!p.dist && !p.source));
}
