import os
import sys
import django
from pathlib import Path
from datetime import date, timedelta

BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from medlink.models import Medicine, Pharmacy, Inventory, UserProfile
from django.contrib.auth.models import User

print("Seeding sample data and user login accounts into MedLink database...")

# 1. Create Users & UserProfiles
# Admin / Superuser
admin_user, created = User.objects.get_or_create(username="admin", defaults={"email": "admin@medlink.com"})
admin_user.set_password("admin123")
admin_user.is_superuser = True
admin_user.is_staff = True
admin_user.save()
up, _ = UserProfile.objects.get_or_create(user=admin_user)
up.role = "Admin"
up.save()
print("Synced superuser 'admin' (username: admin, password: admin123)")

# Pharmacy Owner Users
pharmacy_owners = [
    ("apex_owner", "pharmacy123", "Apex", "Owner", "apex@medlink.com"),
    ("lifecare_owner", "pharmacy123", "LifeCare", "Owner", "lifecare@medlink.com"),
    ("greencross_owner", "pharmacy123", "GreenCross", "Owner", "greencross@medlink.com"),
]

for username, password, first, last, email in pharmacy_owners:
    u, _ = User.objects.get_or_create(username=username, defaults={"email": email, "first_name": first, "last_name": last})
    u.set_password(password)
    u.save()
    profile, _ = UserProfile.objects.get_or_create(user=u)
    profile.role = "Pharmacy"
    profile.save()
    print(f"Synced Pharmacy Owner '{username}' (password: {password})")

# Customer Users
customers = [
    ("john_doe", "customer123", "John", "Doe", "john@example.com"),
    ("sarah_connor", "customer123", "Sarah", "Connor", "sarah@example.com"),
    ("priya_sharma", "customer123", "Priya", "Sharma", "priya@example.com"),
]

for username, password, first, last, email in customers:
    u, _ = User.objects.get_or_create(username=username, defaults={"email": email, "first_name": first, "last_name": last})
    u.set_password(password)
    u.save()
    profile, _ = UserProfile.objects.get_or_create(user=u)
    profile.role = "Customer"
    profile.save()
    print(f"Synced Customer '{username}' (password: {password})")

# 2. Create Medicines
medicines_data = [
    {
        "name": "Dolo 650",
        "brand": "Micro Labs",
        "category": "Pain Relief",
        "dosage": "650mg",
        "description": "Relieves fever and mild to moderate pain.",
        "uses": "Fever, Headache, Muscle ache",
        "side_effects": "Nausea, mild allergic reaction",
        "prescription_required": False
    },
    {
        "name": "Amoxicillin 500",
        "brand": "Cipla",
        "category": "Antibiotic",
        "dosage": "500mg",
        "description": "Penicillin antibiotic for bacterial infections.",
        "uses": "Bacterial infections, respiratory tract infections",
        "side_effects": "Diarrhea, rash",
        "prescription_required": True
    },
    {
        "name": "Cetirizine 10",
        "brand": "Dr Reddy",
        "category": "Allergy",
        "dosage": "10mg",
        "description": "Antihistamine for allergy relief.",
        "uses": "Sneezing, runny nose, watery eyes",
        "side_effects": "Drowsiness",
        "prescription_required": False
    },
    {
        "name": "Metformin 500",
        "brand": "Sun Pharma",
        "category": "Diabetes",
        "dosage": "500mg",
        "description": "Blood sugar control medication.",
        "uses": "Type 2 Diabetes",
        "side_effects": "Upset stomach",
        "prescription_required": True
    },
    {
        "name": "Crocin Advance",
        "brand": "GSK",
        "category": "Pain Relief",
        "dosage": "500mg",
        "description": "Fast-acting fever and pain relief.",
        "uses": "Fever, Body ache",
        "side_effects": "Mild indigestion",
        "prescription_required": False
    }
]

created_medicines = []
for m_data in medicines_data:
    med, _ = Medicine.objects.get_or_create(
        name=m_data["name"],
        defaults=m_data
    )
    created_medicines.append(med)

print(f"Created {len(created_medicines)} medicines.")

# 3. Create Pharmacies
pharmacies_data = [
    {
        "name": "Apex Health Medicos",
        "owner_name": "Rajesh Kumar",
        "phone": "+91 9876543210",
        "email": "apex@medlink.com",
        "address": "12 Anna Salai, T. Nagar",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600017",
        "latitude": 13.0400,
        "longitude": 80.2333,
        "opening_time": "08:00:00",
        "closing_time": "22:00:00",
        "is_active": True,
        "is_open": True
    },
    {
        "name": "LifeCare Pharmacy",
        "owner_name": "Anita Sharma",
        "phone": "+91 9876501234",
        "email": "lifecare@medlink.com",
        "address": "45 Mount Road, Guindy",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600032",
        "latitude": 13.0067,
        "longitude": 80.2089,
        "opening_time": "00:00:00",
        "closing_time": "23:59:00",
        "is_active": True,
        "is_open": True
    },
    {
        "name": "Green Cross Pharma",
        "owner_name": "Suresh Raina",
        "phone": "+91 9876567890",
        "email": "greencross@medlink.com",
        "address": "88 OMR Road, Velachery",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600042",
        "latitude": 12.9789,
        "longitude": 80.2205,
        "opening_time": "07:00:00",
        "closing_time": "23:00:00",
        "is_active": True,
        "is_open": True
    }
]

created_pharmacies = []
for p_data in pharmacies_data:
    p, _ = Pharmacy.objects.get_or_create(
        name=p_data["name"],
        defaults=p_data
    )
    created_pharmacies.append(p)

print(f"Created {len(created_pharmacies)} pharmacies.")

# Link Pharmacy Owners to UserProfiles
owners_map = {
    "apex_owner": created_pharmacies[0],
    "lifecare_owner": created_pharmacies[1],
    "greencross_owner": created_pharmacies[2]
}

for username, pharmacy in owners_map.items():
    u = User.objects.get(username=username)
    u.userprofile.pharmacy = pharmacy
    u.userprofile.save()

# 4. Create Inventory
prices = [30.00, 45.50, 15.00, 85.00, 28.00]
quantities = [100, 45, 12, 60, 5]

for p in created_pharmacies:
    for idx, med in enumerate(created_medicines):
        Inventory.objects.get_or_create(
            medicine=med,
            pharmacy=p,
            defaults={
                "quantity": quantities[idx % len(quantities)],
                "price": prices[idx % len(prices)],
                "batch_number": f"BATCH-{p.id}{med.id}01",
                "expiry_date": date.today() + timedelta(days=365)
            }
        )

print("\nAll sample data and user login accounts created successfully!")
