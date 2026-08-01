# HealthBridge MCP — SPEC.md

> ⚠️ FROZEN — do not modify after Hour 1:00. All lanes depend on this file.

---

## 1. `patient_history` Resource Schema

The canonical shape of a single patient's full cross-hospital timeline:

```json
{
  "patientId": "string",
  "name": "string",
  "dateOfBirth": "string (YYYY-MM-DD)",
  "knownAllergies": ["string"],
  "visits": [
    {
      "visitId": "string",
      "hospitalId": "string",
      "hospitalName": "string",
      "doctorName": "string",
      "date": "string (YYYY-MM-DD)",
      "diagnosis": "string",
      "prescribedMedicines": [
        { "name": "string", "dosage": "string" }
      ],
      "testsOrdered": ["string"],
      "allergiesNoted": ["string"],
      "notes": "string"
    }
  ]
}
```

> **Design note:** `knownAllergies` at the patient level is the *union* of all `allergiesNoted` arrays across every visit — the resource pre-aggregates this so downstream tools don't have to scan. `testsOrdered` is an array of test names (e.g., `"CBC"`, `"Lipid Panel"`) used by `cross_hospital_safety_check` to detect duplicate tests.

---

## 2. Tool I/O Schemas

### Tool 1 — `log_patient_visit`

**Input:**
```json
{
  "patientId": "string",
  "hospitalId": "string",
  "doctorName": "string",
  "diagnosis": "string",
  "prescribedMedicines": [{ "name": "string", "dosage": "string" }],
  "allergiesNoted": "string[]",
  "notes": "string"
}
```

**Output:**
```json
{
  "visitId": "string",
  "recordedToHistory": true,
  "firstVisitAtThisHospital": "boolean"
}
```

---

### Tool 2 — `cross_hospital_safety_check`

**Input:**
```json
{ "patientId": "string", "newPrescription": [{ "name": "string", "dosage": "string" }] }
```

**Output:**
```json
{
  "conflicts": [
    {
      "type": "drug_interaction | allergy | duplicate_test",
      "sourceHospital": "string",
      "sourceDate": "string",
      "detail": "string"
    }
  ],
  "riskLevel": "none | caution | high"
}
```

---

### Tool 3 — `medicine_availability_check`

**Input:**
```json
{ "hospitalId": "string", "medicine": "string", "quantity": "number" }
```

**Output:**
```json
{
  "availableLocally": "boolean",
  "action": "dispense | reroute | replenish_requested",
  "rerouteFacility": "string | null",
  "notificationSent": "boolean"
}
```

---

### Tool 4 — `followup_scheduler`

**Input:**
```json
{ "patientId": "string", "diagnosis": "string", "severity": "mild | moderate | severe" }
```

**Output:**
```json
{
  "urgencyTier": "Routine | Soon | Urgent",
  "recommendedFollowupDays": "number",
  "doctorNotified": "boolean",
  "reason": "string"
}
```

---

## 3. Shared Constants & Naming Conventions

| Constant | Value / Format |
|---|---|
| `hospitalId` values | `"HOSP-A"`, `"HOSP-B"`, `"HOSP-C"`, `"HOSP-D"` |
| `patientId` values | `"PAT-001"` through `"PAT-010"` |
| `visitId` format | `"VIS-{patientId}-{incrementing_number}"` e.g. `"VIS-PAT-001-003"` |
| Date format | `YYYY-MM-DD` always |
| Medicine names | Lowercase generic names: `"warfarin"`, `"aspirin"`, `"metformin"`, `"ibuprofen"`, `"lisinopril"` |
| Allergy entries | Lowercase: `"penicillin"`, `"sulfa"`, `"aspirin"` |
| Drug interaction table | `data/drug_interactions.json` |
| Facility stock table | `data/facility_stock.json` |
| Patient history fixture | `data/patients.json` |

---

## 4. Hospital Directory

| `hospitalId` | `hospitalName` |
|---|---|
| `HOSP-A` | City General Hospital |
| `HOSP-B` | Sunrise Medical Centre |
| `HOSP-C` | Green Valley Clinic |
| `HOSP-D` | Lakeside Pharmacy & Hospital |
