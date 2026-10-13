# AGENTS.md

**Purpose:** Define each AI agent’s role, inputs, outputs, and tool usage so code-generation agents can implement exact NitroStack modules.

## Supervisor Agent

- **Responsibilities:** Monitor conversation transcripts, choose which modules/tools to invoke, and orchestrate the workflow.
- **Input:** Live transcript text plus optional patient context.
- **Output:** Ordered action plan or structured JSON plan listing which tools to call.
- **Tools Called:** Triggers other agents/modules indirectly; may use supervisor-specific analysis tools.
- **Example Prompt:**
  ```
  Given the conversation:
  "Patient: I have chest pain and slight fever."
  As the Supervisor, list the next best actions (which tools to call and with what extracted info) to assist the doctor.
  ```
- **Expected Behavior:** Returns a step-by-step plan, e.g.:
  1. Use History Agent with patient ID.
  2. Use Medication Agent with current meds.
  3. Use Research Agent with query "chest pain guidelines".

## History Agent

- **Responsibilities:** Fetch medical history, chronic conditions, allergies, and medications.
- **Input:** Patient identifier and extracted symptoms or context.
- **Output:** Structured JSON record with keys: `conditions`, `allergies`, `medications`, `recentLabs`.
- **Tools Called:** Uses `getPatientHistory()`.
- **Example Prompt:**
  ```
  Retrieve patient history for ID 1234, focusing on chronic diseases and recent tests. Return JSON with keys: conditions, allergies, medications.
  ```
- **Notes:** Use mock patient records or a FHIR-style API if available. If data is missing, return an informative empty state.

## Medication Agent

- **Responsibilities:** Check current medications for interactions and allergy conflicts.
- **Input:** `drugs` array and `allergies` array from history or transcript.
- **Output:** `{ interactions: string[], conflicts: string[] }`.
- **Tools Called:** `checkDrugInteractions`, `checkAllergyConflicts`.
- **Example Prompt:**
  ```
  Current medications: ["Aspirin", "Lisinopril"]. Known allergies: ["Penicillin"]. Check for any interactions or allergy risks.
  ```
- **Notes:** Prefer OpenFDA drug label data, but fall back to static interaction tables for a stable demo.

## Research Agent

- **Responsibilities:** Query medical literature and summarize recent findings.
- **Input:** Query string derived from symptoms, suspected diagnoses, or clinical context.
- **Output:** `{ articles: [{ title, summary, url }] }`.
- **Tools Called:** `searchPubMed`, `summarizeResearch`.
- **Example Prompt:**
  ```
  Search PubMed for "pneumonia elderly recent treatment guidelines". Return the top 3 article titles and summaries.
  ```
- **Notes:** Use NCBI E-utilities and return public-domain citations.

## Gap Analysis Agent

- **Responsibilities:** Identify missing clinical information and suggest follow-up questions.
- **Input:** Aggregated data such as `symptoms`, `history`, and `medications`.
- **Output:** `{ missing: string[] }`.
- **Tools Called:** `identifyMissingInfo()`.
- **Example Prompt:**
  ```
  Given symptoms "chest pain, cough" and known history "hypertension", what relevant patient information is missing?
  ```
- **Notes:** This agent should help the doctor direct the conversation.

## Report Generator Agent

- **Responsibilities:** Compile a concise clinician-facing briefing from all collected outputs.
- **Input:** Aggregated findings from history, medication, research, and gap analysis modules.
- **Output:** `{ report: string }`.
- **Tools Called:** `generateClinicalSummary()`.
- **Example Prompt:**
  ```
  Create a clinical summary: Patient has chest pain and cough. Include likely diagnosis, relevant history, drug warnings, and recommended next steps.
  ```
- **Notes:** Return text suitable for the UI canvas and a summary panel.

## Tool Call Example

A Supervisor-triggered tool invocation may look like:

```json
{
  "tool": "get_patient_history",
  "input": { "patientId": "1234" }
}
```

This file should guide prompt engineering and help developers create the correct NitroStack modules and tool contracts.
