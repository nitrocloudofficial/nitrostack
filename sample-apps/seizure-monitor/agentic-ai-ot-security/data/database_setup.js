/**
 * Database Setup, Reset & Single CSV Persistence Schema
 * Manages SQLite databases & Single CSV Data Stores:
 *  - incidents.sqlite & incidents.csv
 *  - tickets.sqlite (tickets & proposals) & tickets.csv, proposals.csv
 *  - sessions.sqlite & sessions.csv
 */
import initSqlJs from "sql.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DATA_DIR = path.resolve(__dirname);
export const INCIDENTS_DB = path.join(DATA_DIR, "incidents.sqlite");
export const TICKETS_DB = path.join(DATA_DIR, "tickets.sqlite");
export const SESSIONS_DB = path.join(DATA_DIR, "sessions.sqlite");
export const INCIDENTS_CSV = path.join(DATA_DIR, "incidents.csv");
export const TICKETS_CSV = path.join(DATA_DIR, "tickets.csv");
export const PROPOSALS_CSV = path.join(DATA_DIR, "proposals.csv");
export const SESSIONS_CSV = path.join(DATA_DIR, "sessions.csv");
export async function clearAllDataStores() {
    const SQL = await initSqlJs();
    // 1. Reset incidents.sqlite & incidents.csv
    let dbInc = new SQL.Database();
    dbInc.run(`
    CREATE TABLE incidents (
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
    dbInc.run("CREATE INDEX idx_zone ON incidents(zone);");
    dbInc.run("CREATE INDEX idx_subnet ON incidents(subnet);");
    dbInc.run("CREATE INDEX idx_srcip ON incidents(src_ip);");
    dbInc.run("CREATE INDEX idx_session ON incidents(session_id);");
    fs.writeFileSync(INCIDENTS_DB, Buffer.from(dbInc.export()));
    dbInc.close();
    fs.writeFileSync(INCIDENTS_CSV, `"event_id","timestamp","session_id","asset_id","src_ip","dst_ip","attack_type","severity","mitre_id","zone","subnet","traffic_type","system_damage"\n`);
    // 2. Reset tickets.sqlite & tickets.csv & proposals.csv
    let dbTick = new SQL.Database();
    dbTick.run(`
    CREATE TABLE tickets (
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
    dbTick.run(`
    CREATE TABLE proposals (
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
    fs.writeFileSync(TICKETS_DB, Buffer.from(dbTick.export()));
    dbTick.close();
    fs.writeFileSync(TICKETS_CSV, `"ticket_id","session_id","asset_id","severity","mitre_id","description","action_field","campaign_id","status","created_at"\n`);
    fs.writeFileSync(PROPOSALS_CSV, `"proposal_id","session_id","asset_id","zone","reason","mitre_id","status","approved_by","created_at"\n`);
    // 3. Reset sessions.sqlite & sessions.csv
    let dbSess = new SQL.Database();
    dbSess.run(`
    CREATE TABLE sessions (
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
    fs.writeFileSync(SESSIONS_DB, Buffer.from(dbSess.export()));
    dbSess.close();
    fs.writeFileSync(SESSIONS_CSV, `"session_id","start_time","end_time","total_events","normal_count","low_count","medium_count","high_count","critical_count","tickets_count","proposals_count","status"\n`);
    console.log(`[DATA RESET] Cleared all SQLite DBs and reset single CSV data stores in ${DATA_DIR}`);
}
export async function init_incidents_db(forceFresh = false) {
    if (forceFresh || !fs.existsSync(INCIDENTS_DB)) {
        await clearAllDataStores();
        return;
    }
}
export async function init_tickets_db(forceFresh = false) {
    if (forceFresh || !fs.existsSync(TICKETS_DB)) {
        await clearAllDataStores();
        return;
    }
}
export async function init_sessions_db(forceFresh = false) {
    if (forceFresh || !fs.existsSync(SESSIONS_DB)) {
        await clearAllDataStores();
        return;
    }
}
export const initIncidentsDb = init_incidents_db;
export const initTicketsDb = init_tickets_db;
export const initSessionsDb = init_sessions_db;
const isMain = Boolean(process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename));
if (isMain) {
    (async () => {
        await clearAllDataStores();
    })();
}
