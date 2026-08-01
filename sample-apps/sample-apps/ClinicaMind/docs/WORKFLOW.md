# WORKFLOW.md

**Purpose:** Describe ClinicaMind’s demo scenarios and the exact orchestration of agent/tool calls.

## Demo Scenarios Table

| Scenario | Patient Profile | Main Issue | Expected AI Outcome |
|---|---|---|---|
| 1. Mild Cold | Age 25, no history | Headache, runny nose | Routine care, no serious alert |
| 2. Interaction Warning | Age 60, on Warfarin | Starts Ibuprofen | Bleeding risk alert |
| 3. Complex Case | Age 70, diabetic, Penicillin allergy | Chest pain, cough | Pneumonia risk, allergy warning, literature summary |

## Scenario 1: Mild Cold

1. **Input:** Patient says "I have a headache and runny nose."
2. **Supervisor:** Extracts symptoms `headache`, `runny nose` and calls `getPatientHistory`.
3. **History Agent:** Returns no chronic conditions, no allergies.
4. **Medication Agent:** No current medications or warnings.
5. **Research Agent:** Calls `searchPubMed({ query: 'common cold symptomatic treatment', limit: 3 })`.
6. **Report:** Summarizes as a routine upper-respiratory illness and recommends rest.

## Scenario 2: Drug Interaction Warning

1. **Input:** Patient says "Doctor gave me ibuprofen, but I’m on warfarin."
2. **Supervisor:** Identifies `ibuprofen` and `warfarin`, then calls `checkDrugInteractions`.
3. **Medication Agent:** Returns `{"interactions": ["Warfarin + Ibuprofen may increase bleeding risk"]}`.
4. **Supervisor:** Optionally calls `checkAllergyConflicts` with any allergy data.
5. **Report:** Flags high-risk interaction and recommends an alternative such as acetaminophen.

## Scenario 3: Complex Pneumonia Case

1. **Input:** Patient says "Chest pain for two days; I’m diabetic, allergic to penicillin."
2. **Supervisor:** Extracts symptoms `chest pain`, `cough`, and patient risk factors.
3. **History Agent:** Returns diabetes, Penicillin allergy, and medications like `Metformin`.
4. **Medication Agent:** Runs `checkAllergyConflicts` and `checkDrugInteractions`.
5. **Research Agent:** Runs `searchPubMed({ query: 'diabetes pneumonia treatment 2026', limit: 3 })`.
6. **Gap Analysis Agent:** Runs `identifyMissingInfo` and returns `Smoking history`.
7. **Report:** Creates a summary that highlights pneumonia risk, allergy caution, and follow-up questions.

## Orchestration Trace Example

**Case 3 pseudo-flow:**

- Supervisor: "Symptom: chest pain" → `getPatientHistory({ patientId })` → returns history
- Supervisor: "Diabetes found, allergy: penicillin" → `checkAllergyConflicts(...)` → returns conflicts
- Supervisor: "Pending literature search" → `searchPubMed(...)` → returns articles
- Supervisor: "Missing info" → `identifyMissingInfo(...)` → returns prompts
- Report Agent: `generateClinicalSummary(...)` → returns the final briefing

This trace shows the planned sequence of agentic decision making and tool invocation for judges and code-generating systems.
