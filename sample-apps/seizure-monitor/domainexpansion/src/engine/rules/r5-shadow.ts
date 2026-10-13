/**
 * R5_SHADOW — CWE-1059, Insufficient Documentation.
 *
 * When a spec was imported, "shadow" is exactly whatever diffSpec already
 * decided (template.documented === false — see spec.ts for why that
 * comparison is position-based, not name-based). Without a spec, falls back
 * to a heuristic: paths under known internal/debug/legacy prefixes, or
 * traffic in the bottom 15th percentile with no OPTIONS/HEAD (a proxy for
 * "nobody bothered to add this to routing metadata"). Severity starts at a
 * MEDIUM baseline; scoreFindings.ts escalates it when a shadow endpoint is
 * co-located with a more severe finding on the same template.
 *
 * API-shape pre-filter: running the no-spec heuristic against a real
 * static-file server (NASA-HTTP's July 1995 access logs — see the README's
 * real-data validation) produced 230 LOW-severity findings, essentially all
 * one-off .gif/.html/.txt files. That's not wrong exactly — those files
 * genuinely aren't in any API spec — but it's not what "shadow API
 * endpoint" is supposed to mean either, and it drowns out the handful of
 * findings that matter under noise. A path with no parameters whose final
 * segment has a recognisable static-asset extension is presumed to be a
 * document/asset, not an API route, and is excluded from heuristic-shadow
 * consideration entirely — this filter never touches spec-provided mode,
 * where a real spec already tells us definitively what counts.
 */

import type { EndpointTemplate, Finding } from '../types.js';
import type { DetectionContext } from './context.js';
import { CWE_MAP, findingId, capEvidence } from './context.js';

const SHADOW_PREFIX = /^\/(internal|_|v0|debug|legacy|tmp)/;

const STATIC_ASSET_EXTENSIONS = new Set([
  'html', 'htm', 'gif', 'jpg', 'jpeg', 'png', 'css', 'js', 'txt', 'pdf', 'ico',
  'svg', 'woff', 'woff2', 'ttf', 'eot', 'mp3', 'mp4', 'avi', 'mov', 'zip',
  'bak', 'doc', 'docx', 'xml', 'map',
]);

function looksLikeStaticAsset(template: string, hasParams: boolean): boolean {
  if (hasParams) return false; // a parameterised path is presumed API-shaped, whatever its extension
  const lastSeg = template.split('/').filter((s) => s.length > 0).pop() ?? '';
  const dotIndex = lastSeg.lastIndexOf('.');
  if (dotIndex <= 0) return false; // no extension, or a dotfile like ".well-known"
  const ext = lastSeg.slice(dotIndex + 1).toLowerCase();
  return STATIC_ASSET_EXTENSIONS.has(ext);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function isHeuristicShadow(t: EndpointTemplate, apiShapedCandidates: EndpointTemplate[]): boolean {
  if (looksLikeStaticAsset(t.template, t.params.length > 0)) return false;
  if (SHADOW_PREFIX.test(t.template)) return true;
  // Percentile computed only over API-shaped candidates, not the whole
  // traffic mix — a long tail of one-off static files would otherwise drag
  // the threshold down for everyone.
  const counts = apiShapedCandidates.map((x) => x.requestCount).sort((a, b) => a - b);
  const p15 = percentile(counts, 15);
  const hasOptionsOrHead = t.methods.includes('OPTIONS') || t.methods.includes('HEAD');
  return t.requestCount <= p15 && !hasOptionsOrHead;
}

export function detectR5Shadow(ctx: DetectionContext): Finding[] {
  const specProvided = ctx.documented.length > 0;
  let shadowTemplates: EndpointTemplate[];

  if (specProvided) {
    shadowTemplates = ctx.templates.filter((t) => !t.documented);
  } else {
    const apiShapedCandidates = ctx.templates.filter((t) => !looksLikeStaticAsset(t.template, t.params.length > 0));
    shadowTemplates = ctx.templates.filter((t) => isHeuristicShadow(t, apiShapedCandidates));
  }

  const { cwe, cweTitle } = CWE_MAP.R5_SHADOW;

  return shadowTemplates.map((t) => {
    const records = ctx.byTemplate.get(t.template) ?? [];
    const { evidence, evidenceTotalCount } = capEvidence(records.map((r) => r.id));
    const id = findingId('R5_SHADOW', t.template);
    return {
      id,
      rule: 'R5_SHADOW',
      cwe,
      cweTitle,
      template: t.template,
      methods: t.methods,
      severity: 'MEDIUM', // baseline; may be escalated by scoreFindings
      score: 0,
      title: 'Undocumented endpoint observed in production traffic',
      rationale: specProvided
        ? `${t.template} received ${t.requestCount} request(s) but does not appear in the imported OpenAPI spec.`
        : `${t.template} received ${t.requestCount} request(s) and matches the shadow-endpoint heuristic ` +
          `(internal/debug/legacy path prefix or low-traffic with no OPTIONS/HEAD support, among API-shaped ` +
          `endpoints only) — no spec was imported to confirm this directly.`,
      evidence,
      evidenceUri: `evidence://finding/${id}`,
      metrics: { requestCount: t.requestCount, distinctActors: t.distinctActors, evidenceTotalCount },
      documented: false,
    };
  });
}
