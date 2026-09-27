import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nitrostack/core';
import type {
  Application,
  AuditEntry,
  BusinessProfile,
  PublicApplication,
} from '../types/instantpulse.types.js';

const DATA_DIR = process.env.INSTANTPULSE_DATA_DIR || path.join(process.cwd(), 'data');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

interface PersistedState {
  applications: Application[];
  audit: AuditEntry[];
}

/**
 * The single source of truth for every application in flight.
 *
 * In-memory Maps with a JSON snapshot behind them — enough to survive a restart
 * mid-demo without dragging a database into the stack. Every mutation is exposed
 * through a narrow method so the audit trail can never drift from the record it
 * describes. Swap the load/flush pair for a repository when this needs Postgres.
 */
@Injectable({ deps: [] })
export class ApplicationStore implements OnModuleInit, OnApplicationShutdown {
  private readonly applications = new Map<string, Application>();
  private readonly audit: AuditEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  async onModuleInit(): Promise<void> {
    this.load();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flush();
  }

  // -------------------------------------------------------------------------
  // Applications
  // -------------------------------------------------------------------------

  create(profile: BusinessProfile): Application {
    const now = new Date().toISOString();
    const application: Application = {
      applicationId: `app_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      createdAt: now,
      updatedAt: now,
      status: 'DRAFT',
      profile,
      documentRequests: [],
    };

    this.applications.set(application.applicationId, application);
    this.recordAudit(application.applicationId, 'system', 'application.created', {
      businessName: profile.businessName,
      industry: profile.industry,
      requestedAmount: profile.requestedAmount,
    });
    this.scheduleFlush();
    return application;
  }

  get(applicationId: string): Application | undefined {
    return this.applications.get(applicationId);
  }

  /** Use in tools — the thrown message is what the MCP client will surface. */
  getOrThrow(applicationId: string): Application {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(
        `Application "${applicationId}" was not found. Call onboarding_create_application first, ` +
          `or run onboarding_list_applications to see the ids currently in flight.`,
      );
    }
    return application;
  }

  update(applicationId: string, patch: Partial<Omit<Application, 'applicationId' | 'createdAt'>>): Application {
    const application = this.getOrThrow(applicationId);
    const updated: Application = {
      ...application,
      ...patch,
      applicationId: application.applicationId,
      createdAt: application.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.applications.set(applicationId, updated);
    this.scheduleFlush();
    return updated;
  }

  list(filter?: { status?: Application['status']; band?: string }): Application[] {
    let all = [...this.applications.values()];
    if (filter?.status) {
      all = all.filter((a) => a.status === filter.status);
    }
    if (filter?.band) {
      all = all.filter((a) => a.decision?.band === filter.band);
    }
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Strip the access token and the raw ledger before anything crosses the MCP
   * boundary. A bank access token in a chat transcript is a real incident, even
   * a sandbox one — treat it as non-negotiable.
   */
  toPublic(application: Application): PublicApplication {
    const { plaid, snapshot, ...rest } = application;
    return {
      ...rest,
      plaid: plaid
        ? {
            itemId: plaid.itemId,
            institutionId: plaid.institutionId,
            institutionName: plaid.institutionName,
            persona: plaid.persona,
            connectedAt: plaid.connectedAt,
            simulated: plaid.simulated,
          }
        : undefined,
      snapshotSummary: snapshot
        ? {
            source: snapshot.source,
            institutionName: snapshot.institutionName,
            fetchedAt: snapshot.fetchedAt,
            windowDays: snapshot.windowDays,
            accountCount: snapshot.accounts.length,
            transactionCount: snapshot.transactions.length,
            totalCurrentBalance: snapshot.totalCurrentBalance,
          }
        : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Audit trail — append only
  // -------------------------------------------------------------------------

  recordAudit(
    applicationId: string,
    actor: string,
    event: string,
    detail: Record<string, unknown> = {},
  ): AuditEntry {
    const entry: AuditEntry = {
      entryId: `aud_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      applicationId,
      at: new Date().toISOString(),
      actor,
      event,
      detail,
    };
    this.audit.push(entry);
    this.scheduleFlush();
    return entry;
  }

  getAudit(applicationId: string): AuditEntry[] {
    return this.audit.filter((e) => e.applicationId === applicationId);
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  private load(): void {
    try {
      if (fs.existsSync(APPLICATIONS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(APPLICATIONS_FILE, 'utf-8')) as Application[];
        for (const app of raw) this.applications.set(app.applicationId, app);
      }
      if (fs.existsSync(AUDIT_FILE)) {
        const raw = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8')) as AuditEntry[];
        this.audit.push(...raw);
      }
    } catch {
      // A corrupt snapshot must never stop the server from booting — start clean.
      this.applications.clear();
      this.audit.length = 0;
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, 250);
    this.flushTimer.unref?.();
  }

  private flush(): void {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const state: PersistedState = {
        applications: [...this.applications.values()],
        audit: this.audit,
      };
      fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(state.applications, null, 2), 'utf-8');
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(state.audit, null, 2), 'utf-8');
    } catch {
      // Persistence is a convenience, not a requirement. Never crash a scoring
      // run because the disk was read-only.
    }
  }
}
