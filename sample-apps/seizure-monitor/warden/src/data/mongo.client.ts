/**
 * Lazy MongoDB client for the findings-persistence pipeline (`findings` /
 * `finding_events` collections in the `warden` database on Atlas cluster
 * "Cyberbase"). Replaces the earlier Supabase/Postgres backend — same
 * collections/fields as the original Postgres schema, just document-shaped
 * instead of relational.
 *
 * Reads MONGODB_URI from env; never crashes at import time so a server
 * without it configured (e.g. only using the scanning tools) still boots —
 * only calls into the findings module need this.
 */

import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getWardenDb(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured — the findings persistence pipeline (ingest_finding, query_findings, " +
        "analyze_finding_history, and triage_finding's persistence write) needs it set in .env."
    );
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db("warden");
  return db;
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}
