import { Injectable, OnModuleInit } from '@nitrostack/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  Commitment,
  CommitmentStatus,
  EvidenceEntry,
  NudgeEntry,
  Escalation,
  ConfidenceLevel,
  Ticket,
  CreateTicketInput,
} from '../../common/types.js';
import { generateId, todayISO } from '../../common/dates.js';

export interface CommitmentFilter {
  status?: string[];
  due_before?: string;
  owner_email?: string;
  confidence_level?: string;
}

interface StoreData {
  commitments: Record<string, Commitment>;
  tickets: Record<string, Ticket>;
  settings: Record<string, string>;
}

const DEFAULT_LINEAR_COUNTER = 480;

@Injectable({ deps: [] })
export class StoreService implements OnModuleInit {
  private data: StoreData = { commitments: {}, tickets: {}, settings: {} };
  private filePath: string;
  private memoryOnly = false;

  constructor() {
    const envDir = process.env.DATA_DIR;
    this.filePath = envDir
      ? path.join(envDir, 'follow-through.json')
      : path.join(process.cwd(), 'data', 'follow-through.json');
  }

  onModuleInit(): void {
    this.probeWritable();
    this.load();
  }

  private probeWritable(): void {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, `.follow-through-${process.pid}.probe`);
      fs.writeFileSync(probe, '', 'utf8');
      fs.unlinkSync(probe);
    } catch (err) {
      this.switchToTemp(err);
    }
  }

  private switchToTemp(cause: unknown): void {
    const code = (cause as NodeJS.ErrnoException)?.code ?? 'unknown';
    this.filePath = path.join(os.tmpdir(), 'follow-through', 'data', 'follow-through.json');
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      console.error(
        `[StoreService] Data dir not writable (${code}); falling back to ${this.filePath}`
      );
    } catch (err) {
      this.memoryOnly = true;
      console.error(
        `[StoreService] No writable data dir found (${(err as NodeJS.ErrnoException)?.code ?? 'unknown'}); running in-memory only`
      );
    }
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      this.data = {
        commitments: parsed.commitments ?? {},
        tickets: parsed.tickets ?? {},
        settings: parsed.settings ?? {},
      };
    } catch {
      this.data = { commitments: {}, tickets: {}, settings: {} };
    }
  }

  private persist(): void {
    if (this.memoryOnly) {
      return;
    }
    try {
      this.writeAtomic();
    } catch (err) {
      this.switchToTemp(err);
      if (this.memoryOnly) {
        return;
      }
      try {
        this.writeAtomic();
      } catch (err2) {
        this.memoryOnly = true;
        console.error(
          `[StoreService] Persistence failed (${(err2 as NodeJS.ErrnoException)?.code ?? 'unknown'}); running in-memory only`
        );
      }
    }
  }

  private writeAtomic(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  getVirtualToday(): string {
    return this.data.settings['virtual_today'] ?? todayISO();
  }

  setVirtualToday(date: string): string {
    this.data.settings['virtual_today'] = date;
    this.persist();
    return date;
  }

  advanceVirtualToday(days: number): string {
    const next = this.addDaysSafe(this.getVirtualToday(), days);
    return this.setVirtualToday(next);
  }

  resetVirtualToday(): string {
    return this.setVirtualToday(todayISO());
  }

  clearAll(): void {
    this.data = { commitments: {}, tickets: {}, settings: {} };
    this.setVirtualToday(todayISO());
  }

  private addDaysSafe(base: string, days: number): string {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  upsert(input: Partial<Commitment>): Commitment {
    const existing = input.commitment_id
      ? this.data.commitments[input.commitment_id]
      : undefined;
    const now = todayISO();
    const record: Commitment = {
      commitment_id: existing?.commitment_id ?? input.commitment_id ?? generateId('cmt'),
      meeting_id: input.meeting_id ?? existing?.meeting_id ?? '',
      text_raw: input.text_raw ?? existing?.text_raw ?? '',
      owner: input.owner ?? existing?.owner ?? { name: 'Unknown' },
      beneficiary: input.beneficiary ?? existing?.beneficiary ?? { name: 'Internal', type: 'internal' },
      what: input.what ?? existing?.what ?? '',
      due_date: input.due_date ?? existing?.due_date ?? '',
      confidence_level: input.confidence_level ?? existing?.confidence_level ?? 'aspirational',
      confidence_phrase: input.confidence_phrase ?? existing?.confidence_phrase ?? '',
      status: input.status ?? existing?.status ?? 'open',
      linked_ticket_id: input.linked_ticket_id ?? existing?.linked_ticket_id ?? null,
      evidence_log: input.evidence_log ?? existing?.evidence_log ?? [],
      nudge_log: input.nudge_log ?? existing?.nudge_log ?? [],
      escalation: input.escalation ?? existing?.escalation ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    this.data.commitments[record.commitment_id] = this.cloneCommitment(record);
    this.persist();
    return record;
  }

  get(commitmentId: string): Commitment | undefined {
    const c = this.data.commitments[commitmentId];
    return c ? this.cloneCommitment(c) : undefined;
  }

  query(filter: CommitmentFilter): Commitment[] {
    return Object.values(this.data.commitments)
      .filter((c) => {
        if (filter.status && filter.status.length > 0 && !filter.status.includes(c.status)) {
          return false;
        }
        if (filter.due_before && (c.due_date === '' || c.due_date > filter.due_before)) {
          return false;
        }
        if (filter.owner_email && (c.owner.email ?? '') !== filter.owner_email) {
          return false;
        }
        if (filter.confidence_level && c.confidence_level !== filter.confidence_level) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const byDue = a.due_date.localeCompare(b.due_date);
        return byDue !== 0 ? byDue : a.created_at.localeCompare(b.created_at);
      })
      .map((c) => this.cloneCommitment(c));
  }

  all(): Commitment[] {
    return Object.values(this.data.commitments)
      .sort((a, b) => {
        const byDue = a.due_date.localeCompare(b.due_date);
        return byDue !== 0 ? byDue : a.created_at.localeCompare(b.created_at);
      })
      .map((c) => this.cloneCommitment(c));
  }

  appendEvidence(commitmentId: string, entry: EvidenceEntry): Commitment | undefined {
    const c = this.get(commitmentId);
    if (!c) {
      return undefined;
    }
    const evidence = c.evidence_log.filter((e) => e.ref !== entry.ref);
    evidence.push(entry);
    return this.upsert({ commitment_id: commitmentId, evidence_log: evidence });
  }

  appendNudge(commitmentId: string, entry: NudgeEntry): Commitment | undefined {
    const c = this.get(commitmentId);
    if (!c) {
      return undefined;
    }
    const log = [...c.nudge_log, entry];
    return this.upsert({ commitment_id: commitmentId, nudge_log: log });
  }

  setEscalation(commitmentId: string, escalation: Escalation): Commitment | undefined {
    return this.upsert({ commitment_id: commitmentId, escalation });
  }

  setStatus(commitmentId: string, status: CommitmentStatus): Commitment | undefined {
    return this.upsert({ commitment_id: commitmentId, status });
  }

  setConfidence(commitmentId: string, level: ConfidenceLevel): Commitment | undefined {
    return this.upsert({ commitment_id: commitmentId, confidence_level: level });
  }

  existsDuplicate(ownerEmail: string, what: string): boolean {
    return Object.values(this.data.commitments).some(
      (c) => (c.owner.email ?? '') === ownerEmail && c.status !== 'expired' && c.what === what
    );
  }

  createTicket(input: CreateTicketInput): Ticket {
    const nextNumber = Number(this.data.settings['linear_counter'] ?? DEFAULT_LINEAR_COUNTER) + 1;
    this.data.settings['linear_counter'] = String(nextNumber);
    const ticket: Ticket = {
      ticket_id: `LIN-${nextNumber}`,
      title: input.title,
      description: input.description ?? '',
      assignee_email: input.assignee_email ?? '',
      due_date: input.due_date ?? '',
      labels: input.labels ?? [],
      status: 'Todo',
      watchers: [],
      escalation_comment: null,
      created_at: todayISO(),
    };
    this.data.tickets[ticket.ticket_id] = this.cloneTicket(ticket);
    this.persist();
    return ticket;
  }

  getTicket(ticketId: string): Ticket | undefined {
    const t = this.data.tickets[ticketId];
    return t ? this.cloneTicket(t) : undefined;
  }

  getTicketStatus(ticketId: string): string | null {
    const t = this.data.tickets[ticketId];
    return t ? t.status : null;
  }

  updateTicketStatus(ticketId: string, status: string): Ticket | undefined {
    const t = this.data.tickets[ticketId];
    if (!t) {
      return undefined;
    }
    t.status = status;
    this.data.tickets[ticketId] = this.cloneTicket(t);
    this.persist();
    return this.cloneTicket(t);
  }

  escalateTicket(ticketId: string, managerEmail: string, contextComment: string): Ticket | undefined {
    const t = this.data.tickets[ticketId];
    if (!t) {
      return undefined;
    }
    t.status = 'Escalated';
    if (!t.watchers.includes(managerEmail)) {
      t.watchers.push(managerEmail);
    }
    t.escalation_comment = contextComment;
    this.data.tickets[ticketId] = this.cloneTicket(t);
    this.persist();
    return this.cloneTicket(t);
  }

  listTickets(): Ticket[] {
    return Object.values(this.data.tickets)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((t) => this.cloneTicket(t));
  }

  private cloneCommitment(c: Commitment): Commitment {
    return {
      ...c,
      owner: { ...c.owner },
      beneficiary: { ...c.beneficiary },
      evidence_log: c.evidence_log.map((e) => ({ ...e })),
      nudge_log: c.nudge_log.map((n) => ({ ...n })),
      escalation: c.escalation ? { ...c.escalation } : null,
    };
  }

  private cloneTicket(t: Ticket): Ticket {
    return { ...t, labels: [...t.labels], watchers: [...t.watchers] };
  }
}
