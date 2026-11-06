// Run explicitly with `node scripts/build-fixtures.mjs` on a network-enabled machine.
// Only pinned last-good tarballs are downloaded. Package code is never executed.
import { mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const HEADER = '/* Dep Bouncer reconstruction: benign stand-in, not real malware. */';
const directory = new URL('../src/modules/incidents/fixtures/', import.meta.url);
const registry = 'https://registry.npmjs.org/';
const incidents = [
  { id: 'axios', title: 'axios: phantom dependency hijack', date: '2026-03-31', packageName: 'axios', goodVersion: '1.14.0', targetVersion: '1.14.1', safeVersion: '1.14.0', published: '2026-03-31T00:21:58.000Z', advisory: 'MAL-2026-2307', lagHours: 2.9 },
  { id: 'keyv', title: 'keyv: Mini Shai-Hulud / CHAINDROP', date: '2026-08-04', packageName: 'keyv', goodVersion: '6.0.0-rc.1', targetVersion: '6.0.0', safeVersion: '5.6.0', published: '2026-08-04T09:35:00.000Z', advisory: 'MAL-2026-11524', lagHours: 1.7 },
  { id: 'nx', title: 'nx: s1ngularity', date: '2025-08-26', packageName: 'nx', goodVersion: '21.4.1', targetVersion: '21.5.0', safeVersion: '21.4.1', published: '2025-08-26T22:32:00.000Z', advisory: 'MAL-2025-41443', lagHours: 18.2 },
  { id: 'chalk', title: 'chalk: qix phishing and browser wallet hooks', date: '2025-09-08', packageName: 'chalk', goodVersion: '5.6.0', targetVersion: '5.6.1', safeVersion: '5.6.0', published: '2025-09-08T13:13:05.239Z', advisory: 'MAL-2025-46969', lagHours: 4.0 },
  { id: 'tinycolor', title: '@ctrl/tinycolor: Shai-Hulud', date: '2025-09-15', packageName: '@ctrl/tinycolor', goodVersion: '4.1.0', targetVersion: '4.1.1', safeVersion: '4.1.0', published: '2025-09-15T19:52:00.000Z', advisory: 'MAL-2025-47141', lagHours: 3.8 },
];

function trimManifest(manifest) {
  const result = { name: manifest.name, version: manifest.version };
  for (const key of ['scripts', 'dependencies', 'optionalDependencies']) {
    if (manifest[key] !== undefined) result[key] = structuredClone(manifest[key]);
  }
  if (manifest._npmUser) {
    result._npmUser = { name: manifest._npmUser.name };
    if (manifest._npmUser.email !== undefined) result._npmUser.email = manifest._npmUser.email;
  }
  result.dist = { tarball: manifest.dist.tarball };
  for (const key of ['integrity', 'unpackedSize']) {
    if (manifest.dist[key] !== undefined) result.dist[key] = structuredClone(manifest.dist[key]);
  }
  if (manifest.dist.attestations) {
    result.dist.attestations = { url: manifest.dist.attestations.url };
    if (manifest.dist.attestations.provenance) {
      result.dist.attestations.provenance = { predicateType: manifest.dist.attestations.provenance.predicateType };
    }
  }
  return result;
}

function paddedComment(prefix, size) {
  return prefix + '/*' + ' harmless reconstruction padding '.repeat(Math.ceil(size / 33)).slice(0, size - Buffer.byteLength(prefix) - 4) + '*/';
}

/**
 * A benign no-op with the *shape* of the 2025 chalk/debug injection: one long line, dozens of
 * `_0x`-style identifiers, a hex-escaped string table and the hooked API names as plain
 * strings. It never touches window, fetch or wallets; it only returns harmless strings.
 */
function obfuscatedStandIn() {
  const ids = Array.from({ length: 40 }, (_, i) => '_0x' + (0x1a2b3 + i * 7919).toString(16));
  const words = ['noop', 'harmless', 'reconstruction', 'benign', 'stand-in', 'not-malware'];
  const hex = (w) => [...w].map((c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const table = `const ${ids[0]}=[${Array.from({ length: 60 }, (_, i) => `"${hex(words[i % words.length])}"`).join(',')}];`;
  const fns = ids.slice(1).map((id, i) => `function ${id}(${ids[(i + 2) % ids.length]}){return ${ids[0]}[${i % 60}];}`).join('');
  const names = ['window.ethereum', 'ethereum.request', 'XMLHttpRequest.prototype.open', 'XMLHttpRequest.prototype.send',
    'solana.signTransaction', '0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333'];
  return `${HEADER}\n;(()=>{${table}${fns}void [${names.map((n) => `"${n}"`).join(',')}];})();\n`;
}

export function standIns(id) {
  if (id === 'keyv') {
    let seed = 0x5eed1234;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let noise = '';
    for (let i = 0; i < 700 * 1024 - HEADER.length - 5; i++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      noise += alphabet[(seed >>> 0) % alphabet.length];
    }
    return {
      'setup.mjs': paddedComment(`${HEADER}\nvoid ["child_process", "execFileSync", "github.com/oven-sh/bun/releases", ".claude/settings.json", "SessionStart", ".vscode/tasks.json", "folderOpen"];\nconst _0x4a = ["\\x6e\\x6f\\x6f\\x70"]; void _0x4a;\n`, 30 * 1024),
      // Entirely inert comment text: no executable encrypted payload or decoder.
      'Math_Symbol.js': `${HEADER}\n/*${noise}*/`,
    };
  }
  if (id === 'nx') return {
    'telemetry.js': `${HEADER}\nvoid ["child_process", "claude --dangerously-skip-permissions", "gemini --yolo", "q --trust-all-tools", ".ssh", ".npmrc", "api.github.com/user/repos", ".bashrc"];\n`,
  };
  if (id === 'chalk') return { 'index.js': obfuscatedStandIn() };
  if (id === 'tinycolor') {
    const prefix = `${HEADER}\nvoid ["trufflehog", "webhook.site", "JSON.stringify(process.env)", ".github/workflows"];`;
    const unit = '(()=>{const harmless="reconstruction";void harmless;})();';
    return { 'bundle.js': prefix + unit.repeat(Math.ceil((600 * 1024 - prefix.length) / unit.length)) };
  }
  return {};
}

export function reconstruct(spec, good, goodFiles) {
  const target = structuredClone(good);
  target.version = spec.targetVersion;
  // These are labels, not downloadable copies of the removed releases.
  target.dist = { tarball: `https://registry.npmjs.org/${spec.packageName}/-/RECONSTRUCTED-${spec.targetVersion}.tgz` };
  if (spec.id === 'axios') {
    target._npmUser = { name: 'jasonsaayman' };
    target.dependencies = { ...target.dependencies, 'plain-crypto-js': '^4.2.1' };
  } else if (spec.id === 'keyv') {
    if (good.dist.attestations) target.dist.attestations = structuredClone(good.dist.attestations);
    target.scripts = { ...target.scripts, preinstall: 'node setup.mjs' };
  } else if (spec.id === 'nx') {
    target.scripts = { ...target.scripts, postinstall: 'node telemetry.js' };
  } else if (spec.id === 'chalk') {
    target._npmUser = { name: 'qix' };
  } else if (spec.id === 'tinycolor') {
    target.scripts = { ...target.scripts, postinstall: 'node bundle.js' };
  }
  const additions = standIns(spec.id);
  const files = { ...goodFiles, ...additions };
  if (spec.id === 'chalk') {
    // The real injection went into the package's main entry file, so append it there.
    const pkg = goodFiles['package.json'] ? JSON.parse(goodFiles['package.json']) : {};
    const entry = String(typeof pkg.exports === 'string' ? pkg.exports : pkg.main ?? 'index.js').replace(/^\.\//, '');
    delete files['index.js'];
    files[entry] = `${goodFiles[entry] ?? ''}\n${additions['index.js']}`;
  }
  // axios deliberately has byte-identical files: the registry manifest adds the dependency.
  if (spec.id !== 'axios' && goodFiles['package.json']) {
    const manifest = JSON.parse(goodFiles['package.json']);
    manifest.version = target.version;
    if (target.scripts) manifest.scripts = target.scripts;
    if (target.dependencies) manifest.dependencies = target.dependencies;
    if (spec.id === 'keyv' && Array.isArray(manifest.files)) manifest.files = [...new Set([...manifest.files, ...Object.keys(additions)])];
    files['package.json'] = JSON.stringify(manifest, null, 2) + '\n';
  }
  return { target, files };
}

// Minimal tar reader: regular files only, PAX/GNU long paths supported, never extracted to disk.
function readTextFiles(compressed, id) {
  const tar = gunzipSync(compressed);
  const files = {};
  const decode = new TextDecoder('utf-8', { fatal: true });
  const string = (bytes) => bytes.toString('utf8').replace(/\0.*$/s, '');
  let longName;
  let pax = {};
  let globalPax = {};
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const size = Number.parseInt(string(header.subarray(124, 136)).trim() || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('Invalid tar entry size');
    const content = tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    const type = String.fromCharCode(header[156]);
    if (type === 'x' || type === 'g') {
      const fields = {};
      for (let position = 0; position < content.length;) {
        const space = content.indexOf(32, position);
        const length = Number(content.subarray(position, space).toString());
        if (space < position || !Number.isSafeInteger(length) || length <= space - position + 1 || position + length > content.length) throw new Error('Invalid PAX record');
        const record = content.subarray(space + 1, position + length - 1).toString('utf8');
        const equals = record.indexOf('=');
        if (equals > 0) fields[record.slice(0, equals)] = record.slice(equals + 1);
        position += length;
      }
      if (type === 'g') globalPax = { ...globalPax, ...fields };
      else pax = fields;
      continue;
    }
    if (type === 'L') { longName = string(content); continue; }
    const prefix = string(header.subarray(345, 500));
    const path = (pax.path ?? longName ?? globalPax.path ?? `${prefix ? prefix + '/' : ''}${string(header.subarray(0, 100))}`).replace(/^\.\//, '').replace(/^package\//, '');
    pax = {};
    longName = undefined;
    if (type !== '0' && type !== '\0') continue;
    if (!path || path.startsWith('/') || path.split('/').includes('..') || path === '__proto__') continue;
    if (size > 200 * 1024 || content.includes(0)) continue;
    if (id === 'nx' && !['package.json', 'bin/post-install.js', 'bin/nx.js'].includes(path)) continue;
    try { files[path] = decode.decode(content); } catch { /* Binary/non-UTF-8: omit. */ }
  }
  if (!files['package.json']) throw new Error('Last-good tarball did not contain a retained package.json');
  return files;
}

async function fetchChecked(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

/** Keeps `created` and every publish time up to the target, so the fixture shows the
 * registry as it was at the moment of the hijack (and stays small for nx's 2,700 versions). */
function trimTime(time, targetVersion, targetPublished) {
  const cutoff = Date.parse(targetPublished);
  const kept = { created: time.created };
  for (const [version, published] of Object.entries(time)) {
    if (version === 'created' || version === 'modified') continue;
    if (Date.parse(published) <= cutoff) kept[version] = published;
  }
  kept[targetVersion] = targetPublished;
  return kept;
}

async function main() {
  await mkdir(directory, { recursive: true });
  for (const spec of incidents) {
    const packument = await (await fetchChecked(registry + encodeURIComponent(spec.packageName))).json();
    const good = packument.versions[spec.goodVersion];
    if (!good || good.name !== spec.packageName || good.version !== spec.goodVersion) throw new Error(`Missing pinned good manifest: ${spec.id}`);
    const cutoff = Date.parse(packument.time[spec.goodVersion]);
    if (!Number.isFinite(cutoff)) throw new Error(`Missing last-good publish time: ${spec.id}`);
    const baseline = Object.values(packument.versions)
      .filter((entry) => Date.parse(packument.time[entry.version]) <= cutoff)
      .sort((a, b) => Date.parse(packument.time[b.version]) - Date.parse(packument.time[a.version]))
      .slice(0, 10).map(trimManifest);
    // No request is ever made for a removed/malicious version or for plain-crypto-js.
    const tarball = new URL(good.dist.tarball);
    if (tarball.origin !== 'https://registry.npmjs.org') throw new Error('Unexpected tarball origin');
    const goodFiles = readTextFiles(Buffer.from(await (await fetchChecked(tarball)).arrayBuffer()), spec.id);
    const { target, files } = reconstruct(spec, trimManifest(good), goodFiles);
    const downloads = await (await fetchChecked(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(spec.packageName)}`)).json();
    if (!Number.isFinite(downloads.downloads)) throw new Error(`Missing weekly downloads: ${spec.id}`);
    const fixture = {
      id: spec.id, title: spec.title, date: spec.date, packageName: spec.packageName,
      targetVersion: spec.targetVersion, goodVersion: spec.goodVersion,
      sources: [
        { name: 'OSV', url: `https://osv.dev/vulnerability/${spec.advisory}` },
        { name: 'npm last-good manifest', url: `${registry}${encodeURIComponent(spec.packageName)}/${spec.goodVersion}` },
      ],
      real: [`${spec.goodVersion} manifest and UTF-8 files <= 200 KB`, 'registry publish times', 'current weekly downloads', ...(spec.id === 'nx' ? ['file set trimmed: package.json, bin/post-install.js, bin/nx.js'] : [])],
      reconstructed: [
        `${spec.targetVersion} manifest (documented changes; tarball URL is a non-downloadable label)`,
        ...(spec.id === 'axios' ? ['plain-crypto-js PackageInfo from incident fact sheet; no dependency payload'] : ['injected code (benign stand-in)']),
        ...(spec.id === 'keyv' ? ['repository hook strings in loader are illustrative, not detected repository commits; Math_Symbol.js is inert random comment text'] : []),
        ...(spec.id === 'chalk' ? ['publisher qix inferred from reports; removed manifest cannot be checked'] : []),
        ...(spec.id === 'tinycolor' ? ['bundle.js reduced to ~600 KB; reported original was ~3.6 MB'] : []),
        ...(!packument.time[spec.targetVersion] ? ['target publish time from fact sheet (minute precision where supplied)'] : []),
      ],
      osvFirstAdvisory: { id: spec.advisory, lagHours: spec.lagHours },
      safeVersion: spec.safeVersion, weeklyDownloads: downloads.downloads,
      baseline, target,
      time: trimTime(packument.time, spec.targetVersion, packument.time[spec.targetVersion] ?? spec.published),
      files: { [spec.goodVersion]: goodFiles, [spec.targetVersion]: files },
    };
    if (spec.id === 'axios') fixture.packages = {
      'plain-crypto-js': {
        name: 'plain-crypto-js', created: '2026-03-30T05:57:32.867Z', versionCount: 2, weeklyDownloads: 0,
        latest: { name: 'plain-crypto-js', version: '4.2.1', scripts: { postinstall: 'node setup.js' }, dist: { tarball: 'https://registry.npmjs.org/plain-crypto-js/-/RECONSTRUCTED-4.2.1.tgz' } },
      },
    };
    await writeFile(new URL(`${spec.id}.json`, directory), JSON.stringify(fixture, null, 2) + '\n');
    console.log(`Built ${spec.id} (reconstructed target; pinned good tarball only)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
