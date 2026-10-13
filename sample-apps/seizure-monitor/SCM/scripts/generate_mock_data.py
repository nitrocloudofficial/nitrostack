#!/usr/bin/env python3
import json
import random
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
DATA_FILE = BASE_DIR / "data" / "master-data.json"

def generate_data():
    # 2. Denied Parties (100)
    denied_parties = []
    for i in range(100):
        denied_parties.append({
            "entity_name": f"{fake.company()} Restricted {i}",
            "country": fake.country(),
            "reason": random.choice(["Sanctions", "Export Violation", "Financial Crime", "Terrorism"])
        })

    # 3. Purchase Orders (150)
    vendors = [fake.company() for _ in range(30)]
    pos = []
    for i in range(1, 151):
        pos.append({
            "po_number": f"PO-MOCK-{i:04d}",
            "vendor": random.choice(vendors),
            "sku": f"{fake.word().upper()[:3]}-{random.randint(100, 999)}",
            "ordered_qty": random.randint(10, 1000),
            "unit_price": round(random.uniform(5.0, 5000.0), 2),
            "hs_code": f"{random.randint(1000, 9999)}.{random.randint(10, 99)}",
            "created_at": fake.date_time_between(start_date='-1y', end_date='now').isoformat()
        })

    # 4. Invoices (150)
    invoices = []
    statuses = ['pending', 'auto_approved', 'pending_approval', 'flagged']
    for i in range(1, 151):
        po = random.choice(pos)
        invoices.append({
            "invoice_number": f"INV-MOCK-{i:04d}",
            "po_number": po["po_number"],
            "vendor": po["vendor"],
            "invoice_date": fake.date_between(start_date='-1y', end_date='today').isoformat(),
            "total_amount": round(random.uniform(10.0, 10000.0), 2),
            "status": random.choice(statuses),
            "created_at": fake.date_time_between(start_date='-1y', end_date='now').isoformat()
        })

    # 5. Invoice Line Items (200)
    line_items = []
    for i in range(200):
        inv = random.choice(invoices)
        qty = random.randint(1, 100)
        price = round(random.uniform(1.0, 500.0), 2)
        line_items.append({
            "invoice_number": inv["invoice_number"],
            "sku": f"SKU-MOCK-{random.randint(100, 999)}",
            "description": fake.sentence(nb_words=4),
            "quantity": qty,
            "unit_price": price,
            "total": round(qty * price, 2)
        })

    # 6. Goods Receipts (120)
    grs = []
    for i in range(120):
        po = random.choice(pos)
        grs.append({
            "po_number": po["po_number"],
            "sku": po["sku"],
            "received_qty": random.randint(1, po["ordered_qty"]),
            "received_date": fake.date_between(start_date='-1y', end_date='today').isoformat()
        })

    # 7. Exceptions (110)
    exceptions = []
    for i in range(110):
        status = random.choice(['flagged', 'resolved'])
        created_at = fake.date_time_between(start_date='-6m', end_date='now')
        exceptions.append({
            "workflow_id": str(uuid.uuid4()),
            "invoice_number": random.choice(invoices)["invoice_number"],
            "reason": random.choice(['Price Mismatch', 'Quantity Mismatch', 'Missing PO', 'Invalid HS Code']),
            "discrepancies": json.dumps([fake.sentence(nb_words=3) for _ in range(random.randint(1, 3))]),
            "status": status,
            "created_at": created_at.isoformat(),
            "resolved_at": (created_at + timedelta(days=random.randint(1, 10))).isoformat() if status == 'resolved' else None
        })

    # 8. Audit Log (150)
    audit = []
    for i in range(150):
        audit.append({
            "workflow_id": str(uuid.uuid4()),
            "tool_name": random.choice(['execute_workflow', 'match_invoice_to_po', 'classify', 'extract']),
            "input_hash": fake.sha256(),
            "output_hash": fake.sha256(),
            "actor": random.choice(['system', 'finance_user', 'admin']),
            "created_at": fake.date_time_between(start_date='-6m', end_date='now').isoformat()
        })

    # 9. HS Code Reference (120)
    hs_codes = []
    for i in range(120):
        hs_codes.append({
            "hs_code": f"{random.randint(1000, 9999)}.{random.randint(10, 99)}",
            "description": fake.catch_phrase(),
            "keywords": " ".join(fake.words(nb=5))
        })

    # 10. Compliance Rules (100)
    rules = []
    for i in range(100):
        rules.append({
            "rule_type": random.choice(['sanctions', 'customs', 'tax', 'environmental']),
            "rule_definition": json.dumps({"param": fake.word(), "value": random.randint(1, 100)}),
            "version": random.randint(1, 5),
            "effective_date": fake.date_between(start_date='-2y', end_date='today').isoformat()
        })

    # 15. Alerts Queue (110) - Needs to be generated before alerts so alerts can reference it
    alerts_queue = []
    for i in range(1, 111):
        status = random.choice(['queued', 'sent', 'failed'])
        created = fake.date_time_between(start_date='-1m', end_date='now')
        alerts_queue.append({
            "id": i,
            "recipient": fake.email(),
            "template": random.choice(['exception_alert', 'approval_reminder', 'stp_summary']),
            "subject": fake.sentence(nb_words=5),
            "payload": json.dumps({"invoice": f"INV-{random.randint(1000,9999)}"}),
            "status": status,
            "attempt_count": random.randint(0, 3),
            "last_error": fake.sentence(nb_words=4) if status == 'failed' else None,
            "created_at": created.isoformat(),
            "sent_at": (created + timedelta(minutes=random.randint(1, 60))).isoformat() if status == 'sent' else None,
            "next_attempt_at": (created + timedelta(hours=1)).isoformat() if status in ['queued', 'failed'] else None
        })

    # 11. Alerts (110)
    alerts = []
    for i in range(110):
        q = random.choice(alerts_queue)
        alerts.append({
            "recipient": q["recipient"],
            "template": q["template"],
            "status": 'delivered' if q["status"] == 'sent' else 'pending',
            "payload": q["payload"],
            "created_at": q["created_at"],
            "delivered_at": q["sent_at"],
            "queue_id": q["id"]
        })

    # 12. FX Rates (120)
    unique_pairs = list(set([f"{fake.currency_code()}/{fake.currency_code()}" for _ in range(300)]))[:120]
    fx = []
    for p in unique_pairs:
        fx.append({
            "currency_pair": p,
            "rate": round(random.uniform(0.01, 1.5), 4),
            "as_of_date": fake.date_between(start_date='-1m', end_date='today').isoformat()
        })

    # 13. Approval Thresholds (100)
    thresholds = []
    for i in range(100):
        thresholds.append({
            "min_amount": i * 1000.0,
            "max_amount": (i + 1) * 1000.0,
            "required_approver_role": random.choice(['manager', 'director', 'vp', 'cfo'])
        })

    # 14. Analytics Daily Summary (120)
    analytics = []
    start_date = datetime.now() - timedelta(days=120)
    for i in range(120):
        inv_c = random.randint(50, 500)
        exc_c = random.randint(0, 50)
        analytics.append({
            "date": (start_date + timedelta(days=i)).date().isoformat(),
            "invoice_count": inv_c,
            "exception_count": exc_c,
            "avg_cycle_time_minutes": round(random.uniform(10.0, 120.0), 2),
            "stp_rate": round(1.0 - (exc_c / inv_c), 2) if inv_c > 0 else 1.0,
            "refreshed_at": (start_date + timedelta(days=i, hours=23)).isoformat()
        })

    data = {
        "denied_parties": denied_parties,
        "purchase_orders": pos,
        "invoices": invoices,
        "invoice_line_items": line_items,
        "goods_receipts": grs,
        "exceptions": exceptions,
        "audit_log": audit,
        "hs_code_reference": hs_codes,
        "compliance_rules": rules,
        "alerts_queue": alerts_queue,
        "alerts": alerts,
        "fx_rates": fx,
        "approval_thresholds": thresholds,
        "analytics_daily_summary": analytics
    }
    
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"✅ Successfully generated mock data for all tables with snake_case keys in {DATA_FILE}")

if __name__ == "__main__":
    generate_data()
