/**
 * Single-file JSON store.
 *
 * A hackathon MVP does not need a database: the whole dataset is a few dozen
 * records. Reads are served from memory, writes flush the file synchronously so
 * a crash never loses a submitted report.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ActivityCheck,
  Alert,
  Employee,
  EODReport,
  GroundTruthData,
} from './types.js';
import { REALISTIC_TEAM } from '../modules/demo/realistic-seed.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'groundtruth.json');

/**
 * Seed team.
 *
 * Only emp-1 is wired to a real GitHub account — point it at yours with
 * `set_employee_github`, and commit as that account during the demo so
 * crosscheck_activity has genuine activity to compare against.
 *
 * The other three keep deliberately fictional logins so they return no commits.
 * That is the point: giving everyone the same real username would attribute the
 * same commits to all four, and Karthik — whose whole role in the demo is to be
 * the person who legitimately has no commits — would suddenly appear to have
 * them, collapsing the false-positive case the agent is supposed to recognise.
 */
const SEED: GroundTruthData = {
  // Twelve people across two teams. A four-row digest reads as a fixture; this
  // is the size at which ranking, search, and team questions mean anything.
  // emp-1 is the only one wired to a real GitHub account — see realistic-seed.ts.
  employees: structuredClone(REALISTIC_TEAM),
  reports: [],
  activityChecks: [],
  alerts: [],
};

class Store {
  private data: GroundTruthData;

  /**
   * False once a write has failed. Reads and writes still work in memory; only
   * durability across a restart is lost.
   */
  private durable = true;
  private lastPersistError: string | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): GroundTruthData {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        // Tolerate a file written by an older shape.
        return {
          employees: parsed.employees ?? SEED.employees,
          reports: parsed.reports ?? [],
          activityChecks: parsed.activityChecks ?? [],
          alerts: parsed.alerts ?? [],
        };
      }
    } catch {
      // A corrupt file should not stop the server mid-demo; fall back to seed.
    }
    const seeded = structuredClone(SEED);
    this.persist(seeded);
    return seeded;
  }

  /**
   * Write-through to disk, but never fatal.
   *
   * This class is a module-level singleton constructed at import time, so an
   * exception here would take the whole server down before it could serve a
   * single request. A deployed container may well have a read-only or
   * non-writable working directory, and losing durability is a far better
   * outcome than refusing to boot. Errors go to stderr — stdout is the MCP
   * JSON-RPC channel and writing to it would corrupt the protocol stream.
   */
  private persist(data: GroundTruthData = this.data): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');

      if (!this.durable) {
        this.durable = true;
        this.lastPersistError = null;
        console.error('[store] Persistence recovered; writes are durable again.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Warn once per failure mode rather than on every write.
      if (this.durable || this.lastPersistError !== message) {
        console.error(
          `[store] Could not write ${DATA_FILE}: ${message}. ` +
            'Continuing in memory — data will not survive a restart.',
        );
      }
      this.durable = false;
      this.lastPersistError = message;
    }
  }

  /** Whether writes are reaching disk. Surfaced by the storage health check. */
  persistenceStatus(): { durable: boolean; file: string; error: string | null } {
    return { durable: this.durable, file: DATA_FILE, error: this.lastPersistError };
  }

  // ---- Employees ----

  listEmployees(teamId?: string): Employee[] {
    return teamId
      ? this.data.employees.filter((e) => e.teamId === teamId)
      : [...this.data.employees];
  }

  getEmployee(employeeId: string): Employee | undefined {
    return this.data.employees.find((e) => e.id === employeeId);
  }

  /** Resolves by id, then by exact name, then by GitHub login — callers are often LLMs. */
  resolveEmployee(identifier: string): Employee | undefined {
    const needle = identifier.trim().toLowerCase();
    return this.data.employees.find(
      (e) =>
        e.id.toLowerCase() === needle ||
        e.name.toLowerCase() === needle ||
        e.githubUsername.toLowerCase() === needle,
    );
  }

  // ---- Reports ----

  addReport(report: EODReport): EODReport {
    // One report per person per day: a resubmission replaces the earlier one.
    const existing = this.data.reports.findIndex(
      (r) => r.employeeId === report.employeeId && r.date === report.date,
    );
    if (existing >= 0) {
      this.data.reports[existing] = report;
    } else {
      this.data.reports.push(report);
    }
    this.persist();
    return report;
  }

  updateReport(reportId: string, patch: Partial<EODReport>): EODReport | undefined {
    const report = this.data.reports.find((r) => r.id === reportId);
    if (!report) return undefined;
    Object.assign(report, patch);
    this.persist();
    return report;
  }

  getReport(employeeId: string, date: string): EODReport | undefined {
    return this.data.reports.find(
      (r) => r.employeeId === employeeId && r.date === date,
    );
  }

  getReportById(reportId: string): EODReport | undefined {
    return this.data.reports.find((r) => r.id === reportId);
  }

  listReports(date?: string): EODReport[] {
    return date
      ? this.data.reports.filter((r) => r.date === date)
      : [...this.data.reports];
  }

  /** Reports for one person, newest first — used to spot a blocker repeating. */
  historyFor(employeeId: string, limit = 7): EODReport[] {
    return this.data.reports
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  }

  // ---- Activity checks ----

  addActivityCheck(check: ActivityCheck): ActivityCheck {
    const existing = this.data.activityChecks.findIndex(
      (c) => c.reportId === check.reportId,
    );
    if (existing >= 0) {
      this.data.activityChecks[existing] = check;
    } else {
      this.data.activityChecks.push(check);
    }
    this.persist();
    return check;
  }

  getActivityCheck(reportId: string): ActivityCheck | undefined {
    return this.data.activityChecks.find((c) => c.reportId === reportId);
  }

  // ---- Alerts ----

  addAlert(alert: Alert): Alert {
    this.data.alerts.push(alert);
    this.persist();
    return alert;
  }

  listAlerts(teamId?: string, includeResolved = false): Alert[] {
    return this.data.alerts.filter(
      (a) =>
        (teamId ? a.teamId === teamId : true) &&
        (includeResolved ? true : !a.resolved),
    );
  }

  resolveAlert(alertId: string): Alert | undefined {
    const alert = this.data.alerts.find((a) => a.id === alertId);
    if (!alert) return undefined;
    alert.resolved = true;
    this.persist();
    return alert;
  }

  // ---- Maintenance ----

  /** Drops reports, checks, and alerts but keeps the roster. Used by the demo tools. */
  clearOperationalData(): void {
    this.data.reports = [];
    this.data.activityChecks = [];
    this.data.alerts = [];
    this.persist();
  }

  /**
   * Restore the roster to the seed definition.
   *
   * An existing data file keeps whatever employees it already had, so a change
   * to SEED has no effect on a machine that has run before. This is the escape
   * hatch for that.
   */
  resetRoster(): Employee[] {
    this.data.employees = structuredClone(SEED.employees);
    this.persist();
    return this.listEmployees();
  }

  /** Install a specific roster. Used when switching between seed scales. */
  setRoster(employees: Employee[]): Employee[] {
    this.data.employees = structuredClone(employees);
    this.persist();
    return this.listEmployees();
  }

  /**
   * Overwrite an employee's GitHub identity, so a demo can attribute commits to a
   * real account. The email is optional but worth setting: GitHub only links a
   * commit to an account when the commit email is registered there.
   */
  setGithubIdentity(
    employeeId: string,
    githubUsername: string,
    githubEmail?: string,
  ): Employee | undefined {
    const employee = this.data.employees.find((e) => e.id === employeeId);
    if (!employee) return undefined;
    employee.githubUsername = githubUsername;
    if (githubEmail !== undefined) {
      employee.githubEmail = githubEmail.trim() || undefined;
    }
    this.persist();
    return employee;
  }
}

/** Shared instance — the store is infrastructure, so it is not a DI provider. */
export const store = new Store();

/** Format a Date as YYYY-MM-DD in local time. */
export function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today in YYYY-MM-DD, local time. */
export function today(): string {
  return toDateString(new Date());
}

/** The date `n` days before today, in YYYY-MM-DD. */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}
