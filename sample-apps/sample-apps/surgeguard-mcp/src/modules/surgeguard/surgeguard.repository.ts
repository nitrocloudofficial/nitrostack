import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

export interface StoredBed {
  id: string;
  location: string;
  code: string;
  staffed: boolean;
  status: 'occupied' | 'available' | 'cleaning' | 'held' | 'blocked';
}

export interface StoredQueueEntry {
  id: string;
  queue: string;
  enteredAt: number;
  active: boolean;
}

export interface StoredStaff {
  id: string;
  role: string;
  onShift: boolean;
  eligible: boolean;
  onCall: boolean;
  restricted: boolean;
  fatigueRisk: boolean;
}

export interface StoredPolicy {
  id: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  hard: boolean;
  passed: boolean;
}

export interface StoredSimulationState {
  tick: number;
  lastEvent: string;
  approvedPlan: string | null;
  executionStatus: string;
  executionProgress: number;
}

export interface AuditTimelineItem {
  id: number;
  event_type: string;
  actor: string;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

type SqlValue = string | number | Uint8Array | null;

const projectRoot = process.cwd();
const configuredDatabasePath = process.env.SURGEGUARD_DATABASE_PATH?.trim();
const databasePath = configuredDatabasePath
  ? path.resolve(configuredDatabasePath)
  : path.join(projectRoot, 'data', 'surgeguard-demo.sqlite');
const dataDirectory = path.dirname(databasePath);
const wasmPath = path.join(projectRoot, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

fs.mkdirSync(dataDirectory, { recursive: true });

const SQL: SqlJsStatic = await initSqlJs({
  locateFile: () => wasmPath,
});

function loadDatabase(): Database {
  if (fs.existsSync(databasePath)) {
    return new SQL.Database(fs.readFileSync(databasePath));
  }
  return new SQL.Database();
}

class SurgeGuardRepository {
  private readonly db: Database = loadDatabase();

  constructor() {
    this.createSchema();
  }

  private createSchema() {
    this.db.run(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS capacity_beds (
        bed_id TEXT PRIMARY KEY,
        location_name TEXT NOT NULL,
        location_code TEXT NOT NULL,
        staffed INTEGER NOT NULL CHECK (staffed IN (0, 1)),
        status TEXT NOT NULL CHECK (status IN ('occupied','available','cleaning','held','blocked')),
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_capacity_beds_operational
        ON capacity_beds(location_code, staffed, status);

      CREATE TABLE IF NOT EXISTS clinical_queue_entries (
        queue_entry_id TEXT PRIMARY KEY,
        queue_name TEXT NOT NULL,
        entered_at_ms INTEGER NOT NULL,
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_queue_entries_pressure
        ON clinical_queue_entries(active, queue_name, entered_at_ms);

      CREATE TABLE IF NOT EXISTS workforce_practitioners (
        practitioner_id TEXT PRIMARY KEY,
        role_name TEXT NOT NULL,
        on_shift INTEGER NOT NULL CHECK (on_shift IN (0, 1)),
        eligible INTEGER NOT NULL CHECK (eligible IN (0, 1)),
        on_call INTEGER NOT NULL CHECK (on_call IN (0, 1)),
        restricted INTEGER NOT NULL CHECK (restricted IN (0, 1)),
        fatigue_risk INTEGER NOT NULL CHECK (fatigue_risk IN (0, 1)),
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_workforce_coverage
        ON workforce_practitioners(role_name, on_shift, eligible);

      CREATE TABLE IF NOT EXISTS policy_rules (
        rule_id TEXT PRIMARY KEY,
        rule_code TEXT NOT NULL UNIQUE,
        severity TEXT NOT NULL,
        hard_constraint INTEGER NOT NULL CHECK (hard_constraint IN (0, 1)),
        passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS simulation_state (
        singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
        tick INTEGER NOT NULL,
        last_event TEXT NOT NULL,
        approved_plan TEXT,
        execution_status TEXT NOT NULL,
        execution_progress INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS planning_audit_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        summary TEXT NOT NULL,
        details_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_events_recent
        ON planning_audit_events(event_id DESC);
    `);
    this.persist();
  }

  private rows(sql: string, params: SqlValue[] = []): Record<string, unknown>[] {
    const statement = this.db.prepare(sql);
    statement.bind(params);
    const result: Record<string, unknown>[] = [];
    while (statement.step()) result.push(statement.getAsObject());
    statement.free();
    return result;
  }

  private persist() {
    fs.writeFileSync(databasePath, this.db.export());
  }

  hasOperationalData() {
    const row = this.rows(`
      SELECT
        (SELECT COUNT(*) FROM capacity_beds) +
        (SELECT COUNT(*) FROM clinical_queue_entries) +
        (SELECT COUNT(*) FROM workforce_practitioners) +
        (SELECT COUNT(*) FROM policy_rules) AS total
    `)[0];
    return Number(row?.total ?? 0) === 1000;
  }

  seed(
    beds: StoredBed[],
    queues: StoredQueueEntry[],
    staff: StoredStaff[],
    policies: StoredPolicy[],
  ) {
    const now = new Date().toISOString();
    this.db.run('BEGIN');
    try {
      this.db.run('DELETE FROM capacity_beds');
      this.db.run('DELETE FROM clinical_queue_entries');
      this.db.run('DELETE FROM workforce_practitioners');
      this.db.run('DELETE FROM policy_rules');
      this.db.run('DELETE FROM simulation_state');
      this.db.run('DELETE FROM planning_audit_events');

      const bedStatement = this.db.prepare(`
        INSERT INTO capacity_beds
          (bed_id, location_name, location_code, staffed, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const bed of beds) {
        bedStatement.run([bed.id, bed.location, bed.code, Number(bed.staffed), bed.status, now]);
      }
      bedStatement.free();

      const queueStatement = this.db.prepare(`
        INSERT INTO clinical_queue_entries
          (queue_entry_id, queue_name, entered_at_ms, active, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const entry of queues) {
        queueStatement.run([entry.id, entry.queue, entry.enteredAt, Number(entry.active), now]);
      }
      queueStatement.free();

      const staffStatement = this.db.prepare(`
        INSERT INTO workforce_practitioners
          (practitioner_id, role_name, on_shift, eligible, on_call, restricted, fatigue_risk, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const person of staff) {
        staffStatement.run([
          person.id,
          person.role,
          Number(person.onShift),
          Number(person.eligible),
          Number(person.onCall),
          Number(person.restricted),
          Number(person.fatigueRisk),
          now,
        ]);
      }
      staffStatement.free();

      const policyStatement = this.db.prepare(`
        INSERT INTO policy_rules
          (rule_id, rule_code, severity, hard_constraint, passed, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const policy of policies) {
        policyStatement.run([
          policy.id,
          policy.code,
          policy.severity,
          Number(policy.hard),
          Number(policy.passed),
          now,
        ]);
      }
      policyStatement.free();

      this.db.run(`
        INSERT INTO simulation_state
          (singleton_id, tick, last_event, approved_plan, execution_status, execution_progress, updated_at)
        VALUES (1, 0, 'baseline', NULL, 'not_started', 0, ?)
      `, [now]);
      this.insertAudit(
        'database_seeded',
        'SurgeGuard',
        'Persistent demo database seeded with 1,000 operational records.',
        { beds: beds.length, queues: queues.length, staff: staff.length, policies: policies.length },
      );
      this.db.run('COMMIT');
      this.persist();
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  loadBeds(): StoredBed[] {
    return this.rows(`
      SELECT bed_id, location_name, location_code, staffed, status
      FROM capacity_beds ORDER BY bed_id
    `).map((row) => ({
      id: String(row.bed_id),
      location: String(row.location_name),
      code: String(row.location_code),
      staffed: Boolean(row.staffed),
      status: String(row.status) as StoredBed['status'],
    }));
  }

  loadQueues(): StoredQueueEntry[] {
    return this.rows(`
      SELECT queue_entry_id, queue_name, entered_at_ms, active
      FROM clinical_queue_entries ORDER BY queue_entry_id
    `).map((row) => ({
      id: String(row.queue_entry_id),
      queue: String(row.queue_name),
      enteredAt: Number(row.entered_at_ms),
      active: Boolean(row.active),
    }));
  }

  loadStaff(): StoredStaff[] {
    return this.rows(`
      SELECT practitioner_id, role_name, on_shift, eligible, on_call, restricted, fatigue_risk
      FROM workforce_practitioners ORDER BY practitioner_id
    `).map((row) => ({
      id: String(row.practitioner_id),
      role: String(row.role_name),
      onShift: Boolean(row.on_shift),
      eligible: Boolean(row.eligible),
      onCall: Boolean(row.on_call),
      restricted: Boolean(row.restricted),
      fatigueRisk: Boolean(row.fatigue_risk),
    }));
  }

  loadPolicies(): StoredPolicy[] {
    return this.rows(`
      SELECT rule_id, rule_code, severity, hard_constraint, passed
      FROM policy_rules ORDER BY rule_id
    `).map((row) => ({
      id: String(row.rule_id),
      code: String(row.rule_code),
      severity: String(row.severity) as StoredPolicy['severity'],
      hard: Boolean(row.hard_constraint),
      passed: Boolean(row.passed),
    }));
  }

  loadState(): StoredSimulationState {
    const row = this.rows(`
      SELECT tick, last_event, approved_plan, execution_status, execution_progress
      FROM simulation_state WHERE singleton_id = 1
    `)[0];
    return {
      tick: Number(row?.tick ?? 0),
      lastEvent: String(row?.last_event ?? 'baseline'),
      approvedPlan: row?.approved_plan == null ? null : String(row.approved_plan),
      executionStatus: String(row?.execution_status ?? 'not_started'),
      executionProgress: Number(row?.execution_progress ?? 0),
    };
  }

  saveState(state: StoredSimulationState) {
    this.db.run(`
      INSERT INTO simulation_state
        (singleton_id, tick, last_event, approved_plan, execution_status, execution_progress, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(singleton_id) DO UPDATE SET
        tick = excluded.tick,
        last_event = excluded.last_event,
        approved_plan = excluded.approved_plan,
        execution_status = excluded.execution_status,
        execution_progress = excluded.execution_progress,
        updated_at = excluded.updated_at
    `, [
      state.tick,
      state.lastEvent,
      state.approvedPlan,
      state.executionStatus,
      state.executionProgress,
      new Date().toISOString(),
    ]);
    this.persist();
  }

  saveBeds(beds: StoredBed[]) {
    const statement = this.db.prepare(`
      UPDATE capacity_beds
      SET staffed = ?, status = ?, updated_at = ?
      WHERE bed_id = ?
    `);
    const now = new Date().toISOString();
    for (const bed of beds) statement.run([Number(bed.staffed), bed.status, now, bed.id]);
    statement.free();
    this.persist();
  }

  saveQueues(entries: StoredQueueEntry[]) {
    const statement = this.db.prepare(`
      UPDATE clinical_queue_entries
      SET entered_at_ms = ?, active = ?, updated_at = ?
      WHERE queue_entry_id = ?
    `);
    const now = new Date().toISOString();
    for (const entry of entries) {
      statement.run([entry.enteredAt, Number(entry.active), now, entry.id]);
    }
    statement.free();
    this.persist();
  }

  saveStaff(staff: StoredStaff[]) {
    const statement = this.db.prepare(`
      UPDATE workforce_practitioners
      SET on_shift = ?, eligible = ?, on_call = ?, restricted = ?, fatigue_risk = ?, updated_at = ?
      WHERE practitioner_id = ?
    `);
    const now = new Date().toISOString();
    for (const person of staff) {
      statement.run([
        Number(person.onShift),
        Number(person.eligible),
        Number(person.onCall),
        Number(person.restricted),
        Number(person.fatigueRisk),
        now,
        person.id,
      ]);
    }
    statement.free();
    this.persist();
  }

  private insertAudit(
    eventType: string,
    actor: string,
    summary: string,
    details: Record<string, unknown>,
  ) {
    this.db.run(`
      INSERT INTO planning_audit_events
        (event_type, actor, summary, details_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [eventType, actor, summary, JSON.stringify(details), new Date().toISOString()]);
  }

  recordAudit(
    eventType: string,
    actor: string,
    summary: string,
    details: Record<string, unknown> = {},
  ) {
    this.insertAudit(eventType, actor, summary, details);
    this.persist();
  }

  timeline(limit = 12): AuditTimelineItem[] {
    return this.rows(`
      SELECT event_id, event_type, actor, summary, details_json, created_at
      FROM planning_audit_events
      ORDER BY event_id DESC
      LIMIT ?
    `, [limit]).map((row) => ({
      id: Number(row.event_id),
      event_type: String(row.event_type),
      actor: String(row.actor),
      summary: String(row.summary),
      details: JSON.parse(String(row.details_json)) as Record<string, unknown>,
      created_at: String(row.created_at),
    }));
  }

  databaseStats() {
    const counts = this.rows(`
      SELECT
        (SELECT COUNT(*) FROM capacity_beds) AS beds,
        (SELECT COUNT(*) FROM clinical_queue_entries) AS queue_entries,
        (SELECT COUNT(*) FROM workforce_practitioners) AS practitioners,
        (SELECT COUNT(*) FROM policy_rules) AS policy_rules,
        (SELECT COUNT(*) FROM planning_audit_events) AS audit_events
    `)[0];
    return {
      engine: 'SQLite (sql.js)',
      persistent: true,
      database_path: databasePath,
      beds: Number(counts?.beds ?? 0),
      queue_entries: Number(counts?.queue_entries ?? 0),
      practitioners: Number(counts?.practitioners ?? 0),
      policy_rules: Number(counts?.policy_rules ?? 0),
      audit_events: Number(counts?.audit_events ?? 0),
      operational_records:
        Number(counts?.beds ?? 0) +
        Number(counts?.queue_entries ?? 0) +
        Number(counts?.practitioners ?? 0) +
        Number(counts?.policy_rules ?? 0),
    };
  }
}

export const surgeRepository = new SurgeGuardRepository();
