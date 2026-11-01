// GET / : a self-contained landing page that replaces the SDK's generic one. No external requests: system fonts, inline
// CSS/JS (allowed by CSP hashes only), the logo as inline SVG. Static content except the endpoint line, which is built
// from the request host and escaped. The key is never printed.
import { createHash } from 'node:crypto';
import { LOGO_D64 } from './landing-logo.js';

export const REPO_URL = 'https://github.com/dhilipa01/metamorph-mcp';
export const README_URL = `${REPO_URL}#readme`;
const VERSION = '1.0.0';

// Keep in step with the @Tool decorators: tests/unit/landing.test.ts compares this table with the source.
export const TOOLS: ReadonlyArray<{ name: string; scope: 'read' | 'plan' | 'write'; purpose: string }> = [
  { name: 'assess_project', scope: 'read', purpose: 'Score a public GitHub repo: end-of-life runtimes, vulnerable dependencies, legacy patterns.' },
  { name: 'analyze_advisory', scope: 'read', purpose: 'Check packages or CVE ids against OSV, CISA KEV and EPSS.' },
  { name: 'check_watch', scope: 'read', purpose: 'What changed since a date: KEV, EPSS, end-of-life dates, PHP and Node releases.' },
  { name: 'plan_modernization', scope: 'plan', purpose: 'Order the fixes into stages. Only four stage types change files.' },
  { name: 'preview_changes', scope: 'read', purpose: 'Show the real diff for one automated stage and return an approval token.' },
  { name: 'apply_stage', scope: 'write', purpose: 'Projected re-score of one approved stage on a temporary copy. Your repo is not changed.' },
  { name: 'verify_patch', scope: 'write', purpose: 'Build and test a patch on an isolated GitHub Actions runner.' },
  { name: 'generate_report', scope: 'read', purpose: 'PDF, SARIF and CycloneDX SBOM with signed, expiring download links.' },
  { name: 'cloud_inventory', scope: 'read', purpose: 'Read-only AWS inventory of Lambda, RDS, EKS and EC2 runtimes.' }
];

export const RESOURCES: ReadonlyArray<{ uri: string; purpose: string }> = [
  { uri: 'metamorph://report/{id}.pdf', purpose: 'PDF report from generate_report (kept 10 minutes).' },
  { uri: 'metamorph://report/{id}.sarif', purpose: 'SARIF 2.1.0 findings from generate_report.' },
  { uri: 'metamorph://report/{id}.cdx.json', purpose: 'CycloneDX 1.5 SBOM from generate_report.' },
  { uri: 'metamorph://aws/readonly-role.yaml', purpose: 'CloudFormation template for the read-only role used by cloud_inventory.' }
];

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const CSS = `
:root{--bg:#D5DAD0;--card:#EFE7D6;--panel:#E3E6DC;--ink:#1B1D19;--mute:#555A50;--accent:#6B1F2A;--onacc:#F6F1E4;--line:#1B1D1938;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#151614;--card:#1E3527;--panel:#1A1C19;--ink:#ECE9DF;--mute:#A9AFA2;--accent:#D1344A;--onacc:#151614;--line:#ECE9DF2B;color-scheme:dark}}
:root[data-theme=dark]{--bg:#151614;--card:#1E3527;--panel:#1A1C19;--ink:#ECE9DF;--mute:#A9AFA2;--accent:#D1344A;--onacc:#151614;--line:#ECE9DF2B;color-scheme:dark}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:88px}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Helvetica Neue",Helvetica,Arial,"Liberation Sans",system-ui,sans-serif}
.w{max-width:1200px;margin:0 auto;padding:0 40px}
a{color:inherit}
.bar{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}
.bar .w{display:flex;align-items:center;gap:24px;height:72px}
.brand{display:flex;align-items:center;gap:12px;text-decoration:none;font-weight:700;font-size:20px;letter-spacing:-.01em}
svg.logo{width:36px;height:36px;flex:none;color:var(--accent)}
nav{display:flex;gap:32px;margin:0 auto}
nav a{text-decoration:none;color:var(--mute);font-size:15px}
nav a:hover{color:var(--ink)}
.right{display:flex;align-items:center;gap:16px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 24px;border-radius:6px;font:inherit;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;border:1px solid var(--line);background:none;color:var(--ink)}
.btn.p{background:var(--accent);border-color:var(--accent);color:var(--onacc)}
.btn.sm{padding:0 16px;font-weight:500}
.btn:focus-visible,a:focus-visible,[role=tab]:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.hero{padding:96px 0 64px}
.hero .w{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:64px;align-items:center}
h1{font:400 56px/1.1 Georgia,"Times New Roman","Liberation Serif",serif;letter-spacing:-.015em;margin:0}
.sub{font-size:19px;color:var(--mute);margin:24px 0 40px}
.acts{display:flex;flex-wrap:wrap;gap:16px}
.card{background:var(--card);border-radius:10px;padding:32px}
.card h3{font:400 24px/1.3 Georgia,"Times New Roman",serif;margin:0 0 8px}
.stages{list-style:none;margin:16px 0 0;padding:0}
.stages a{display:flex;gap:16px;align-items:baseline;padding:16px 0;border-top:1px solid var(--line);text-decoration:none}
.stages a:hover b{text-decoration:underline}
.stages i{font-style:normal;color:var(--mute);width:16px;flex:none}
.stages span{color:var(--mute);font-size:15px;margin-left:auto;text-align:right}
section{padding:48px 0}
h2{font:400 36px/1.2 Georgia,"Times New Roman",serif;margin:0 0 8px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin:0 0 16px}
.lead{color:var(--mute);margin:0 0 32px;max-width:680px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:32px}
[role=tablist]{display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--line);margin-bottom:24px}
[role=tab]{font:inherit;font-size:15px;min-height:44px;padding:0 16px;background:none;border:0;border-bottom:2px solid transparent;color:var(--mute);cursor:pointer;margin-bottom:-1px}
[role=tab][aria-selected=true]{color:var(--ink);border-bottom-color:var(--accent);font-weight:600}
[role=tabpanel][hidden]{display:none}
.lbl{font-size:13px;color:var(--mute);margin:0 0 8px}
.code{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;border:1px solid var(--line);border-radius:6px;padding:16px 16px 16px 20px;margin:0 0 24px}
code,pre{font:14px/1.5 ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace}
pre{margin:0;overflow-x:auto;white-space:pre-wrap;word-break:break-all;flex:1}
.note{font-size:15px;color:var(--mute);margin:0 0 16px}
.z{margin:0}
.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
table{border-collapse:collapse;width:100%}
th,td{text-align:left;padding:16px 24px 16px 0;border-bottom:1px solid var(--line);vertical-align:top;font-size:15px}
th{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:600}
td.n{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;white-space:nowrap}
.res{margin:24px 0 0;color:var(--mute);font-size:15px}
.res b{color:var(--ink)}
footer{border-top:1px solid var(--line);margin-top:48px;padding:32px 0 48px;font-size:14px;color:var(--mute)}
footer .w{display:flex;gap:24px;flex-wrap:wrap}
@media (max-width:900px){.hero .w,.grid3{grid-template-columns:1fr}.hero{padding:56px 0 32px}h1{font-size:40px}nav{display:none}.right{margin-left:auto}.w{padding:0 24px}section{padding:32px 0}}
@media (max-width:560px){.bar .btn.p{display:none}td.n{white-space:normal}}
`.trim();

const JS = `(function(){var r=document.documentElement,b=document.getElementById('theme'),M=['auto','light','dark'],m='auto';function ap(){if(m==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',m);if(b)b.textContent='Theme: '+m}try{var t=localStorage.getItem('metamorph-theme');if(t==='light'||t==='dark')m=t}catch(e){}ap();if(b)b.addEventListener('click',function(){m=M[(M.indexOf(m)+1)%3];ap();try{if(m==='auto')localStorage.removeItem('metamorph-theme');else localStorage.setItem('metamorph-theme',m)}catch(e){}});var tabs=[].slice.call(document.querySelectorAll('[role=tab]'));function sel(t,f){tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on?'true':'false');x.tabIndex=on?0:-1;document.getElementById(x.getAttribute('aria-controls')).hidden=!on});if(f)t.focus()}tabs.forEach(function(t,i){t.addEventListener('click',function(){sel(t)});t.addEventListener('keydown',function(e){var k=e.key,n=-1;if(k==='ArrowRight')n=(i+1)%tabs.length;else if(k==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(k==='Home')n=0;else if(k==='End')n=tabs.length-1;if(n>=0){e.preventDefault();sel(tabs[n],true)}})});[].forEach.call(document.querySelectorAll('[data-copy]'),function(c){c.addEventListener('click',function(){var s=document.getElementById(c.getAttribute('data-copy')).textContent;function ok(){var o=c.textContent;c.textContent='Copied';setTimeout(function(){c.textContent=o},1500)}function fb(){var a=document.createElement('textarea');a.value=s;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){}document.body.removeChild(a)}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(ok,fb);else fb()})});var mb=document.getElementById('mint'),mk=document.getElementById('mintkey'),mx=document.getElementById('mintbox'),mm=document.getElementById('mintmsg'),orig=[].map.call(document.querySelectorAll('pre[id^=c-]'),function(p){return [p,p.textContent]});function say(t){if(mm)mm.textContent=t}if(mb)mb.addEventListener('click',function(){mb.disabled=true;say('Getting a key...');fetch('/keys/mint',{method:'POST',credentials:'omit',cache:'no-store'}).then(function(r){return r.json().then(function(j){return [r.status,j]},function(){return [r.status,{}]})}).then(function(a){mb.disabled=false;var s=a[0],j=a[1];if(s===200&&j&&typeof j.key==='string'){mk.textContent=j.key;mx.hidden=false;orig.forEach(function(o){o[0].textContent=o[1].split('<your key>').join(j.key)});say('Your key expires '+j.expiresAt+'.')}else if(s===429)say((j&&j.error)||'Too many requests. Please try again later.');else say('Could not get a key right now (error '+s+'). Please try again later.')},function(){mb.disabled=false;say('Could not reach the server. Check your connection and try again.')})})})();`;

const sha = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
export const CSP = `default-src 'none'; style-src ${sha(CSS)}; script-src ${sha(JS)}; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;

export const STAGES: ReadonlyArray<{ id: string; name: string; note: string }> = [
  { id: 'assess', name: 'Assess', note: 'score + ranked risk' },
  { id: 'plan', name: 'Plan', note: 'staged upgrade' },
  { id: 'preview', name: 'Preview', note: 'diff + approval' },
  { id: 'apply', name: 'Apply', note: 'projected result' },
  { id: 'verify', name: 'Verify', note: 'runner, needs your own key' },
  { id: 'report', name: 'Report', note: 'PDF, SARIF, SBOM' }
];

export const CONNECTORS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude', label: 'Claude' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'codex', label: 'Codex' },
  { id: 'antigravity', label: 'Antigravity' },
  { id: 'sse', label: 'Raw / Inspector' }
];

const NAME = 'metamorph';

// Snippets follow the SDK's own connection page (@nitrostack/core streamable-http.js generateDocumentationPage).
// The client-config snippets also carry a Bearer header with the placeholder below; the page script swaps in a minted key (DOM only).
const KEY = '<your key>';
function snippet(id: string, ep: string): { intro: string; copy: string; code: string } {
  switch (id) {
    case 'cursor':
      return { intro: 'Cursor Settings > Features > MCP > Add New MCP Server:', copy: 'Copy JSON', code: `{\n  "mcpServers": {\n    // your other mcp servers\n    "${NAME}": {\n      "headers": { "Authorization": "Bearer ${KEY}" },\n      "url": "${ep}"\n    }\n  }\n}` };
    case 'antigravity':
      return { intro: 'Add under mcpServers in ~/.gemini/config/mcp_config.json:', copy: 'Copy JSON', code: `{\n  "mcpServers": {\n    // your other mcp servers\n    "${NAME}": {\n      "headers": { "Authorization": "Bearer ${KEY}" },\n      "serverUrl": "${ep}"\n    }\n  }\n}` };
    case 'codex':
      return { intro: 'Add to ~/.codex/config.toml:', copy: 'Copy TOML', code: `[mcp_servers.${NAME}]\nurl = "${ep}"\nhttp_headers = { Authorization = "Bearer ${KEY}" }` };
    case 'claude':
      return { intro: 'In Claude on the web, add a custom connector with these two fields:', copy: 'Copy URL', code: `Name: ${NAME}\nURL: ${ep}` };
    case 'chatgpt':
      return { intro: 'In ChatGPT, create a New App with Connection set to Server URL:', copy: 'Copy URL', code: `Name: ${NAME}\nServer URL: ${ep}\nAuthentication: No Auth` };
    default:
      return { intro: 'Connect directly with the endpoint:', copy: 'Copy endpoint', code: `${ep}\nAuthorization: Bearer ${KEY}` };
  }
}

export function renderLanding(endpoint: string): string {
  const e = escapeHtml;
  const tabs = CONNECTORS.map((c, i) => `<button role="tab" type="button" id="t-${c.id}" aria-controls="p-${c.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${e(c.label)}</button>`).join('');
  const panels = CONNECTORS.map((c, i) => {
    const s = snippet(c.id, endpoint);
    return `<div role="tabpanel" id="p-${c.id}" aria-labelledby="t-${c.id}"${i === 0 ? '' : ' hidden'}><p class="lbl">${e(s.intro)}</p><div class="code"><pre id="c-${c.id}">${e(s.code)}</pre><button class="btn sm" type="button" data-copy="c-${c.id}">${e(s.copy)}</button></div></div>`;
  }).join('');
  const stages = STAGES.map((s, i) => `<li><a href="/app#${s.id}"><i>${i + 1}</i><b>${e(s.name)}</b><span>${e(s.note)}</span></a></li>`).join('');
  const tools = TOOLS.map((t) => `<tr><td class="n">${e(t.name)}</td><td>${e(t.scope)}</td><td>${e(t.purpose)}</td></tr>`).join('');
  const res = RESOURCES.map((r) => e(r.uri)).join(' &middot; ');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Metamorph MCP</title>
<meta name="description" content="Assess, plan and verify legacy PHP and Node upgrades from your AI client.">
<style>${CSS}</style></head>
<body>
<header class="bar"><div class="w">
<a class="brand" href="/"><svg class="logo" viewBox="0 0 64 64" shape-rendering="crispEdges" fill="currentColor" role="img" aria-label="Metamorph logo"><path d="${LOGO_D64}"/></svg>metamorph</a>
<nav aria-label="Primary"><a href="/app">Dashboard</a><a href="#connect">Connect</a><a href="#tools">Tools</a></nav>
<div class="right"><button id="theme" class="btn sm" type="button" aria-label="Colour theme: auto, light or dark">Theme: auto</button><a class="btn p" href="/app">Open dashboard &rarr;</a></div>
</div></header>
<main>
<div class="hero"><div class="w">
<div><h1>Legacy PHP and Node upgrades, assessed, planned and verified from your AI client.</h1>
<p class="sub">Public GitHub repositories. Nothing in your repository changes.</p>
<div class="acts"><a class="btn p" href="/app">Open the dashboard (no key needed)</a><a class="btn" href="#connect">Connect an AI agent &darr;</a></div></div>
<div class="card"><h3>Pick a stage, any time</h3><ol class="stages">${stages}</ol></div>
</div></div>

<section id="connect"><div class="w">
<p class="eyebrow">Connect an AI agent</p><h2>Add Metamorph to your client</h2>
<p class="lead">Pick your client and paste the official snippet. The endpoint is Streamable HTTP.</p>
<div class="panel"><div role="tablist" aria-label="AI client">${tabs}</div>${panels}
<div class="code"><div><button id="mint" class="btn p" type="button">Get a key (plan scope, 24 hours)</button><p id="mintmsg" class="note z" role="status"></p></div></div>
<div id="mintbox" hidden><p class="lbl">Your key</p><div class="code"><pre id="mintkey"></pre><button class="btn sm" type="button" data-copy="mintkey">Copy</button></div><p class="note">Shown once. Valid 24 hours or until the server restarts. Scope: read and plan (no write).</p></div>
<p class="note">Send your key as <code>Authorization: Bearer &lt;your key&gt;</code> where the client supports a header. The official Claude and ChatGPT connector dialogs have no such field, so a key-protected endpoint cannot be added there.</p>
<p class="note z">Scopes, cumulative: read &middot; plan &middot; write. Guest keys (plan scope) are minted here and kept in memory on this instance only; keys with write scope are issued by the deployment owner. The dashboard needs none.</p></div>
</div></section>

<section><div class="w">
<p class="eyebrow">What you get</p>
<div class="grid3">
<div class="card"><h3>Ranked risk</h3><p class="note z">Exploited first, then severity, then EPSS.</p></div>
<div class="card"><h3>A plan you can read</h3><p class="note z">Stages, risk and rollback, in plain language.</p></div>
<div class="card"><h3>Evidence, not vibes</h3><p class="note z">Measured versus projected, always labelled.</p></div>
</div></div></section>

<section id="tools"><div class="w">
<p class="eyebrow">Tools</p>
<table><thead><tr><th>Tool</th><th>Scope</th><th>What it does</th></tr></thead><tbody>${tools}</tbody></table>
<p class="res"><b>Resources:</b> ${res}</p>
<p class="res"><b>Prompts:</b> modernize &middot; cve-triage &middot; watch-repo</p>
</div></section>
</main>
<footer><div class="w"><a href="${REPO_URL}">GitHub</a><a href="${README_URL}">README</a><span>v${e(VERSION)}</span></div></footer>
<script>${JS}</script></body></html>`;
}

// ---- request handling and route replacement ----
interface Req {
  protocol?: string;
  get?(name: string): string | undefined;
  headers?: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): unknown;
  send(body: string): unknown;
}

function header(req: Req, name: string): string {
  const v = req.get ? req.get(name) : req.headers?.[name.toLowerCase()];
  return (Array.isArray(v) ? v[0] : v ?? '').split(',')[0].trim();
}

// Public origin set by the deployment owner (same variable the report links use): http(s) only, no credentials/query.
function publicOrigin(): string | undefined {
  const raw = process.env.METAMORPH_PUBLIC_URL?.trim();
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}

export function endpointFor(req: Req): string {
  const configured = publicOrigin();
  if (configured) return `${configured}/mcp`;
  const fp = header(req, 'x-forwarded-proto').toLowerCase();
  const host = (header(req, 'x-forwarded-host') || header(req, 'host') || 'localhost').slice(0, 255);
  // NitroCloud's proxy does not send x-forwarded-proto: a non-local host behind it is served over https.
  const local = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i.test(host);
  const proto = fp === 'http' || fp === 'https' ? fp : req.protocol === 'https' || !local ? 'https' : 'http';
  return `${proto}://${host}/mcp`;
}

export function handleLanding(req: Req, res: Res): void {
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(renderLanding(endpointFor(req)));
}

interface LayerLike {
  route?: { path?: string; methods?: Record<string, boolean> };
}
export interface LandingApp {
  get(path: string, handler: (req: never, res: never) => void): unknown;
  router?: { stack?: LayerLike[] }; // Express 5
  _router?: { stack?: LayerLike[] }; // Express 4
}

// Removes the SDK's GET '/' layer, registers ours, and moves it into the freed position so anything registered after the
// SDK page keeps its order. Relies on Express internals (router.stack); if they are not found, ours is simply added.
export function installLanding(app: LandingApp, warn: (msg: string) => void = (m) => console.warn(m)): boolean {
  // Express 4 keeps the stack on _router (and its `router` getter throws); Express 5 on router.
  const stackOf = (read: () => LayerLike[] | undefined): LayerLike[] | undefined => {
    try {
      return read();
    } catch {
      return undefined;
    }
  };
  const stack = stackOf(() => app._router?.stack) ?? stackOf(() => app.router?.stack);
  const idx = stack ? stack.findIndex((l) => l.route?.path === '/' && l.route.methods?.get) : -1;
  if (stack && idx >= 0) stack.splice(idx, 1);
  app.get('/', ((req: Req, res: Res) => handleLanding(req, res)) as (req: never, res: never) => void);
  if (stack && idx >= 0 && stack.length > idx) stack.splice(idx, 0, stack.pop() as LayerLike);
  if (idx < 0) warn('landing: SDK GET / layer not found; custom page registered anyway and may be shadowed');
  return idx >= 0;
}
