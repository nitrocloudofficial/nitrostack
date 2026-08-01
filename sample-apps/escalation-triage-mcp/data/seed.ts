/**
 * Run with: npx tsx data/seed.ts
 * Populates data/escalation.db with demo data: a couple of angry customers,
 * one routine customer, owners per category, and linked bugs (one you can
 * mark "fixed" live during the demo via the mark_bug_fixed tool).
 */
import Database from 'better-sqlite3';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data/escalation.db');
const db = new Database(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, domain TEXT);
CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, subject TEXT, body TEXT, status TEXT DEFAULT 'open', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS slack_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, author TEXT, text TEXT, ts TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bugs (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, title TEXT, description TEXT, status TEXT DEFAULT 'open', created_at TEXT NOT NULL, fixed_at TEXT);
CREATE TABLE IF NOT EXISTS owners (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL, max_load INTEGER DEFAULT 3);
CREATE TABLE IF NOT EXISTS assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, owner_id INTEGER NOT NULL, category TEXT NOT NULL, risk_score INTEGER, status TEXT DEFAULT 'open', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, kind TEXT NOT NULL, message TEXT NOT NULL, approved INTEGER DEFAULT 0, sent_at TEXT);
`);

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// Owners (2 per busy category so overflow has somewhere to go)
const owners = [
  { name: 'Priya', category: 'Billing', max_load: 2 },
  { name: 'Sam', category: 'Billing', max_load: 2 },
  { name: 'Diego', category: 'Technical Bug', max_load: 2 },
  { name: 'Wren', category: 'Technical Bug', max_load: 2 },
  { name: 'Alex', category: 'Onboarding', max_load: 3 },
  { name: 'Noor', category: 'Feature Request', max_load: 3 },
  { name: 'Kai', category: 'Account/Security', max_load: 2 },
];
const insertOwner = db.prepare('INSERT INTO owners (name, category, max_load) VALUES (?, ?, ?)');
for (const o of owners) insertOwner.run(o.name, o.category, o.max_load);

// Customers
const insertCustomer = db.prepare('INSERT INTO customers (name, email, domain) VALUES (?, ?, ?)');
const acmeId = Number(insertCustomer.run('Acme Corp', 'ops@acme.com', 'acme.com').lastInsertRowid);
const globexId = Number(insertCustomer.run('Globex', 'support@globex.io', 'globex.io').lastInsertRowid);
const initechId = Number(insertCustomer.run('Initech', 'hello@initech.com', 'initech.com').lastInsertRowid);

// Acme: angry, multi-signal billing escalation
db.prepare('INSERT INTO tickets (customer_id, subject, body, status, created_at) VALUES (?,?,?,?,?)').run(
  acmeId, 'Double charged again', 'This is unacceptable, we were double charged AGAIN this month. Still not fixed from last time.', 'open', daysAgo(9)
);
db.prepare('INSERT INTO slack_messages (customer_id, author, text, ts) VALUES (?,?,?,?)').run(
  acmeId, 'jordan@acme.com', "We're furious about this billing issue, considering whether to switch to a competitor.", daysAgo(6)
);
db.prepare('INSERT INTO bugs (customer_id, title, description, status, created_at) VALUES (?,?,?,?,?)').run(
  acmeId, 'Billing double-charge on renewal', 'Renewal webhook fires twice under load, causing duplicate charges.', 'open', daysAgo(8)
);

// Globex: technical bug, one you'll mark fixed live
db.prepare('INSERT INTO tickets (customer_id, subject, body, status, created_at) VALUES (?,?,?,?,?)').run(
  globexId, 'Export crashes', 'The CSV export feature crashes with a 500 error every time.', 'open', daysAgo(3)
);
db.prepare('INSERT INTO bugs (customer_id, title, description, status, created_at) VALUES (?,?,?,?,?)').run(
  globexId, 'CSV export 500 error', 'Export endpoint throws on large datasets.', 'open', daysAgo(3)
);

// Initech: routine onboarding question, low risk
db.prepare('INSERT INTO tickets (customer_id, subject, body, status, created_at) VALUES (?,?,?,?,?)').run(
  initechId, 'How do I invite teammates?', 'Trying to figure out the setup for adding my team, could use a pointer.', 'open', daysAgo(1)
);

console.log(`Seeded DB at ${DB_PATH}`);
console.log({ acmeId, globexId, initechId });
