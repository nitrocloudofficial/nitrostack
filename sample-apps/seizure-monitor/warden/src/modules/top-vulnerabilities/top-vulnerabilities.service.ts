/**
 * Persistence layer for the `top_vulnerabilities` collection (MongoDB Atlas,
 * database `warden`). Stores the top 3 vulnerabilities ranked by priority and
 * impact. Supports upsert, query, and deletion operations.
 */

import { ObjectId } from "mongodb";
import { getWardenDb } from "../../data/mongo.client.js";

export type VulnerabilitySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface TopVulnerabilityRecord {
  id: string;
  rank: number; // 1, 2, or 3
  cve_id: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  cvss_score: number; // 0-10
  affected_systems: string[];
  remediation_steps: string[];
  references: string[];
  first_detected_at: string;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
}

interface TopVulnerabilityDoc {
  _id: ObjectId;
  rank: number;
  cve_id: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  cvss_score: number;
  affected_systems: string[];
  remediation_steps: string[];
  references: string[];
  first_detected_at: Date;
  last_updated_at: Date;
  created_at: Date;
  updated_at: Date;
}

function toRecord(doc: TopVulnerabilityDoc): TopVulnerabilityRecord {
  return {
    id: doc._id.toHexString(),
    rank: doc.rank,
    cve_id: doc.cve_id,
    title: doc.title,
    description: doc.description,
    severity: doc.severity,
    cvss_score: doc.cvss_score,
    affected_systems: doc.affected_systems,
    remediation_steps: doc.remediation_steps,
    references: doc.references,
    first_detected_at: doc.first_detected_at.toISOString(),
    last_updated_at: doc.last_updated_at.toISOString(),
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
  };
}

export interface UpsertTopVulnerabilityInput {
  rank: number; // 1, 2, or 3
  cve_id: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  cvss_score: number;
  affected_systems?: string[];
  remediation_steps?: string[];
  references?: string[];
}

export async function upsertTopVulnerability(
  input: UpsertTopVulnerabilityInput
): Promise<{ vulnerability: TopVulnerabilityRecord; is_new: boolean }> {
  const db = await getWardenDb();
  const vulnerabilities = db.collection<TopVulnerabilityDoc>("top_vulnerabilities");

  const existing = await vulnerabilities.findOne({ rank: input.rank });
  const now = new Date();

  if (existing) {
    const updated = await vulnerabilities.findOneAndUpdate(
      { _id: existing._id },
      {
        $set: {
          cve_id: input.cve_id,
          title: input.title,
          description: input.description,
          severity: input.severity,
          cvss_score: input.cvss_score,
          affected_systems: input.affected_systems ?? existing.affected_systems,
          remediation_steps: input.remediation_steps ?? existing.remediation_steps,
          references: input.references ?? existing.references,
          last_updated_at: now,
          updated_at: now,
        },
      },
      { returnDocument: "after" }
    );
    if (!updated) throw new Error("Failed to update top vulnerability: no document returned.");

    return { vulnerability: toRecord(updated), is_new: false };
  }

  const doc: Omit<TopVulnerabilityDoc, "_id"> = {
    rank: input.rank,
    cve_id: input.cve_id,
    title: input.title,
    description: input.description,
    severity: input.severity,
    cvss_score: input.cvss_score,
    affected_systems: input.affected_systems ?? [],
    remediation_steps: input.remediation_steps ?? [],
    references: input.references ?? [],
    first_detected_at: now,
    last_updated_at: now,
    created_at: now,
    updated_at: now,
  };
  const inserted = await vulnerabilities.insertOne(doc as TopVulnerabilityDoc);

  return { vulnerability: toRecord({ ...doc, _id: inserted.insertedId } as TopVulnerabilityDoc), is_new: true };
}

export async function getTopVulnerabilities(): Promise<TopVulnerabilityRecord[]> {
  const db = await getWardenDb();
  const vulnerabilities = db.collection<TopVulnerabilityDoc>("top_vulnerabilities");

  const docs = await vulnerabilities.find({}).sort({ rank: 1 }).toArray();
  return docs.map(toRecord);
}

export async function getTopVulnerabilityByRank(rank: number): Promise<TopVulnerabilityRecord | null> {
  const db = await getWardenDb();
  const vulnerabilities = db.collection<TopVulnerabilityDoc>("top_vulnerabilities");

  const doc = await vulnerabilities.findOne({ rank });
  return doc ? toRecord(doc) : null;
}

export async function deleteTopVulnerability(rank: number): Promise<boolean> {
  const db = await getWardenDb();
  const vulnerabilities = db.collection<TopVulnerabilityDoc>("top_vulnerabilities");

  const result = await vulnerabilities.deleteOne({ rank });
  return result.deletedCount > 0;
}
