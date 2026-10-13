/**
 * Database Setup & Persistence Schema
 * Initializes and manages SQLite databases:
 *  - incidents.sqlite (event history)
 *  - tickets.sqlite (tickets & proposals)
 *  - sessions.sqlite (separate session-based execution tracking)
 */

import initSqlJs from "sql.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const INCIDENTS_DB = path.join(__dirname, "incidents.sqlite");
export const TICKETS_DB = path.join(__dirname, "tickets.sqlite");
export const SESSIONS_DB = path.join(__dirname, "sessions.sqlite");

export async function init_incidents_db(forceFresh: boolean = false): Promise<void> {
  const SQL = await initSqlJs();
  let db;

  if (!forceFresh && fs.existsSync(INCIDENTS_DB)) {
    const fileBuffer = fs.readFileSync(INCIDENTS_DB);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS incidents (
        event_id TEXT PRIMARY KEY,
        timestamp TEXT,
        session_id TEXT,
        asset_id TEXT,
        src_ip TEXT,
        dst_ip TEXT,
        attack_type TEXT,
        severity TEXT,
        mitre_id TEXT,
        zone TEXT,
        subnet TEXT,
        traffic_type TEXT,
        system_damage TEXT
    );
  `);

  try { db.run("ALTER TABLE incidents ADD COLUMN session_id TEXT;"); } catch {}

  db.run("CREATE INDEX IF NOT EXISTS idx_zone ON incidents(zone);");
  db.run("CREATE INDEX IF NOT EXISTS idx_subnet ON incidents(subnet);");
  db.run("CREATE INDEX IF NOT EXISTS idx_srcip ON incidents(src_ip);");
  db.run("CREATE INDEX IF NOT EXISTS idx_session ON incidents(session_id);");

  const data = db.export();
  fs.writeFileSync(INCIDENTS_DB, Buffer.from(data));
  db.close();

  console.log(`[DB INIT] Incidents store ready at ${INCIDENTS_DB}`);
}

export async function init_tickets_db(forceFresh: boolean = false): Promise<void> {
  const SQL = await initSqlJs();
  let db;

  if (!forceFresh && fs.existsSync(TICKETS_DB)) {
    const fileBuffer = fs.readFileSync(TICKETS_DB);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
        ticket_id TEXT PRIMARY KEY,
        session_id TEXT,
        asset_id TEXT,
        severity TEXT,
        mitre_id TEXT,
        description TEXT,
        action_field TEXT,
        campaign_id TEXT,
        status TEXT,
        created_at TEXT
    );
  `);

  try { db.run("ALTER TABLE tickets ADD COLUMN session_id TEXT;"); } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS proposals (
        proposal_id TEXT PRIMARY KEY,
        session_id TEXT,
        asset_id TEXT,
        zone TEXT,
        reason TEXT,
        mitre_id TEXT,
        status TEXT,
        approved_by TEXT,
        created_at TEXT
    );
  `);

  try { db.run("ALTER TABLE proposals ADD COLUMN session_id TEXT;"); } catch {}

  const data = db.export();
  fs.writeFileSync(TICKETS_DB, Buffer.from(data));
  db.close();

  console.log(`[DB INIT] Tickets & Proposals store ready at ${TICKETS_DB}`);
}

export async function init_sessions_db(forceFresh: boolean = false): Promise<void> {
  const SQL = await initSqlJs();
  let db;

  if (!forceFresh && fs.existsSync(SESSIONS_DB)) {
    const fileBuffer = fs.readFileSync(SESSIONS_DB);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        start_time TEXT,
        end_time TEXT,
        total_events INTEGER,
        normal_count INTEGER,
        low_count INTEGER,
        medium_count INTEGER,
        high_count INTEGER,
        critical_count INTEGER,
        tickets_count INTEGER,
        proposals_count INTEGER,
        status TEXT
    );
  `);

  const data = db.export();
  fs.writeFileSync(SESSIONS_DB, Buffer.from(data));
  db.close();

  console.log(`[DB INIT] Sessions store ready at ${SESSIONS_DB}`);
}

export const initIncidentsDb = init_incidents_db;
export const initTicketsDb = init_tickets_db;
export const initSessionsDb = init_sessions_db;

const isMain = Boolean(process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename));
if (isMain) {
  (async () => {
    await init_incidents_db(false);
    await init_tickets_db(false);
    await init_sessions_db(false);
  })();
}
