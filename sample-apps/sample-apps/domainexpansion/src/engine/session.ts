/**
 * Attack session reconstruction — turns a flat finding list into a
 * minute-by-minute narrative of what one actor actually did, using only
 * data already in memory (records, templates, findings). No new detection
 * logic: this is pure presentation-shaping of facts the seven rules already
 * established, grouped and ordered by time instead of by rule.
 *
 * Two views of the same timeline:
 *   - `events`   — one entry per request, full resolution.
 *   - `groups`   — consecutive same-(template, method) events collapsed
 *                  into one entry with a count, so "340 sequential GETs to
 *                  /orders/{id}" reads as one line, not 340.
 * Both are pure, deterministic reductions of `events` — no LLM involved in
 * either. A raw path shown for storytelling ("...read /orders/8823...") is
 * always neutralise()'d first, same as every other untrusted string this
 * codebase ever serves.
 */

import type { AccessLogRecord, AttackSession, AttackSessionEvent, AttackSessionGroup, EndpointTemplate, Finding } from './types.js';
import { templatisePaths } from './templatise.js';
import { neutralise } from './sanitise.js';

export function reconstructAttackSession(
  actorSub: string,
  records: AccessLogRecord[],
  templates: EndpointTemplate[],
  findings: Finding[],
): AttackSession | null {
  const actorRecords = [...records]
    .filter((r) => r.actor.sub === actorSub)
    .sort((a, b) => (a.ts !== b.ts ? Date.parse(a.ts) - Date.parse(b.ts) : a.id.localeCompare(b.id)));

  if (actorRecords.length === 0) return null;

  const templateMap = templatisePaths(records.map((r) => r.path));
  const templateByName = new Map(templates.map((t) => [t.template, t]));

  const evidenceIndex = new Map<string, string[]>();
  for (const f of findings) {
    for (const recordId of f.evidence) {
      if (!evidenceIndex.has(recordId)) evidenceIndex.set(recordId, []);
      evidenceIndex.get(recordId)!.push(f.id);
    }
  }

  const distinctTemplateSet = new Set<string>();
  const distinctObjectIds = new Set<string>();
  const implicatedFindingIds = new Set<string>();

  // objectId is used only to build the group-level distinct-count and
  // sample — it never appears on the public per-event shape (the
  // neutralised `path` already carries it in context, and a raw,
  // un-neutralised concrete value is exactly the kind of log-derived
  // string the untrusted-input contract forbids serving directly).
  const objectIdByRecordId = new Map<string, string | null>();

  const events: AttackSessionEvent[] = actorRecords.map((r) => {
    const template = templateMap.get(r.path) ?? r.path;
    distinctTemplateSet.add(template);

    const templateInfo = templateByName.get(template);
    let objectId: string | null = null;
    if (templateInfo && templateInfo.params.length > 0) {
      const segs = r.path.split('/').filter((s) => s.length > 0);
      const lastParam = templateInfo.params[templateInfo.params.length - 1];
      const value = segs[lastParam.position];
      if (value !== undefined) {
        objectId = value;
        distinctObjectIds.add(`${template}::${value}`);
      }
    }
    objectIdByRecordId.set(r.id, objectId);

    const findingIds = evidenceIndex.get(r.id) ?? [];
    for (const id of findingIds) implicatedFindingIds.add(id);

    return {
      recordId: r.id,
      ts: r.ts,
      method: r.method,
      template,
      path: neutralise(r.path, 512, 'path'),
      status: r.status,
      findingIds,
    };
  });

  interface GroupBuilder {
    template: string;
    method: AccessLogRecord['method'];
    firstTs: string;
    lastTs: string;
    count: number;
    objectIds: Set<string>;
    sampleObjectId: string | null;
    findingIds: string[];
  }

  const groups: GroupBuilder[] = [];
  for (const event of events) {
    const objectId = objectIdByRecordId.get(event.recordId) ?? null;
    const last = groups[groups.length - 1];
    if (last && last.template === event.template && last.method === event.method) {
      last.count += 1;
      last.lastTs = event.ts;
      if (objectId !== null) last.objectIds.add(objectId);
      for (const id of event.findingIds) if (!last.findingIds.includes(id)) last.findingIds.push(id);
    } else {
      groups.push({
        template: event.template,
        method: event.method,
        firstTs: event.ts,
        lastTs: event.ts,
        count: 1,
        objectIds: objectId !== null ? new Set([objectId]) : new Set(),
        sampleObjectId: objectId !== null ? neutralise(objectId, 128, 'objectId') : null,
        findingIds: [...event.findingIds],
      });
    }
  }
  // objectIds is an internal accumulator (Set doesn't serialise to JSON
  // usefully) — finalise into the public distinctObjectIds count per group.
  const finalisedGroups: AttackSessionGroup[] = groups.map(({ objectIds, ...rest }) => ({ ...rest, distinctObjectIds: objectIds.size }));

  const from = actorRecords[0].ts;
  const to = actorRecords[actorRecords.length - 1].ts;
  const durationSeconds = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));

  const findingSummaries = [...implicatedFindingIds]
    .sort()
    .map((id) => findings.find((f) => f.id === id))
    .filter((f): f is Finding => f !== undefined)
    .map((f) => ({ id: f.id, rule: f.rule, severity: f.severity, template: f.template }));

  return {
    actorSub,
    eventCount: events.length,
    timeRange: { from, to },
    durationSeconds,
    distinctTemplates: distinctTemplateSet.size,
    distinctObjectIds: distinctObjectIds.size,
    findings: findingSummaries,
    groups: finalisedGroups,
    events,
  };
}
