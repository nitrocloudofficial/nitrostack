/**
 * ============================================================================
 * DB ACCESS LAYER (one JSON file per collection — no database of any kind)
 * ============================================================================
 * This is the ONLY file that touches storage directly. Each collection
 * lives in its own JSON file under DATA_DIR (default: data/db/):
 *
 *   customers.json      owners.json         bugs.json
 *   owner_labels.json    tickets.json        assignments.json
 *   slack_messages.json  notifications.json
 *
 * owners.json holds just owner identity ({id, name, max_load}); which
 * category(ies) an owner handles lives in owner_labels.json as
 * {id, owner_id, category} rows, joined at read time. Everything else is a
 * flat array of rows, same shape as the old SQL tables.
 * ============================================================================
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Overridable via env (e.g. to point at a mounted volume in production).
const DATA_DIR = process.env.DATA_DIR ?? path.resolve(__dirname, '../data/db');

// ---- Row shapes -------------------------------------------------------

interface CustomerRow {
  id: number;
  name: string;
  email: string | null;
  domain: string | null;
  tier: string;
  created_at: string;
}

interface TicketRow {
  id: number;
  customer_id: number;
  subject: string;
  body: string;
  status: string;
  channel: string;
  created_at: string;
}

interface SlackRow {
  id: number;
  customer_id: number;
  author: string;
  text: string;
  channel: string;
  ts: string;
}

interface BugRow {
  id: number;
  customer_id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  fixed_at: string | null;
}

interface OwnerRow {
  id: number;
  name: string;
  max_load: number;
}

interface OwnerLabelRow {
  id: number;
  owner_id: number;
  category: string;
}

interface AssignmentRow {
  id: number;
  customer_id: number;
  owner_id: number;
  category: string;
  risk_score: number;
  status: string;
  created_at: string;
}

interface NotificationRow {
  id: number;
  customer_id: number | null;
  kind: string;
  message: string;
  approved: boolean;
  created_at: string;
  sent_at: string | null;
}

// ---- Generic per-file collection ---------------------------------------

class Collection<Row extends { id: number }> {
  private rows: Row[] = [];
  private writeQueue: Promise<void> = Promise.resolve();
  private loaded = false;
  private fileName: string;

  constructor(fileName: string) {
    this.fileName = fileName;
  }

  private get filePath(): string {
    return path.join(DATA_DIR, this.fileName);
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      this.rows = JSON.parse(raw);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        this.rows = [];
        await this.persist();
      } else {
        throw err;
      }
    }
    this.loaded = true;
  }

  private requireLoaded(): Row[] {
    if (!this.loaded) {
      this.rows = [];
      this.loaded = true;
    }
    return this.rows;
  }

  private async persist(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const tmpFile = `${this.filePath}.tmp`;
      await writeFile(tmpFile, JSON.stringify(this.rows, null, 2), 'utf8');
      await rename(tmpFile, this.filePath);
    });
    await this.writeQueue;
  }

  all(): Row[] {
    return this.requireLoaded();
  }

  find(predicate: (row: Row) => boolean): Row | undefined {
    return this.requireLoaded().find(predicate);
  }

  filter(predicate: (row: Row) => boolean): Row[] {
    return this.requireLoaded().filter(predicate);
  }

  private nextId(): number {
    const rows = this.requireLoaded();
    return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  }

  async insert(row: Omit<Row, 'id'>): Promise<Row> {
    const rows = this.requireLoaded();
    const full = { ...row, id: this.nextId() } as Row;
    rows.push(full);
    await this.persist();
    return full;
  }

  async update(id: number, patch: Partial<Row>): Promise<Row | undefined> {
    const rows = this.requireLoaded();
    const row = rows.find((r) => r.id === id);
    if (!row) return undefined;
    Object.assign(row, patch);
    await this.persist();
    return row;
  }
}

const customers = new Collection<CustomerRow>('customers.json');
const tickets = new Collection<TicketRow>('tickets.json');
const slackMessages = new Collection<SlackRow>('slack_messages.json');
const bugs = new Collection<BugRow>('bugs.json');
const owners = new Collection<OwnerRow>('owners.json');
const ownerLabels = new Collection<OwnerLabelRow>('owner_labels.json');
const assignments = new Collection<AssignmentRow>('assignments.json');
const notifications = new Collection<NotificationRow>('notifications.json');

const allCollections = [
  customers,
  tickets,
  slackMessages,
  bugs,
  owners,
  ownerLabels,
  assignments,
  notifications,
];

/** Loads every collection's JSON file from DATA_DIR. */
export async function initDb(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await Promise.all(allCollections.map((c) => c.load()));
}

export async function closeDb(): Promise<void> {}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  domain: string | null;
  tier?: string;
}

export interface Signal {
  source: 'ticket' | 'slack' | 'bug';
  timestamp: string;
  message: string;
  customer: string;
}

function toCustomer(row: CustomerRow): Customer {
  return { id: row.id, name: row.name, email: row.email, domain: row.domain, tier: row.tier };
}

// ---- Customer lookup / correlation ----------------------------------------

export async function findOrCreateCustomer(name: string): Promise<Customer> {
  const existing = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return toCustomer(existing);

  const row = await customers.insert({
    name,
    email: null,
    domain: null,
    tier: 'standard',
    created_at: new Date().toISOString(),
  });
  return toCustomer(row);
}

export async function getCustomerByName(name: string): Promise<Customer | undefined> {
  const row = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return row ? toCustomer(row) : undefined;
}

export async function listCustomers(): Promise<Customer[]> {
  return [...customers.all()].sort((a, b) => a.name.localeCompare(b.name)).map(toCustomer);
}

// ---- Signal Collector ------------------------------------------------------

export async function getSignalsForCustomer(
  customerId: number,
  customerName: string
): Promise<Signal[]> {
  const signals: Signal[] = [];
  for (const t of tickets.filter((t) => t.customer_id === customerId)) {
    signals.push({
      source: 'ticket',
      timestamp: t.created_at,
      message: `${t.subject}: ${t.body}`,
      customer: customerName,
    });
  }
  for (const m of slackMessages.filter((m) => m.customer_id === customerId)) {
    signals.push({
      source: 'slack',
      timestamp: m.ts,
      message: m.text,
      customer: customerName,
    });
  }
  for (const b of bugs.filter((b) => b.customer_id === customerId)) {
    signals.push({
      source: 'bug',
      timestamp: b.created_at,
      message: `[${b.status}] ${b.title}: ${b.description}`,
      customer: customerName,
    });
  }
  return signals.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ---- Owners / load / assignment -------------------------------------------

export interface Owner {
  id: number;
  name: string;
  category: string;
  max_load: number;
}

function primaryCategoryFor(ownerId: number): string | undefined {
  return ownerLabels.find((l) => l.owner_id === ownerId)?.category;
}

export async function getOwnersForCategory(category: string): Promise<Owner[]> {
  const ownerIds = ownerLabels.filter((l) => l.category === category).map((l) => l.owner_id);
  return owners
    .filter((o) => ownerIds.includes(o.id))
    .sort((a, b) => a.id - b.id)
    .map((o) => ({ id: o.id, name: o.name, category, max_load: o.max_load }));
}

export async function getCurrentLoad(ownerId: number): Promise<number> {
  return assignments.filter((a) => a.owner_id === ownerId && a.status === 'open').length;
}

export async function getAllOwnerLoads(): Promise<
  { owner: string; category: string; load: number; max_load: number }[]
> {
  return Promise.all(
    owners.all().map(async (o) => ({
      owner: o.name,
      category: primaryCategoryFor(o.id) ?? '',
      load: await getCurrentLoad(o.id),
      max_load: o.max_load,
    }))
  );
}

export async function createAssignment(
  customerId: number,
  ownerId: number,
  category: string,
  riskScore: number
): Promise<number> {
  const row = await assignments.insert({
    customer_id: customerId,
    owner_id: ownerId,
    category,
    risk_score: riskScore,
    status: 'open',
    created_at: new Date().toISOString(),
  });
  return row.id;
}

// ---- Bugs -------------------------------------------------------------

export async function getBugsForCustomerName(customerName: string) {
  const customer = customers.find((c) => c.name.toLowerCase() === customerName.toLowerCase());
  if (!customer) return [];
  return bugs
    .filter((b) => b.customer_id === customer.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function markBugFixed(bugId: number) {
  await bugs.update(bugId, { status: 'fixed', fixed_at: new Date().toISOString() });
}

// ---- Notifications ------------------------------------------------------

export async function draftNotification(
  customerId: number | null,
  kind: string,
  message: string
): Promise<number> {
  const row = await notifications.insert({
    customer_id: customerId,
    kind,
    message,
    approved: false,
    created_at: new Date().toISOString(),
    sent_at: null,
  });
  return row.id;
}

export async function approveAndSendNotification(notificationId: number) {
  return notifications.update(notificationId, { approved: true, sent_at: new Date().toISOString() });
}

export async function getPendingNotifications() {
  return notifications
    .filter((n) => !n.approved)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
