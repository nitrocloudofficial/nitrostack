-- This is NOT run automatically. It documents the table/column shape that
-- src/db.ts queries against. Compare this to your existing SQLite file
-- (the one your Python code already connects to) and do ONE of:
--   (a) rename your tables/columns to match this, OR
--   (b) edit the SQL strings in src/db.ts to match your real schema.
-- Option (b) is usually faster if your data already exists.

CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT,
  domain     TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL,
  subject      TEXT,
  body         TEXT,
  status       TEXT DEFAULT 'open',
  created_at   TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS slack_messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL,
  author       TEXT,
  text         TEXT,
  ts           TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS bugs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL,
  title        TEXT,
  description  TEXT,
  status       TEXT DEFAULT 'open', -- 'open' | 'fixed'
  created_at   TEXT NOT NULL,
  fixed_at     TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS owners (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL, -- Billing | Technical Bug | Onboarding | Feature Request | Account/Security
  max_load   INTEGER DEFAULT 3
);

CREATE TABLE IF NOT EXISTS assignments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL,
  owner_id     INTEGER NOT NULL,
  category     TEXT NOT NULL,
  risk_score   INTEGER,
  status       TEXT DEFAULT 'open', -- 'open' | 'resolved'
  created_at   TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (owner_id) REFERENCES owners(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER,
  kind         TEXT NOT NULL, -- 'internal' | 'assignment' | 'resolution'
  message      TEXT NOT NULL,
  approved     INTEGER DEFAULT 0,
  sent_at      TEXT
);
