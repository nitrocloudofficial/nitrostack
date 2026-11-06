import type { Severity } from './signal.js';

export interface PatternHit {
  id: string;
  category: 'obfuscation' | 'exec' | 'credentials' | 'exfil' | 'wallet' | 'ai-agent-abuse' | 'persistence';
  severity: Severity;
  snippet: string;
  line: number;
  /** Trimmed source line, or a 160-character window for long lines. */
  sourceLine?: string;
  sourceWindow?: boolean;
}

export function shannonEntropy(text: string): number {
  if (!text.length) return 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < text.length; i++) counts.set(text[i], (counts.get(text[i]) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / text.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

export function isMinified(text: string): boolean {
  let lines = 1;
  let length = 0;
  let whitespace = 0;
  for (const char of text) {
    if (char === '\n') { lines++; length = 0; }
    else if (++length > 5_000) return true;
    if (/\s/.test(char)) whitespace++;
  }
  return text.length > 200 && text.length / lines > 200 && whitespace / text.length < 0.12;
}

export const SOURCE_HEAD = 2 * 1024 * 1024;
export const SOURCE_TAIL = 256 * 1024;
export const MAX_SOURCE_SCAN = SOURCE_HEAD + SOURCE_TAIL;

type Rule = [string, PatternHit['category'], Severity, RegExp];
const RULES: Rule[] = [
  ['child-process', 'exec', 'warn', /(?:require\s*\(\s*['"](?:node:)?child_process['"]\s*\)|\bimport\s*(?:['"](?:node:)?child_process['"]|\(\s*['"](?:node:)?child_process['"])|\bimport\b[^;'"]{0,1000}\bfrom\s*['"](?:node:)?child_process['"])/],
  ['eval', 'exec', 'warn', /\beval\s*\(/],
  ['new-function', 'exec', 'warn', /\bnew\s+Function\s*\(/],
  ['environment-dump', 'credentials', 'high', /(?:Object\s*\.\s*keys|JSON\s*\.\s*stringify)\s*\(\s*process\s*\.\s*env\b/],
  ['credential-path', 'credentials', 'high', /\.(?:npmrc\b|ssh[/\\]id_|aws[/\\]credentials\b|config[/\\]gh\b|gitconfig\b)/i],
  ['exfil-host', 'exfil', 'high', /(?:webhook\.site|discord\.com\/api\/webhooks|pastebin\.com|\bngrok(?:\.[a-z]+)?|transfer\.sh)/i],
  ['raw-ip-url', 'exfil', 'high', /https?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?=[:/\s'"\x60]|$)/i],
  ['github-repo-creation', 'exfil', 'high', /api\.github\.com\/user\/repos/i],
  ['trufflehog', 'credentials', 'high', /\btrufflehog\b/i],
  ['ethereum-hook', 'wallet', 'warn', /\bwindow\s*\.\s*ethereum\b/],
  ['solana-hook', 'wallet', 'warn', /\bsolana\b/i],
  ['xhr-hook', 'wallet', 'warn', /\bXMLHttpRequest\s*\.\s*prototype\b/],
  ['fetch-reassignment', 'wallet', 'warn', /(?:\b(?:window|globalThis|global|self)\s*\.\s*)?\bfetch\s*=(?!=|>)/],
  ['ai-cli-bypass', 'ai-agent-abuse', 'high', /--(?:dangerously-skip-permissions|yolo|trust-all-tools)\b/],
  ['shell-rc', 'persistence', 'high', /\.(?:bashrc|zshrc)\b/],
  ['github-workflow', 'persistence', 'high', /\.github[/\\]workflows(?:[/\\]|\b)/],
  ['detached-exec', 'exec', 'high', /\b(?:execFileSync|spawn)\s*\([\s\S]{0,500}?\bdetached\s*:\s*true/],
  ['runtime-download', 'exec', 'high', /(?:oven-sh\/bun\/releases|bun\.sh\/install|\bcurl\b[^\n|]{0,500}\|\s*(?:ba)?sh\b)/i],
  ['agent-autorun', 'ai-agent-abuse', 'high', /(?:\.claude[/\\]settings\.json|\bSessionStart\b|\.vscode[/\\]tasks\.json|\bfolderOpen\b|\.cursor[/\\])/],
  ['blockchain-rpc', 'exfil', 'high', /(?:cloudflare-eth\.com|(?:eth-mainnet|mainnet)\.g\.alchemy\.com|mainnet\.infura\.io|ethereum-rpc\.publicnode\.com|rpc\.ankr\.com\/eth)/i],
];

/** Heuristics only: findings describe suspicious structure, never execute source. */
export function scanSource(path: string, text: string): PatternHit[] {
  // Also bound direct callers; the release scanner samples bytes before decoding.
  if (text.length > MAX_SOURCE_SCAN) text = text.slice(0, SOURCE_HEAD) + '\n' + text.slice(-SOURCE_TAIL);
  const hits: PatternHit[] = [];
  const lineStarts = [0];
  for (let index = 0; index < text.length; index++) if (text[index] === '\n') lineStarts.push(index + 1);
  const add = (id: string, category: PatternHit['category'], severity: Severity, index: number,
    snippet?: string) => {
    let low = 0;
    let high = lineStarts.length;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      if (lineStarts[middle] <= index) low = middle;
      else high = middle;
    }
    const start = lineStarts[low];
    const end = low + 1 < lineStarts.length ? lineStarts[low + 1] - 1 : text.length;
    const sourceWindow = end - start > 400;
    const windowStart = Math.max(start, Math.min(index - 80, end - 160));
    const sourceLine = sourceWindow ? text.slice(windowStart, windowStart + 160) : text.slice(start, end).trim();
    hits.push({ id, category, severity, sourceLine, sourceWindow,
      snippet: (snippet ?? text.slice(index, index + 120)).replace(/[\r\n\t]/g, ' ').slice(0, 120),
      line: low + 1 });
  };
  for (const [id, category, severity, pattern] of RULES) {
    const seen = new Set<string>();
    for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags + 'g'))) {
      add(id, category, severity, match.index);
      const hit = hits[hits.length - 1];
      if (seen.has(hit.sourceLine!)) hits.pop();
      else seen.add(hit.sourceLine!);
    }
  }
  let identifierCount = 0;
  let firstIdentifier = 0;
  for (const match of text.matchAll(/\b_0x[0-9a-f]{4,}\b/gi)) {
    if (identifierCount++ === 0) firstIdentifier = match.index;
    if (identifierCount === 20) break;
  }
  if (identifierCount >= 20) add('hex-identifiers', 'obfuscation', 'warn', firstIdentifier);
  let escapeCount = 0;
  let firstEscape = 0;
  for (const match of text.matchAll(/\\x[0-9a-f]{2}/gi)) {
    if (escapeCount++ === 0) firstEscape = match.index;
  }
  if (escapeCount > 30 * Buffer.byteLength(text) / 1024) {
    add('hex-escape-density', 'obfuscation', 'warn', firstEscape);
  }
  if (!/\.min\.js$/i.test(path)) {
    const longLine = /^.{5001}/m.exec(text);
    if (longLine) add('long-line', 'obfuscation', 'warn', longLine.index);
  }
  const bytes = Buffer.byteLength(text);
  const entropy = bytes > 2 * 1024 ? shannonEntropy(text) : 0;
  if (entropy > 5.2) add('high-entropy', 'obfuscation', 'warn', 0,
    `Shannon entropy ${entropy.toFixed(2)} bits/char across ${bytes} bytes`);
  if (bytes > 300 * 1024 && entropy > 5.5) add('packed-payload', 'obfuscation', 'high', 0,
    `encrypted/packed payload: ${bytes} bytes, entropy ${entropy.toFixed(2)} bits/char`);
  const addresses = new Set<string>();
  let firstAddress: number | undefined;
  for (const match of text.matchAll(/\b0x[a-f0-9]{40}\b/gi)) {
    firstAddress ??= match.index;
    addresses.add(match[0].toLowerCase());
    if (addresses.size === 3) break;
  }
  if (addresses.size >= 3) add('multiple-wallet-addresses', 'wallet', 'warn', firstAddress!);
  const call = /\beth_call\b/.exec(text);
  if (call && addresses.size) add('blockchain-dead-drop', 'exfil', 'high', call.index);
  if (/(?:^|\/)binding\.gyp$/i.test(path)) {
    add('native-install', 'exec', 'high', 0, 'binding.gyp runs node-gyp during installation');
  }
  return hits;
}
