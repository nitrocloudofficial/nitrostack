/**
 * OpenAPI spec parsing and diffing against observed traffic.
 *
 * The critical design point: a published spec may name a path parameter
 * differently from how our own templatise.ts names it ("/orders/{order_id}"
 * vs our "/orders/{orderId}"). Comparing by name would misclassify every
 * such endpoint as shadow. So diffSpec never looks at parameter names — it
 * normalises both sides to "static segments + position" and compares that.
 */

import type { EndpointTemplate } from './types.js';

/**
 * Extracts path keys from an OpenAPI document. Works for both OpenAPI 2.0
 * (Swagger) and 3.x — both put the path map under a top-level "paths" key,
 * so no version branching is needed. $ref-heavy documents are tolerated
 * because we only ever read the path KEYS, never resolve into an operation's
 * schema — resolving refs would require follow-on lookups we don't need.
 */
export function parseOpenApiTemplates(spec: unknown): string[] {
  if (typeof spec !== 'object' || spec === null) return [];
  const paths = (spec as { paths?: unknown }).paths;
  if (typeof paths !== 'object' || paths === null) return [];
  return Object.keys(paths);
}

/** Normalises a path/template to "static segments + param positions", stripping param names. */
function normalizeShape(pathOrTemplate: string): string {
  return pathOrTemplate
    .split('/')
    .filter((s) => s.length > 0)
    .map((seg) => (seg.startsWith('{') && seg.endsWith('}') ? '{}' : seg))
    .join('/');
}

export interface DiffSpecResult {
  shadow: EndpointTemplate[];
  documented: EndpointTemplate[];
  orphanedInSpec: string[];
}

/**
 * documented is the RAW list of spec path strings (spec's own parameter
 * names, e.g. from parseOpenApiTemplates) — not pre-normalised. observed is
 * our own EndpointTemplate[] (e.g. from aggregateEndpoints). The `documented`
 * flag on returned EndpointTemplate objects reflects this diff's decision,
 * not whatever flag the input objects already carried.
 */
export function diffSpec(observed: EndpointTemplate[], documented: string[]): DiffSpecResult {
  const specShapeToRaw = new Map<string, string>();
  for (const raw of documented) {
    const shape = normalizeShape(raw);
    if (!specShapeToRaw.has(shape)) specShapeToRaw.set(shape, raw);
  }

  const matchedShapes = new Set<string>();
  const documentedOut: EndpointTemplate[] = [];
  const shadowOut: EndpointTemplate[] = [];

  for (const ep of observed) {
    const shape = normalizeShape(ep.template);
    if (specShapeToRaw.has(shape)) {
      matchedShapes.add(shape);
      documentedOut.push({ ...ep, documented: true });
    } else {
      shadowOut.push({ ...ep, documented: false });
    }
  }

  const orphanedInSpec = [...specShapeToRaw.entries()]
    .filter(([shape]) => !matchedShapes.has(shape))
    .map(([, raw]) => raw)
    .sort();

  documentedOut.sort((a, b) => a.template.localeCompare(b.template));
  shadowOut.sort((a, b) => a.template.localeCompare(b.template));

  return { shadow: shadowOut, documented: documentedOut, orphanedInSpec };
}
