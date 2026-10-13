#!/usr/bin/env python3
import sqlite3
import random
import json
import uuid
import sys
from pathlib import Path
from datetime import datetime, timedelta

try:
    from faker import Faker
except ImportError:
    print("Faker not installed. Please install it using: pip install Faker")
    sys.exit(1)

fake = Faker()
Faker.seed(42)
random.seed(42)

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "ale-scm.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

def create_schema():
    print("Ensuring schema exists...")
    schema = """
    DROP TABLE IF EXISTS invoice_line_items;
    DROP TABLE IF EXISTS exceptions;
    DROP TABLE IF EXISTS goods_receipts;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS purchase_orders;
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS hs_code_fts;
    DROP TABLE IF EXISTS hs_code_reference;
    DROP TABLE IF EXISTS compliance_rules;
    DROP TABLE IF EXISTS alerts;
    DROP TABLE IF EXISTS fx_rates;
    DROP TABLE IF EXISTS approval_thresholds;
    DROP TABLE IF EXISTS analytics_daily_summary;

    CREATE TABLE purchase_orders (
      po_number TEXT PRIMARY KEY, vendor TEXT NOT NULL, sku TEXT NOT NULL, ordered_qty INTEGER NOT NULL, unit_price REAL NOT NULL, hs_code TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE invoices (
      invoice_number TEXT PRIMARY KEY, po_number TEXT REFERENCES purchase_orders(po_number), vendor TEXT NOT NULL, invoice_date TEXT, total_amount REAL, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE invoice_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT REFERENCES invoices(invoice_number), sku TEXT, description TEXT, quantity INTEGER, unit_price REAL, total REAL
    );
    CREATE TABLE goods_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, po_number TEXT REFERENCES purchase_orders(po_number), sku TEXT, received_qty INTEGER, received_date TEXT
    );
    CREATE TABLE exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_id TEXT, invoice_number TEXT REFERENCES invoices(invoice_number), reason TEXT, discrepancies TEXT, status TEXT DEFAULT 'flagged', created_at TEXT DEFAULT (datetime('now')), resolved_at TEXT
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_id TEXT, tool_name TEXT, input_hash TEXT, output_hash TEXT, actor TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE hs_code_reference (
      hs_code TEXT PRIMARY KEY, description TEXT, keywords TEXT
    );
    CREATE VIRTUAL TABLE hs_code_fts USING fts5(hs_code, description, keywords);
    CREATE TABLE compliance_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT, rule_type TEXT, rule_definition TEXT, version INTEGER, effective_date TEXT
    );
    CREATE TABLE alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT, template TEXT, status TEXT, payload TEXT, created_at TEXT DEFAULT (datetime('now')), delivered_at TEXT
    );
    CREATE TABLE fx_rates (
      currency_pair TEXT PRIMARY KEY, rate REAL, as_of_date TEXT
    );
    CREATE TABLE approval_thresholds (
      id INTEGER PRIMARY KEY AUTOINCREMENT, min_amount REAL, max_amount REAL, required_approver_role TEXT
    );
    CREATE TABLE analytics_daily_summary (
      date TEXT PRIMARY KEY, invoice_count INTEGER, exception_count INTEGER, avg_cycle_time_minutes REAL, stp_rate REAL, refreshed_at TEXT
    );
    """
    cursor.executescript(schema)
    conn.commit()

def generate_data():
    # 1. Purchase Orders (150)
    print("Generating Purchase Orders...")
    vendors = [fake.company() for _ in range(30)]
    pos = []
    for i in range(1, 151):
        po_num = f"PO-MOCK-{i:04d}"
        vendor = random.choice(vendors)
        sku = f"{fake.word().upper()[:3]}-{random.randint(100, 999)}"
        qty = random.randint(10, 1000)
        price = round(random.uniform(5.0, 5000.0), 2)
        hs_code = f"{random.randint(1000, 9999)}.{random.randint(10, 99)}"
        created_at = fake.date_time_between(start_date='-1y', end_date='now').isoformat()
        pos.append((po_num, vendor, sku, qty, price, hs_code, created_at))
    cursor.executemany("INSERT OR IGNORE INTO purchase_orders VALUES (?, ?, ?, ?, ?, ?, ?)", pos)

    # 2. Invoices (150)
    print("Generating Invoices...")
    invoices = []
    statuses = ['pending', 'auto_approved', 'pending_approval', 'flagged']
    for i in range(1, 151):
        inv_num = f"INV-MOCK-{i:04d}"
        po = random.choice(pos)
        po_num, vendor = po[0], po[1]
        inv_date = fake.date_between(start_date='-1y', end_date='today').isoformat()
        amt = round(random.uniform(10.0, 10000.0), 2)
        status = random.choice(statuses)
        created_at = fake.date_time_between(start_date='-1y', end_date='now').isoformat()
        invoices.append((inv_num, po_num, vendor, inv_date, amt, status, created_at))
    cursor.executemany("INSERT OR IGNORE INTO invoices VALUES (?, ?, ?, ?, ?, ?, ?)", invoices)

    # 3. Invoice Line Items (200)
    print("Generating Invoice Line Items...")
    line_items = []
    for i in range(200):
        inv = random.choice(invoices)
        inv_num = inv[0]
        sku = f"SKU-MOCK-{random.randint(100, 999)}"
        desc = fake.sentence(nb_words=4)
        qty = random.randint(1, 100)
        price = round(random.uniform(1.0, 500.0), 2)
        total = round(qty * price, 2)
        line_items.append((inv_num, sku, desc, qty, price, total))
    cursor.executemany("INSERT INTO invoice_line_items (invoice_number, sku, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)", line_items)

    # 4. Goods Receipts (120)
    print("Generating Goods Receipts...")
    grs = []
    for i in range(120):
        po = random.choice(pos)
        po_num, sku = po[0], po[2]
        qty = random.randint(1, po[3])
        rec_date = fake.date_between(start_date='-1y', end_date='today').isoformat()
        grs.append((po_num, sku, qty, rec_date))
    cursor.executemany("INSERT INTO goods_receipts (po_number, sku, received_qty, received_date) VALUES (?, ?, ?, ?)", grs)

    # 5. Exceptions (110)
    print("Generating Exceptions...")
    exceptions = []
    for i in range(110):
        wf_id = str(uuid.uuid4())
        inv_num = random.choice(invoices)[0]
        reason = random.choice(['Price Mismatch', 'Quantity Mismatch', 'Missing PO', 'Invalid HS Code'])
        discrepancies = json.dumps([fake.sentence(nb_words=3) for _ in range(random.randint(1, 3))])
        status = random.choice(['flagged', 'resolved'])
        created_at = fake.date_time_between(start_date='-6m', end_date='now')
        resolved_at = (created_at + timedelta(days=random.randint(1, 10))).isoformat() if status == 'resolved' else None
        exceptions.append((wf_id, inv_num, reason, discrepancies, status, created_at.isoformat(), resolved_at))
    cursor.executemany("INSERT INTO exceptions (workflow_id, invoice_number, reason, discrepancies, status, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?)", exceptions)

    # 6. Audit Log (150)
    print("Generating Audit Log...")
    audit = []
    for i in range(150):
        wf_id = str(uuid.uuid4())
        tool = random.choice(['execute_workflow', 'match_invoice_to_po', 'classify', 'extract'])
        in_hash = fake.sha256()
        out_hash = fake.sha256()
        actor = random.choice(['system', 'finance_user', 'admin'])
        created = fake.date_time_between(start_date='-6m', end_date='now').isoformat()
        audit.append((wf_id, tool, in_hash, out_hash, actor, created))
    cursor.executemany("INSERT INTO audit_log (workflow_id, tool_name, input_hash, output_hash, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)", audit)

    # 7. HS Code Reference (120)
    print("Generating HS Code Reference...")
    hs_codes = []
    for i in range(120):
        code = f"{random.randint(1000, 9999)}.{random.randint(10, 99)}"
        desc = fake.catch_phrase()
        keywords = " ".join(fake.words(nb=5))
        hs_codes.append((code, desc, keywords))
    cursor.executemany("INSERT OR IGNORE INTO hs_code_reference VALUES (?, ?, ?)", hs_codes)
    cursor.executemany("INSERT INTO hs_code_fts (hs_code, description, keywords) VALUES (?, ?, ?)", hs_codes)

    # 8. Compliance Rules (100)
    print("Generating Compliance Rules...")
    rules = []
    for i in range(100):
        rtype = random.choice(['sanctions', 'customs', 'tax', 'environmental'])
        rdef = json.dumps({"param": fake.word(), "value": random.randint(1, 100)})
        version = random.randint(1, 5)
        eff_date = fake.date_between(start_date='-2y', end_date='today').isoformat()
        rules.append((rtype, rdef, version, eff_date))
    cursor.executemany("INSERT INTO compliance_rules (rule_type, rule_definition, version, effective_date) VALUES (?, ?, ?, ?)", rules)

    # 9. Alerts (110)
    print("Generating Alerts...")
    alerts = []
    for i in range(110):
        rec = fake.email()
        tpl = random.choice(['exception_alert', 'approval_reminder', 'stp_summary'])
        status = random.choice(['pending', 'delivered', 'failed'])
        payload = json.dumps({"invoice": f"INV-{random.randint(1000,9999)}"})
        created = fake.date_time_between(start_date='-1m', end_date='now')
        delivered = (created + timedelta(minutes=random.randint(1, 60))).isoformat() if status == 'delivered' else None
        alerts.append((rec, tpl, status, payload, created.isoformat(), delivered))
    cursor.executemany("INSERT INTO alerts (recipient, template, status, payload, created_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?)", alerts)

    # 10. FX Rates (120)
    print("Generating FX Rates...")
    unique_pairs = list(set([f"{fake.currency_code()}/{fake.currency_code()}" for _ in range(300)]))[:120]
    fx = [(p, round(random.uniform(0.01, 1.5), 4), fake.date_between(start_date='-1m', end_date='today').isoformat()) for p in unique_pairs]
    cursor.executemany("INSERT OR IGNORE INTO fx_rates VALUES (?, ?, ?)", fx)

    # 11. Approval Thresholds (100)
    print("Generating Approval Thresholds...")
    thresholds = []
    for i in range(100):
        min_amt = i * 1000.0
        max_amt = (i + 1) * 1000.0
        role = random.choice(['manager', 'director', 'vp', 'cfo'])
        thresholds.append((min_amt, max_amt, role))
    cursor.executemany("INSERT INTO approval_thresholds (min_amount, max_amount, required_approver_role) VALUES (?, ?, ?)", thresholds)

    # 12. Analytics Daily Summary (120)
    print("Generating Analytics...")
    analytics = []
    start_date = datetime.now() - timedelta(days=120)
    for i in range(120):
        d = (start_date + timedelta(days=i)).date().isoformat()
        inv_c = random.randint(50, 500)
        exc_c = random.randint(0, 50)
        avg_cyc = round(random.uniform(10.0, 120.0), 2)
        stp = round(1.0 - (exc_c / inv_c), 2) if inv_c > 0 else 1.0
        refreshed = (start_date + timedelta(days=i, hours=23)).isoformat()
        analytics.append((d, inv_c, exc_c, avg_cyc, stp, refreshed))
    cursor.executemany("INSERT OR IGNORE INTO analytics_daily_summary VALUES (?, ?, ?, ?, ?, ?)", analytics)

    conn.commit()
    print("All mock data generated successfully in data/ale-scm.db!")

if __name__ == "__main__":
    create_schema()
    generate_data()
