/**
 * NitroStack Controllers & Core Backend Logic
 * Converted from ot-responder/mcp_servers/mcp_servers.py
 */

import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
export const ASSETS_CSV = path.join(DATA_DIR, "assets.csv");
export const INCIDENTS_DB = path.join(DATA_DIR, "incidents.sqlite");
export const TICKETS_DB = path.join(DATA_DIR, "tickets.sqlite");
export const SESSIONS_DB = path.join(DATA_DIR, "sessions.sqlite");

export interface AssetRecord {
  [key: string]: string;
  asset_id: string;
  ip: string;
  type: string;
  criticality: string;
  owner: string;
  last_maintenance: string;
  zone: string;
  subnet: string;
}

export interface IncidentRecord {
  event_id: string;
  timestamp: string;
  session_id?: string;
  asset_id: string;
  src_ip: string;
  dst_ip?: string;
  attack_type: string;
  severity?: string;
  mitre_id?: string;
  zone: string;
  subnet: string;
  traffic_type?: string;
  system_damage?: string;
}

export interface TicketResult {
  ticket_id: string;
  session_id?: string;
  asset_id: string;
  severity?: string;
  description?: string;
  action_field?: string;
  status: string;
  created_at: string;
}

export interface ProposalRecord {
  proposal_id: string;
  session_id?: string;
  asset_id: string;
  zone: string;
  reason: string;
  mitre_id: string;
  status: string;
  approved_by?: string;
  created_at: string;
}

export interface SessionRecord {
  session_id: string;
  start_time: string;
  end_time?: string;
  total_events: number;
  normal_count: number;
  low_count: number;
  medium_count: number;
  high_count: number;
  critical_count: number;
  tickets_count: number;
  proposals_count: number;
  status: string;
}

export interface ContainmentResult {
  action_id?: string;
  action_taken?: string;
  proposal_id?: string;
  status: string;
  asset_id?: string;
  reason?: string;
  mitre_id?: string;
  approved_by?: string;
  executed_at?: string;
}

export function loadAsset(ipOrId: string): AssetRecord | null {
  if (!fs.existsSync(ASSETS_CSV)) return null;
  const content = fs.readFileSync(ASSETS_CSV, "utf-8");
  const lines = content.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return null;
  const headers = lines[0].split(",").map(h => h.trim());

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
    if (row["ip"] === ipOrId || row["asset_id"] === ipOrId) {
      return row as unknown as AssetRecord;
    }
  }
  return null;
}

import initSqlJs, { SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic | null = null;
export const sqlPromise = initSqlJs().then(instance => {
  SQL = instance;
}).catch(err => {
  console.error("Failed to initialize sql.js in mcp_servers:", err);
});

function getSql(): SqlJsStatic | null {
  return SQL;
}

export function querySqlite(dbPath: string, sqlQuery: string, params: any[] = []): any[] {
  if (!fs.existsSync(dbPath)) return [];
  const sqlModule = getSql();
  if (!sqlModule) return [];
  try {
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new sqlModule.Database(fileBuffer);
    const stmt = db.prepare(sqlQuery);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    db.close();
    return rows;
  } catch {
    return [];
  }
}

export function executeSqlite(dbPath: string, sqlQuery: string, params: any[] = []): void {
  if (!fs.existsSync(dbPath)) return;
  const sqlModule = getSql();
  if (!sqlModule) return;
  try {
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new sqlModule.Database(fileBuffer);
    db.run(sqlQuery, params);
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    db.close();
  } catch (err: any) {
    console.error("executeSqlite error:", err.message);
  }
}

export class SessionController {
  public startSession(sessionId: string): void {
    const nowIso = new Date().toISOString();
    const sqlQuery = `
      INSERT OR REPLACE INTO sessions (session_id, start_time, end_time, total_events, normal_count, low_count, medium_count, high_count, critical_count, tickets_count, proposals_count, status)
      VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 'running')
    `;
    executeSqlite(SESSIONS_DB, sqlQuery, [sessionId, nowIso, null]);
  }

  public endSession(
    sessionId: string,
    summary: {
      total_events: number;
      normal_count: number;
      low_count: number;
      medium_count: number;
      high_count: number;
      critical_count: number;
      tickets_count: number;
      proposals_count: number;
      status: string;
    }
  ): void {
    const nowIso = new Date().toISOString();
    const sqlQuery = `
      UPDATE sessions
      SET end_time = ?, total_events = ?, normal_count = ?, low_count = ?, medium_count = ?, high_count = ?, critical_count = ?, tickets_count = ?, proposals_count = ?, status = ?
      WHERE session_id = ?
    `;
    executeSqlite(SESSIONS_DB, sqlQuery, [
      nowIso,
      summary.total_events,
      summary.normal_count,
      summary.low_count,
      summary.medium_count,
      summary.high_count,
      summary.critical_count,
      summary.tickets_count,
      summary.proposals_count,
      summary.status,
      sessionId
    ]);
  }

  public getStoredSessions(): SessionRecord[] {
    return querySqlite(SESSIONS_DB, "SELECT * FROM sessions ORDER BY rowid DESC");
  }
}

export class AssetInfoController {
  public getAsset(ipOrId: string): AssetRecord {
    const asset = loadAsset(ipOrId);
    if (!asset) {
      return {
        asset_id: ipOrId,
        ip: ipOrId,
        type: "Unknown",
        criticality: "critical",
        owner: "unassigned",
        last_maintenance: "N/A",
        zone: "Unknown",
        subnet: "Unknown",
        error: "Asset not found in inventory; fail-safe default applied."
      };
    }
    return asset;
  }

  public listRecentIncidents(assetId: string, windowHours: number = 24): IncidentRecord[] {
    const sqlQuery = `
      SELECT event_id, timestamp, session_id, asset_id, src_ip, attack_type, mitre_id, zone, subnet 
      FROM incidents 
      WHERE asset_id = ? 
      ORDER BY timestamp DESC
    `;
    return querySqlite(INCIDENTS_DB, sqlQuery, [assetId]);
  }

  public recordIncident(rec: IncidentRecord): void {
    const sqlQuery = `
      INSERT OR REPLACE INTO incidents (event_id, timestamp, session_id, asset_id, src_ip, dst_ip, attack_type, severity, mitre_id, zone, subnet, traffic_type, system_damage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    executeSqlite(INCIDENTS_DB, sqlQuery, [
      rec.event_id,
      rec.timestamp || new Date().toISOString(),
      rec.session_id || "SES-DEFAULT",
      rec.asset_id,
      rec.src_ip,
      rec.dst_ip || "10.0.4.5",
      rec.attack_type,
      rec.severity || "LOW",
      rec.mitre_id || "T0846",
      rec.zone,
      rec.subnet,
      rec.traffic_type || "normal",
      rec.system_damage || "Minimal"
    ]);
  }

  public getStoredEvents(limit: number = 50, severityFilter?: string): IncidentRecord[] {
    let sqlQuery = "SELECT * FROM incidents WHERE 1=1";
    const params: any[] = [];
    if (severityFilter) {
      sqlQuery += " AND severity = ?";
      params.push(severityFilter.toUpperCase());
    }
    sqlQuery += " ORDER BY rowid DESC LIMIT ?";
    params.push(limit);
    return querySqlite(INCIDENTS_DB, sqlQuery, params);
  }

  public correlateCampaign(
    zone?: string,
    subnet?: string,
    windowMinutes: number = 15,
    srcIp?: string
  ): IncidentRecord[] {
    let sqlQuery = "SELECT event_id, timestamp, session_id, asset_id, src_ip, attack_type, mitre_id, zone, subnet FROM incidents WHERE 1=1";
    const params: string[] = [];

    if (zone) {
      sqlQuery += " AND zone = ?";
      params.push(zone);
    }
    if (subnet) {
      sqlQuery += " AND subnet = ?";
      params.push(subnet);
    }
    if (srcIp) {
      sqlQuery += " AND src_ip = ?";
      params.push(srcIp);
    }

    sqlQuery += " ORDER BY rowid DESC";
    return querySqlite(INCIDENTS_DB, sqlQuery, params);
  }
}

export class TicketingController {
  public createWorkOrder(
    assetId: string,
    severity: string,
    mitreId: string,
    description: string,
    actionField: string,
    campaignId?: string,
    sessionId?: string
  ): TicketResult {
    const ticketId = `TICK-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const nowIso = new Date().toISOString();
    const status = ["P1", "P2"].includes(severity) ? "open" : "resolved";

    const sqlQuery = `
      INSERT INTO tickets (ticket_id, session_id, asset_id, severity, mitre_id, description, action_field, campaign_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    executeSqlite(TICKETS_DB, sqlQuery, [ticketId, sessionId || "SES-DEFAULT", assetId, severity, mitreId, description, actionField, campaignId || null, status, nowIso]);

    return {
      ticket_id: ticketId,
      session_id: sessionId || "SES-DEFAULT",
      asset_id: assetId,
      severity,
      description,
      status,
      created_at: nowIso
    };
  }

  public getStoredTickets(): TicketResult[] {
    return querySqlite(TICKETS_DB, "SELECT * FROM tickets ORDER BY rowid DESC");
  }
}

export class NotificationController {
  public notify(
    role: string,
    priority: string,
    status: string,
    incident: Record<string, any>
  ): Record<string, any> {
    const header = `[${priority}] INTRUSION ALERT — ${incident.event_id || "N/A"} — STATUS: ${status.toUpperCase()}`;
    const color = priority === "P1" ? chalk.red.bold : (priority === "P2" ? chalk.yellow.bold : chalk.green.bold);

    console.log(color(`\n┌─────────────────────────────────────────────────────────────┐`));
    console.log(color(`│ ${header}`));
    console.log(color(`├─────────────────────────────────────────────────────────────┤`));
    console.log(`│ Asset:       ${incident.asset_id || "N/A"} (${incident.zone || "N/A"}, ${(incident.criticality || "N/A").toUpperCase()})`);
    console.log(`│ MITRE ATT&CK: ${incident.mitre_id || "N/A"} – ${incident.technique_name || "N/A"} (Tactic: ${incident.mitre_tactic || "N/A"})`);
    console.log(`│ Attack type:  ${incident.attack_type || "N/A"} (${incident.protocol || "TCP"} scan)`);
    console.log(`│ Source:       ${incident.src_ip || "N/A"} : ${incident.src_port || "N/A"}`);
    console.log(`│ Destination:  ${incident.dst_ip || "N/A"} : ${incident.dst_port || "N/A"}`);
    console.log(`│ Packets:      ${(incident.total_packets || 0).toLocaleString()} total`);
    console.log(`│ Data loss:    ${incident.data_loss_estimate || "None observed"}`);
    console.log(`│ Campaign:     ${incident.campaign_summary || "Isolated event"}`);
    console.log(`│ Action/Prop:  ${incident.action_taken_or_proposed || "N/A"}`);
    console.log(color(`└─────────────────────────────────────────────────────────────┘\n`));

    return {
      delivered: true,
      channel: "CLI/Console",
      timestamp: new Date().toISOString()
    };
  }
}

export class ContainmentController {
  public autoRemediate(
    assetId: string,
    attackType: string,
    mitreId: string,
    reason: string
  ): ContainmentResult {
    const asset = loadAsset(assetId);
    const criticality = (asset?.criticality || "critical").toLowerCase();

    if (["high", "critical"].includes(criticality)) {
      throw new Error(
        `[SERVER SAFETY GATE REFUSAL] Action blocked! Asset ${assetId} has criticality level '${criticality}'. Autonomous remediation is strictly forbidden for high/critical assets. Must use propose_isolation.`
      );
    }

    const actionId = `ACT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const actionTaken = `blocked src_ip at switch ACL (rule #${actionId})`;

    return {
      action_id: actionId,
      action_taken: actionTaken,
      status: "executed"
    };
  }

  public proposeIsolation(
    assetId: string,
    reason: string,
    mitreId: string,
    zone: string = "Zone 2",
    sessionId?: string
  ): ContainmentResult {
    const proposalId = `PROP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const sqlQuery = `
      INSERT INTO proposals (proposal_id, session_id, asset_id, zone, reason, mitre_id, status, approved_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    executeSqlite(TICKETS_DB, sqlQuery, [proposalId, sessionId || "SES-DEFAULT", assetId, zone, reason, mitreId, "pending_approval", null, nowIso]);

    return {
      proposal_id: proposalId,
      status: "pending_approval",
      asset_id: assetId,
      reason,
      mitre_id: mitreId
    };
  }

  public executeIsolation(
    proposalId: string,
    approvedBy: string
  ): ContainmentResult {
    if (!approvedBy || !approvedBy.trim()) {
      throw new Error("[SERVER SAFETY GATE REFUSAL] Human approval required! 'approved_by' parameter cannot be empty.");
    }

    const nowIso = new Date().toISOString();
    
    // 1. Synchronize Proposals Table
    const sqlProposal = `
      UPDATE proposals
      SET status = 'executed', approved_by = ?
      WHERE proposal_id = ? OR proposal_id LIKE '%' || ? || '%'
    `;
    executeSqlite(TICKETS_DB, sqlProposal, [approvedBy, proposalId, proposalId]);

    // 2. Synchronize Tickets Table (Update ticket status to 'resolved' when proposal is approved)
    const sqlTicket = `
      UPDATE tickets
      SET status = 'resolved', action_field = action_field || ' [EXECUTED by ' || ? || ']'
      WHERE action_field LIKE '%' || ? || '%' OR ticket_id = ?
    `;
    executeSqlite(TICKETS_DB, sqlTicket, [approvedBy, proposalId, proposalId]);

    return {
      proposal_id: proposalId,
      status: "executed",
      approved_by: approvedBy,
      executed_at: nowIso
    };
  }

  public getStoredProposals(): ProposalRecord[] {
    const proposals = querySqlite(TICKETS_DB, "SELECT * FROM proposals ORDER BY rowid DESC");
    
    if (proposals.length === 0) {
      const tickets = querySqlite(TICKETS_DB, "SELECT * FROM tickets WHERE action_field LIKE '%Proposed%'");
      return tickets.map((t: any) => {
        const propMatch = (t.action_field || "").match(/PROP-[A-Z0-9]+/i);
        const propId = propMatch ? propMatch[0] : `PROP-${t.ticket_id.replace("TICK-", "")}`;
        return {
          proposal_id: propId,
          session_id: t.session_id || "SES-DEFAULT",
          asset_id: t.asset_id,
          zone: "Zone 2",
          reason: t.description || "Pending operator sign-off",
          mitre_id: t.mitre_id || "T0846",
          status: t.status === "resolved" ? "executed" : "pending_approval",
          approved_by: t.status === "resolved" ? "operator_plant_mgr" : undefined,
          created_at: t.created_at || new Date().toISOString()
        };
      });
    }

    return proposals;
  }
}
