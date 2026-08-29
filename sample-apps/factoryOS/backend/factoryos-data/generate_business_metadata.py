"""
generate_business_metadata.py

Generates the "boring metadata" tier with Faker: supplier company names,
employee/technician names, customer names, purchase order IDs, and incident
IDs. This deliberately does NOT touch anything that affects simulation logic
(prices, delivery times, stock levels, thresholds, telemetry) — it only makes
the human-facing labels look like a real company instead of "Supplier A".

Run:
  python3 generate_business_metadata.py

Output:
  business_metadata.json  -- a pool of ready-to-use names/IDs your backend
                              can assign to suppliers/technicians/orders,
                              either at seed time or dynamically per demo run.

Seeded (Faker.seed(42)) so output is reproducible across your team's machines
-- important so everyone's demo shows the same names during rehearsal.
"""

import json
from faker import Faker

fake = Faker()
Faker.seed(42)

def gen_suppliers(n=8):
    suppliers = []
    for _ in range(n):
        suppliers.append({
            "company_name": fake.company(),
            "contact_name": fake.name(),
            "contact_email": fake.company_email(),
            "phone": fake.phone_number(),
            "city": fake.city(),
            "country": fake.country(),
        })
    return suppliers

def gen_technicians(n=6):
    techs = []
    for _ in range(n):
        techs.append({
            "name": fake.name(),
            "employee_id": f"EMP-{fake.unique.random_number(digits=5, fix_len=True)}",
            "phone": fake.phone_number(),
            "certification": fake.random_element(elements=(
                "Certified Mechanical Technician",
                "Certified Electrical Technician",
                "Certified Millwright",
                "OSHA Safety Certified Technician",
            )),
        })
    return techs

def gen_customers(n=6):
    customers = []
    for _ in range(n):
        customers.append({
            "customer_name": fake.company(),
            "contact_name": fake.name(),
            "contact_email": fake.company_email(),
            "shipping_city": fake.city(),
            "shipping_country": fake.country(),
        })
    return customers

def gen_purchase_order_ids(n=10):
    return [f"PO-{fake.unique.random_number(digits=4, fix_len=True)}" for _ in range(n)]

def gen_incident_ids(n=10):
    return [f"INC-{fake.unique.random_number(digits=4, fix_len=True)}" for _ in range(n)]

def gen_factory_locations(n=4):
    locations = []
    for _ in range(n):
        locations.append({
            "site_name": f"{fake.city()} Manufacturing Plant",
            "address": fake.address().replace("\n", ", "),
        })
    return locations

def main():
    data = {
        "suppliers_pool": gen_suppliers(),
        "technicians_pool": gen_technicians(),
        "customers_pool": gen_customers(),
        "purchase_order_ids_pool": gen_purchase_order_ids(),
        "incident_ids_pool": gen_incident_ids(),
        "factory_locations_pool": gen_factory_locations(),
    }
    with open("business_metadata.json", "w") as f:
        json.dump(data, f, indent=2)
    print("Generated business_metadata.json")
    print(json.dumps(data, indent=2)[:800], "...")

if __name__ == "__main__":
    main()
