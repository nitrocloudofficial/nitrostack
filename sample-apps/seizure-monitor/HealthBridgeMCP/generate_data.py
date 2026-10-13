import json
import random
from datetime import datetime, timedelta

def generate_patients():
    hospitals = {
        "HOSP-A": "City General Hospital",
        "HOSP-B": "Sunrise Medical Centre",
        "HOSP-C": "Green Valley Clinic",
        "HOSP-D": "Lakeside Pharmacy & Hospital"
    }
    
    first_names = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Sanya", "Diya", "Ananya", "Riya", "Kavya", "Aisha", "Aditi", "Pooja", "Neha", "Simran", "Raj", "Rahul", "Amit", "Vikram", "Sanjay", "Ravi", "Anil", "Sunil", "Prakash", "Ramesh", "Fatima", "Zoya", "Zara", "Sana", "Iqra", "Amina", "Mariam", "Zainab", "Ali", "Omar", "Hassan", "Ibrahim", "Zaid"]
    last_names = ["Sharma", "Verma", "Gupta", "Malhotra", "Singh", "Patel", "Kumar", "Shah", "Desai", "Joshi", "Bhatt", "Menon", "Pillai", "Nair", "Rao", "Reddy", "Iyer", "Chopra", "Kapoor", "Khan", "Ali", "Syed", "Shaikh", "Ansari", "Qureshi"]
    
    doctors = ["Dr. Radhika Menon", "Dr. Suresh Pillai", "Dr. Arvind Bhatt", "Dr. Ananya Krishnan", "Dr. Pradeep Joshi", "Dr. Rakesh Kumar", "Dr. Smita Sharma", "Dr. Vikram Singh", "Dr. Neha Gupta", "Dr. Amit Patel"]
    
    diagnoses = ["Hypertension", "Upper Respiratory Infection", "Deep Vein Thrombosis", "Type 2 Diabetes", "Asthma", "Osteoarthritis", "Gastroesophageal Reflux", "Hyperlipidemia", "Migraine", "Urinary Tract Infection", "Allergic Rhinitis", "Bronchitis", "Pneumonia", "Anemia", "Hypothyroidism"]
    
    medicines = [
        "warfarin", "aspirin", "metformin", "lisinopril", "amoxicillin", "atorvastatin", "ibuprofen", "paracetamol", "omeprazole", "cetirizine", "amlodipine", "metoprolol", "azithromycin", "doxycycline", "rosuvastatin", "sulfamethoxazole", "penicillin v", "flucloxacillin", "co-amoxiclav", "sulfasalazine", "co-trimoxazole", "naproxen", "diclofenac", "celecoxib", "indomethacin", "codeine", "dihydrocodeine", "co-codamol", "iohexol", "iodixanol", "iopamidol", "theophylline", "methotrexate", "clopidogrel", "amiodarone", "simvastatin"
    ]
    
    tests = ["ECG", "Renal Function Test", "Throat Swab Culture", "D-Dimer", "Doppler Ultrasound", "CBC", "Lipid Panel", "Skin Prick Test", "HbA1c", "Chest X-Ray", "Liver Function Test", "Urinalysis", "Thyroid Profile", "MRI", "CT Scan"]
    
    all_allergies = ["sulfa", "penicillin", "aspirin", "codeine", "latex", "contrast dye"]
    
    patients = []
    
    for i in range(1, 301):
        patient_id = f"PAT-{i:03d}"
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        
        # random dob between 1940 and 2010
        dob = datetime(1940, 1, 1) + timedelta(days=random.randint(0, 365 * 70))
        
        num_visits = random.randint(1, 6)
        
        known_allergies = set()
        if random.random() < 0.2:
            known_allergies.add(random.choice(all_allergies))
            if random.random() < 0.1:
                known_allergies.add(random.choice(all_allergies))
        
        patient = {
            "patientId": patient_id,
            "name": name,
            "dateOfBirth": dob.strftime("%Y-%m-%d"),
            "knownAllergies": list(known_allergies),
            "visits": []
        }
        
        current_date = datetime(2023, 1, 1) + timedelta(days=random.randint(0, 365))
        
        for j in range(num_visits):
            visit_id = f"VIS-{patient_id}-{j+1:03d}"
            hospital_id = random.choice(list(hospitals.keys()))
            hospital_name = hospitals[hospital_id]
            doctor = random.choice(doctors)
            
            diagnosis = random.choice(diagnoses)
            
            prescribed = []
            num_meds = random.randint(0, 3)
            for _ in range(num_meds):
                med = random.choice(medicines)
                prescribed.append({"name": med, "dosage": "Standard dose"})
                
            ordered_tests = random.sample(tests, random.randint(0, 3))
            
            noted_allergies = []
            if random.random() < 0.05:
                new_alg = random.choice(all_allergies)
                if new_alg not in patient["knownAllergies"]:
                    noted_allergies.append(new_alg)
                    patient["knownAllergies"].append(new_alg)
                    
            notes_samples = [
                "Patient reported mild symptoms. Advised rest.",
                "Follow-up required in 4 weeks.",
                "Symptoms improving. Continue current medication.",
                "New symptoms observed. Adjusted treatment plan.",
                "Routine checkup. No acute distress."
            ]
            
            visit = {
                "visitId": visit_id,
                "hospitalId": hospital_id,
                "hospitalName": hospital_name,
                "doctorName": doctor,
                "date": current_date.strftime("%Y-%m-%d"),
                "diagnosis": diagnosis,
                "prescribedMedicines": prescribed,
                "testsOrdered": ordered_tests,
                "allergiesNoted": noted_allergies,
                "notes": random.choice(notes_samples)
            }
            
            patient["visits"].append(visit)
            
            # advance date by 15-90 days
            current_date += timedelta(days=random.randint(15, 90))
            
        patients.append(patient)
        
    # Introduce some deliberate conflicts for testing
    
    # 1. Drug-drug interaction (Patient 10)
    patients[9]["visits"][-1]["prescribedMedicines"] = [
        {"name": "warfarin", "dosage": "5mg"},
        {"name": "aspirin", "dosage": "75mg"}
    ]
    
    # 2. Allergy conflict (Patient 20)
    patients[19]["knownAllergies"] = ["penicillin"]
    patients[19]["visits"][-1]["prescribedMedicines"] = [
        {"name": "amoxicillin", "dosage": "500mg"}
    ]
    
    # 3. Duplicate test (Patient 30)
    if len(patients[29]["visits"]) >= 2:
        test = "ECG"
        date1 = datetime.strptime(patients[29]["visits"][-2]["date"], "%Y-%m-%d")
        date2 = date1 + timedelta(days=5) # Within 14 days
        patients[29]["visits"][-1]["date"] = date2.strftime("%Y-%m-%d")
        patients[29]["visits"][-2]["testsOrdered"] = [test]
        patients[29]["visits"][-1]["testsOrdered"] = [test]
        patients[29]["visits"][-2]["hospitalId"] = "HOSP-A"
        patients[29]["visits"][-1]["hospitalId"] = "HOSP-B"

    # 4. Followup escalation (same diagnosis within 90 days, different hospital) (Patient 40)
    if len(patients[39]["visits"]) >= 2:
        diag = "Hypertension"
        date1 = datetime.strptime(patients[39]["visits"][-2]["date"], "%Y-%m-%d")
        date2 = date1 + timedelta(days=45) # Within 90 days
        patients[39]["visits"][-1]["date"] = date2.strftime("%Y-%m-%d")
        patients[39]["visits"][-2]["diagnosis"] = diag
        patients[39]["visits"][-1]["diagnosis"] = diag
        patients[39]["visits"][-2]["hospitalId"] = "HOSP-C"
        patients[39]["visits"][-1]["hospitalId"] = "HOSP-D"
        
    with open("C:/Users/barna/Downloads/Project/data/patients.json", "w") as f:
        json.dump(patients, f, indent=2)
        
if __name__ == "__main__":
    generate_patients()
    print("Data generated successfully.")
