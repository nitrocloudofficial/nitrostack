// Report generation core: renders the requested formats, keeps them in a small in-memory cache and shapes the MCP
// tool result. Pure of network and repo access so it can be tested directly.
import { createHash } from 'node:crypto';
import { renderPdf } from './pdf.js';
import type { ReportData } from './report-data.js';
import { renderSarif } from './sarif.js';
import { renderSbom } from './sbom.js';

export type ReportFormat = 'pdf' | 'sarif' | 'sbom';
export const FORMATS: readonly ReportFormat[] = ['pdf', 'sarif', 'sbom'];

// Hard ceiling for embedding any file in the tool result (MCP payloads are JSON, base64 adds about 33%).
export const EMBED_LIMIT_BYTES = 1024 * 1024;
// With @Widget the SDK sets structuredContent to the handler's return value and the model-facing text is the JSON of that
// same value; the two cannot be separated. So inline copies are tiny: only as a fallback when no absolute download link
// exists, each file below 3 KB and at most 3 KB of data in total (a PDF never fits; use the resource). Larger limits broke the 20,000 character budget (24 KB limit: 61,903 characters measured by npm run conformance).
export const INLINE_LIMIT_BYTES = 3 * 1024; // small: the result is sent twice (text and structuredContent), see tests/unit/report-size.test.ts
export const INLINE_TOTAL_BYTES = 3 * 1024;
export const CACHE_MAX_ENTRIES = 5;
export const CACHE_TTL_MS = 10 * 60 * 1000;

export const SUFFIX: Record<ReportFormat, string> = { pdf: 'pdf', sarif: 'sarif', sbom: 'cdx.json' };
export const MIME: Record<ReportFormat, string> = { pdf: 'application/pdf', sarif: 'application/sarif+json', sbom: 'application/vnd.cyclonedx+json' };
export const URI_PREFIX = 'metamorph://report/';

export function reportUri(id: string, format: ReportFormat): string {
  return `${URI_PREFIX}${id}.${SUFFIX[format]}`;
}

export interface Artifact {
  format: ReportFormat;
  mimeType: string;
  data: Buffer; // pdf: PDF bytes; sarif/sbom: UTF-8 JSON
}

export class ReportCache {
  private entries = new Map<string, { at: number; owner: string; artifacts: Map<ReportFormat, Artifact> }>();
  constructor(
    private readonly now: () => number = Date.now,
    private readonly max = CACHE_MAX_ENTRIES,
    private readonly ttlMs = CACHE_TTL_MS
  ) {}

  // owner: short key id of the API key that requested the report ('anon' when auth is off)
  put(id: string, artifacts: Artifact[], owner: string = 'anon'): void {
    this.entries.delete(id); // re-insert moves it to the newest position
    this.entries.set(id, { at: this.now(), owner, artifacts: new Map(artifacts.map((a) => [a.format, a])) });
    this.sweep();
    while (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value as string);
  }

  get(id: string, format: ReportFormat): Artifact | undefined {
    this.sweep();
    const e = this.entries.get(id);
    if (!e) return undefined;
    this.entries.delete(id); // LRU: reading refreshes recency, not the TTL
    this.entries.set(id, e);
    return e.artifacts.get(format);
  }

  ownerOf(id: string): string | undefined {
    this.sweep();
    return this.entries.get(id)?.owner;
  }

  get size(): number {
    this.sweep();
    return this.entries.size;
  }

  private sweep(): void {
    const t = this.now();
    for (const [k, v] of this.entries) if (t - v.at > this.ttlMs) this.entries.delete(k);
  }
}

export const reportCache = new ReportCache();

// uri -> artifact for the @Resource handlers: metamorph://report/<id>.pdf | .sarif | .cdx.json
export function lookupResource(uri: string, cache: ReportCache = reportCache): Artifact | undefined {
  if (!uri.startsWith(URI_PREFIX)) return undefined;
  const name = uri.slice(URI_PREFIX.length);
  for (const f of FORMATS) {
    const suffix = `.${SUFFIX[f]}`;
    if (name.endsWith(suffix)) {
      const id = name.slice(0, -suffix.length);
      return /^[a-f0-9]{24}$/.test(id) ? cache.get(id, f) : undefined;
    }
  }
  return undefined;
}

export interface ReportFile {
  format: ReportFormat;
  label: string;
  fileName: string;
  bytes: number;
  mimeType: string;
  uri: string; // metamorph:// resource, readable for 10 minutes
  downloadUrl?: string; // absolute signed link (needs METAMORPH_PUBLIC_URL)
  downloadPath?: string; // signed path on this server, when no public URL is configured
  inline?: { encoding: 'base64' | 'utf8'; data: string }; // fallback only: no absolute link and file below INLINE_LIMIT_BYTES
}

export interface ReportSummary {
  reportId: string;
  score: { overall: number; origin: 'measured' };
  findings: { total: number; critical: number; high: number; medium: number; low: number; info: number };
  topFindings: Array<{ severity: string; title: string }>;
  pages: number;
  /** Only when include_cloud was true: whether the AWS scan ran and how many cloud findings it found (kept apart from `findings`). */
  cloud?: { status: 'scanned' | 'not-configured' | 'failed'; findings: number };
  files: ReportFile[];
  expiresInMinutes: number;
  message: string;
}

// How to link to a file: undefined when this server cannot issue links (no HTTP transport or no secret).
export interface LinkProvider {
  link(id: string, ext: string): { url?: string; path: string } | undefined;
  hint: string; // one sentence on why links are missing or relative
}

const LABEL: Record<ReportFormat, string> = { pdf: 'PDF report', sarif: 'SARIF 2.1.0 findings', sbom: 'CycloneDX 1.5 SBOM' };

// Always renders all three formats; there is no format option.
export async function generateReport(data: ReportData, links?: LinkProvider, cache: ReportCache = reportCache, ownerKeyId: string = 'anon'): Promise<ReportSummary> {
  const artifacts: Artifact[] = [];
  let pages = 0;
  for (const format of FORMATS) {
    if (format === 'pdf') {
      const r = await renderPdf(data);
      pages = r.pages;
      artifacts.push({ format, mimeType: MIME.pdf, data: r.buffer });
    } else {
      const text = format === 'sarif' ? renderSarif(data) : renderSbom(data);
      artifacts.push({ format, mimeType: MIME[format], data: Buffer.from(text, 'utf8') });
    }
  }
  // The owner is part of the id: two keys that produce identical files get different ids, so one can never overwrite the other's entry.
  const h = createHash('sha256').update(`owner:${ownerKeyId}\n`);
  for (const a of artifacts) h.update(a.format).update(a.data);
  const reportId = h.digest('hex').slice(0, 24);
  cache.put(reportId, artifacts, ownerKeyId);

  const counts = Object.fromEntries(data.counts.map((c) => [c.severity, c.count.value])) as Record<string, number>;
  let absolute = true;
  let anyLink = false;
  const files: ReportFile[] = artifacts.map((a) => {
    const ext = SUFFIX[a.format];
    const l = links?.link(reportId, ext);
    const file: ReportFile = {
      format: a.format,
      label: LABEL[a.format],
      fileName: `metamorph-report-${reportId.slice(0, 8)}.${ext}`,
      bytes: a.data.length,
      mimeType: a.mimeType,
      uri: reportUri(reportId, a.format)
    };
    if (l) {
      anyLink = true;
      if (l.url) file.downloadUrl = l.url;
      else {
        file.downloadPath = l.path;
        absolute = false;
      }
    } else absolute = false;
    return file;
  });
  if (!absolute) {
    // No clickable link: put small files inline so the user can still save them (see INLINE_LIMIT_BYTES).
    let budget = INLINE_TOTAL_BYTES;
    for (const f of [...files].sort((x, y) => x.bytes - y.bytes)) {
      const a = artifacts.find((x) => x.format === f.format) as Artifact;
      if (a.data.length >= INLINE_LIMIT_BYTES) continue;
      const inline: ReportFile['inline'] = a.format === 'pdf' ? { encoding: 'base64', data: a.data.toString('base64') } : { encoding: 'utf8', data: a.data.toString('utf8') };
      if (inline.data.length > budget) continue;
      budget -= inline.data.length;
      f.inline = inline;
    }
  }
  const lines = files.map((f) => `${f.label} (${Math.round(f.bytes / 1024)} KB): ${f.downloadUrl ?? f.downloadPath ?? f.uri}`);
  const message = [
    absolute ? 'Download links (valid 10 minutes):' : anyLink ? `Links are relative paths on the server. ${links?.hint ?? ''}` : (links?.hint ?? 'Download links are not available on this server.'),
    ...lines,
    absolute ? '' : 'The files are also readable as MCP resources for 10 minutes' + (files.some((f) => f.inline) ? ', and small files are included inline in this result.' : '.')
  ]
    .filter(Boolean)
    .join('\n');
  return {
    reportId,
    score: { overall: data.score.value, origin: 'measured' },
    findings: {
      total: data.findings.length,
      critical: counts.critical ?? 0,
      high: counts.high ?? 0,
      medium: counts.medium ?? 0,
      low: counts.low ?? 0,
      info: counts.info ?? 0
    },
    topFindings: data.findings.slice(0, 3).map((f) => ({ severity: f.severity, title: f.title })),
    pages,
    ...(data.cloud ? { cloud: { status: data.cloud.status, findings: data.cloud.findingsTotal } } : {}),
    files,
    expiresInMinutes: CACHE_TTL_MS / 60000,
    message
  };
}
