/**
 * Persistence layer for the `findings` / `finding_events` collections
 * (MongoDB Atlas, database `warden`). Upsert-on-dedupe_key: the same
 * real-world finding seen again bumps occurrence_count and logs a
 * `reoccurred` event instead of creating a duplicate document — this is
 * what makes analyze_finding_history's "has this happened before" answer
 * possible.
 *
 * Same exported functions/types as the original Postgres/Supabase version
 * of this file — findings.tools.ts and triage.tools.ts are unchanged.
 */

import { ObjectId } from "mongodb";
import { getWardenDb } from "../../data/mongo.client.js";
import type { FindingClass } from "../triage/triage-rules.js";
import type { Complexity } from "./priority-complexity.js";
import type { Priority } from "../remediation/priority.js";

export type FindingStatus = "open" | "suggested" | "applied_externally" | "resolved" | "dismissed";

export interface FindingRecord {
  id: string;
  dedupe_key: string;
  source: string;
  finding_class: FindingClass;
  package_name: string | null;
  cve: string | null;
  indicator: string | null;
  priority: Priority | null;
  complexity: Complexity | null;
  fixable: boolean;
  route: string | null;
  description: string;
  suggested_solution: string | null;
  status: FindingStatus;
  investigation_id: string | null;
  raw_evidence: unknown;
  first_seen_at: string;
  last_seen_at: string;
  occurrence_count: number;
  created_at: string;
  updated_at: string;
}

interface FindingDoc {
  _id: ObjectId;
  dedupe_key: string;
  source: string;
  finding_class: FindingClass;
  package_name: string | null;
  cve: string | null;
  indicator: string | null;
  priority: Priority | null;
  complexity: Complexity | null;
  fixable: boolean;
  route: string | null;
  description: string;
  suggested_solution: string | null;
  status: FindingStatus;
  investigation_id: string | null;
  raw_evidence: unknown;
  first_seen_at: Date;
  last_seen_at: Date;
  occurrence_count: number;
  created_at: Date;
  updated_at: Date;
}

function toRecord(doc: FindingDoc): FindingRecord {
  return {
    id: doc._id.toHexString(),
    dedupe_key: doc.dedupe_key,
    source: doc.source,
    finding_class: doc.finding_class,
    package_name: doc.package_name,
    cve: doc.cve,
    indicator: doc.indicator,
    priority: doc.priority,
    complexity: doc.complexity,
    fixable: doc.fixable,
    route: doc.route,
    description: doc.description,
    suggested_solution: doc.suggested_solution,
    status: doc.status,
    investigation_id: doc.investigation_id,
    raw_evidence: doc.raw_evidence,
    first_seen_at: doc.first_seen_at.toISOString(),
    last_seen_at: doc.last_seen_at.toISOString(),
    occurrence_count: doc.occurrence_count,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
  };
}

export interface UpsertFindingInput {
  dedupe_key: string;
  source: string;
  finding_class: FindingClass;
  package_name?: string | null;
  cve?: string | null;
  indicator?: string | null;
  priority?: Priority | null;
  complexity?: Complexity | null;
  fixable: boolean;
  route?: string | null;
  description: string;
  suggested_solution?: string | null;
  investigation_id?: string | null;
  raw_evidence?: unknown;
}

export async function upsertFinding(input: UpsertFindingInput): Promise<{ finding: FindingRecord; is_new: boolean }> {
  const db = await getWardenDb();
  const findings = db.collection<FindingDoc>("findings");
  const events = db.collection("finding_events");

  const existing = await findings.findOne({ dedupe_key: input.dedupe_key });
  const now = new Date();

  if (existing) {
    const updated = await findings.findOneAndUpdate(
      { _id: existing._id },
      {
        $set: {
          last_seen_at: now,
          updated_at: now,
          priority: input.priority ?? existing.priority,
          complexity: input.complexity ?? existing.complexity,
          route: input.route ?? existing.route,
          description: input.description ?? existing.description,
          suggested_solution: input.suggested_solution ?? existing.suggested_solution,
        },
        $inc: { occurrence_count: 1 },
      },
      { returnDocument: "after" }
    );
    if (!updated) throw new Error("Failed to update finding: no document returned.");

    await events.insertOne({
      finding_id: existing._id,
      event_type: "reoccurred",
      detail: { occurrence_count: updated.occurrence_count, source: input.source },
      occurred_at: now,
    });

    return { finding: toRecord(updated), is_new: false };
  }

  const doc: Omit<FindingDoc, "_id"> = {
    dedupe_key: input.dedupe_key,
    source: input.source,
    finding_class: input.finding_class,
    package_name: input.package_name ?? null,
    cve: input.cve ?? null,
    indicator: input.indicator ?? null,
    priority: input.priority ?? null,
    complexity: input.complexity ?? null,
    fixable: input.fixable,
    route: input.route ?? null,
    description: input.description,
    suggested_solution: input.suggested_solution ?? null,
    status: input.fixable ? "suggested" : "open",
    investigation_id: input.investigation_id ?? null,
    raw_evidence: input.raw_evidence ?? null,
    first_seen_at: now,
    last_seen_at: now,
    occurrence_count: 1,
    created_at: now,
    updated_at: now,
  };
  const inserted = await findings.insertOne(doc as FindingDoc);

  await events.insertOne({
    finding_id: inserted.insertedId,
    event_type: "created",
    detail: { source: input.source, finding_class: input.finding_class },
    occurred_at: now,
  });

  return { finding: toRecord({ ...doc, _id: inserted.insertedId } as FindingDoc), is_new: true };
}

export interface QueryFindingsFilters {
  finding_class?: string;
  fixable?: boolean;
  status?: FindingStatus;
  priority?: Priority;
  sort_by?: "priority" | "complexity" | "last_seen_at" | "occurrence_count";
  sort_dir?: "asc" | "desc";
  limit?: number;
}

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const COMPLEXITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export async function queryFindings(filters: QueryFindingsFilters): Promise<FindingRecord[]> {
  const db = await getWardenDb();
  const findings = db.collection<FindingDoc>("findings");

  const query: Record<string, unknown> = {};
  if (filters.finding_class) query.finding_class = filters.finding_class;
  if (filters.fixable !== undefined) query.fixable = filters.fixable;
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;

  const docs = await findings.find(query).limit(filters.limit ?? 100).toArray();
  let rows = docs.map(toRecord);

  switch (filters.sort_by) {
    case "priority":
      rows = rows.sort((a, b) => (PRIORITY_ORDER[a.priority ?? ""] ?? 9) - (PRIORITY_ORDER[b.priority ?? ""] ?? 9));
      break;
    case "complexity":
      rows = rows.sort((a, b) => (COMPLEXITY_ORDER[a.complexity ?? ""] ?? 9) - (COMPLEXITY_ORDER[b.complexity ?? ""] ?? 9));
      break;
    case "occurrence_count":
      rows = rows.sort((a, b) => b.occurrence_count - a.occurrence_count);
      break;
    default:
      rows = rows.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
  }
  if (filters.sort_dir === "asc") rows = rows.reverse();
  return rows;
}

export interface FindingEventRecord {
  id: string;
  finding_id: string;
  event_type: string;
  detail: unknown;
  occurred_at: string;
}

export async function getFindingHistory(dedupeKey: string): Promise<{ finding: FindingRecord | null; events: FindingEventRecord[] }> {
  const db = await getWardenDb();
  const findings = db.collection<FindingDoc>("findings");
  const events = db.collection("finding_events");

  const finding = await findings.findOne({ dedupe_key: dedupeKey });
  if (!finding) return { finding: null, events: [] };

  const eventDocs = await events
    .find({ finding_id: finding._id })
    .sort({ occurred_at: 1 })
    .toArray();

  const eventRecords: FindingEventRecord[] = eventDocs.map((e) => ({
    id: (e._id as ObjectId).toHexString(),
    finding_id: (e.finding_id as ObjectId).toHexString(),
    event_type: e.event_type as string,
    detail: e.detail,
    occurred_at: (e.occurred_at as Date).toISOString(),
  }));

  return { finding: toRecord(finding), events: eventRecords };
}
