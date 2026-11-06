import { Injectable } from '@nitrostack/core';
import { createHash } from 'node:crypto';
import { isMinified, scanSource, shannonEntropy, MAX_SOURCE_SCAN, SOURCE_HEAD, SOURCE_TAIL, type PatternHit } from '../code-patterns.js';
import { SEVERITY_WEIGHT, type AnalysisContext, type Finding, type Severity, type Signal } from '../signal.js';

const MB = 1024 * 1024;
const RELEASE_SCAN_BUDGET = 24 * MB;
const INSTALL_EVENTS = new Set(['preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'prepare', 'postprepare']);
const LOWER: Record<Severity, Severity> = { critical: 'high', high: 'warn', warn: 'info', info: 'info' };

function scriptReferences(script: string, path: string): boolean {
  const normalize = (value: string) => value.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
  return (script.match(/"[^"]*"|'[^']*'|[^\s;&|<>]+/g) ?? []).some(token => {
    const value = token.replace(/^['"]|['"]$/g, '');
    return normalize(value) === path || (value.includes('=') && normalize(value.slice(value.indexOf('=') + 1)) === path);
  });
}

@Injectable()
export class CodeDiffSignal implements Signal {
  readonly id = 'code-diff';

  async evaluate(ctx: AnalysisContext & { signal?: AbortSignal; deadline?: number }): Promise<Finding[]> {
    const incomplete: Finding[] = [];
    const warn = (reason: string, evidence: string[] = []) => incomplete.push({ signal: this.id,
      severity: 'warn', title: `Code comparison incomplete: ${reason}`, evidence, weight: SEVERITY_WEIGHT.warn, incomplete: true });
    try {
      const previous = ctx.baseline[0];
      const target = await ctx.loadFiles(ctx.target.version);
      const baseline = previous ? await ctx.loadFiles(previous.version) : new Map<string, Uint8Array>();
      const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
      const diff: { path: string; kind: 'added' | 'changed' | 'removed' }[] = [];
      for (const [path, bytes] of target) {
        const old = baseline.get(path);
        if (!old) diff.push({ path, kind: 'added' });
        else if (hash(bytes) !== hash(old)) diff.push({ path, kind: 'changed' });
      }
      for (const path of baseline.keys()) if (!target.has(path)) diff.push({ path, kind: 'removed' });

      const scripts = Object.entries(ctx.target.scripts ?? {}).filter(([event]) => INSTALL_EVENTS.has(event));
      const newScripts = scripts.filter(([event, command]) => previous?.scripts?.[event] !== command);
      const findings = new Map<PatternHit['category'], Finding>();
      const report = (path: string, hit: PatternHit, severity: Severity) => {
        const effective = previous ? severity : LOWER[severity];
        const evidence = `${path}:${hit.line} [${hit.id}] ${hit.snippet.slice(0, 120)}`;
        const current = findings.get(hit.category);
        if (!current) {
          findings.set(hit.category, { signal: this.id, severity: effective,
            title: `Suspicious ${hit.category} in release code${previous ? '' : ' (no previous release to compare)'}`,
            evidence: [evidence], weight: SEVERITY_WEIGHT[effective] });
        } else {
          if (SEVERITY_WEIGHT[effective] > current.weight) {
            current.severity = effective;
            current.weight = SEVERITY_WEIGHT[effective];
            // Keep the evidence supporting the highest severity visible even after the cap.
            current.evidence.unshift(evidence);
            current.evidence = current.evidence.slice(0, 5);
          } else if (current.evidence.length < 5 && !current.evidence.includes(evidence)) current.evidence.push(evidence);
        }
      };

      let scannedBytes = 0;
      let skippedFiles = 0;
      let cancelledFiles = 0;
      const readSource = (path: string, bytes: Uint8Array): Buffer | undefined => {
        const size = Math.min(bytes.byteLength, MAX_SOURCE_SCAN);
        if (ctx.signal?.aborted || (ctx.deadline !== undefined && Date.now() >= ctx.deadline)) {
          cancelledFiles++;
          return undefined;
        }
        if (scannedBytes + size > RELEASE_SCAN_BUDGET) {
          skippedFiles++;
          return undefined;
        }
        scannedBytes += size;
        if (bytes.byteLength > MAX_SOURCE_SCAN) {
          // Big bundles (typescript.js is ~9 MB) are normal; note the partial scan without risk weight.
          incomplete.push({ signal: this.id, severity: 'info', title: `Code scanned partially: ${path}`,
            evidence: [`${bytes.byteLength} bytes; scanned first 2 MB and last 256 KB`], weight: 0, incomplete: true });
          return Buffer.concat([bytes.subarray(0, SOURCE_HEAD), Buffer.from('\n'), bytes.subarray(-SOURCE_TAIL)]);
        }
        return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      };
      let beforeLines: Set<string> | undefined;
      const beforeTexts: string[] = [];
      const beforePatterns = new Set<string>();
      const previousLines = (): Set<string> => {
        if (beforeLines) return beforeLines;
        beforeLines = new Set<string>();
        for (const [path, bytes] of baseline) {
          if (!/\.(?:js|cjs|mjs)$/i.test(path)) continue;
          const source = readSource(path, bytes);
          if (!source) continue;
          const text = source.toString('utf8');
          beforeTexts.push(text);
          for (const hit of scanSource(path, text)) beforePatterns.add(hit.id);
          let start = 0;
          while (start <= text.length) {
            const newline = text.indexOf('\n', start);
            const end = newline < 0 ? text.length : newline;
            if (end - start <= 400) beforeLines.add(text.slice(start, end).trim());
            if (newline < 0) break;
            start = newline + 1;
          }
        }
        return beforeLines;
      };

      for (const { path, kind } of diff) {
        if (kind === 'removed') continue;
        const bytes = target.get(path)!;
        const js = /\.(?:js|cjs|mjs)$/i.test(path);
        const referenced = scripts.some(([, command]) => scriptReferences(command, path));
        const newInstall = newScripts.some(([, command]) => scriptReferences(command, path));
        const installEntry = newInstall || (kind === 'added' && referenced);
        // Inspect auto-run paths even when their contents are not JavaScript.
        let hits = scanSource(path, path).filter(hit => hit.id === 'agent-autorun' || hit.id === 'native-install');
        // Build the baseline once, within the same release budget as target scanning.
        if (previous && !installEntry) previousLines();
        const needsSource = js || referenced || (kind === 'added' && bytes.byteLength > 300 * 1024);
        const source = needsSource ? readSource(path, bytes) : undefined;
        if (needsSource && !source) continue;
        const text = source?.toString('utf8') ?? '';
        if (js || referenced) hits = hits.concat(scanSource(path, text));
        if (kind === 'added' && bytes.byteLength > 300 * 1024 && source) {
          // Latin-1 preserves binary diversity, within the same bounded source sample.
          const entropy = shannonEntropy(source.toString('latin1'));
          if (entropy > 5.5) hits.push({ id: 'packed-payload', category: 'obfuscation', severity: 'high',
            line: 1, sourceLine: text.slice(0, 160), sourceWindow: true,
            snippet: `encrypted/packed payload: ${bytes.byteLength} bytes, entropy ${entropy.toFixed(2)} bits/char` });
        }
        hits = hits.filter(hit => kind === 'added' || (hit.id !== 'native-install' && hit.id !== 'packed-payload'));
        if (kind === 'added' && js && bytes.byteLength > 500 * 1024 && isMinified(text)) {
          hits.push({ id: 'large-minified-file', category: 'obfuscation', severity: 'warn',
            line: 1, sourceLine: text.slice(0, 160), sourceWindow: true,
            snippet: `New minified JavaScript file: ${bytes.byteLength} bytes` });
        }
        // Compute combinations before novelty filtering: unchanged exec next to a new
        // credential upload still supplies the dangerous context for that new line.
        const allHits = hits;
        if (previous && !installEntry) {
          const before = previousLines();
          hits = hits.filter(hit => !hit.sourceLine || (hit.sourceWindow
            ? !beforeTexts.some(text => text.includes(hit.sourceLine!))
            : !before.has(hit.sourceLine)));
        }
        const walletObfuscation = hits.some(hit => hit.category === 'wallet')
          && hits.some(hit => hit.category === 'obfuscation');
        // A lone credential path or exfil host (e.g. ".npmrc" in a deny list) is weak; next to
        // process execution, obfuscation or AI-agent abuse in the same file it is a stealer.
        const stealerContext = allHits.some(hit => ['exec', 'obfuscation', 'ai-agent-abuse'].includes(hit.category));
        for (const hit of hits) {
          let severity = hit.severity;
          if (hit.category === 'ai-agent-abuse') severity = 'high';
          if (['exfil', 'credentials'].includes(hit.category)) severity = stealerContext ? 'high' : 'warn';
          if (newInstall) severity = hit.category !== 'exec' || allHits.some(other => other.category !== 'exec') ? 'critical' : 'high';
          if (walletObfuscation && ['wallet', 'obfuscation'].includes(hit.category)) severity = 'critical';
          // Repeated low-risk capabilities in changed bundles carry no new risk weight.
          // Keep combinations above intact, and never relax added or install-run code.
          if (kind === 'changed' && !referenced && severity === 'warn'
            && (hit.category === 'exec' || hit.category === 'obfuscation')
            && beforePatterns.has(hit.id)) severity = 'info';
          report(path, hit, severity);
        }
      }
      if (skippedFiles) warn(`code scan budget exceeded, ${skippedFiles} files not scanned`);
      if (cancelledFiles) warn(`check deadline exceeded or cancelled, ${cancelledFiles} files not scanned`);
      return [...findings.values(), ...incomplete];
    } catch (error) {
      const reason = (error instanceof Error ? error.message : String(error)).replace(/[\r\n]/g, ' ').slice(0, 200);
      warn(reason);
      return incomplete;
    }
  }
}
