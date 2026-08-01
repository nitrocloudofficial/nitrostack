# TOOLS.md

**Purpose:** Define each NitroStack MCP tool signature, description, schema, and implementation stub.

## Tool Overview

ClinicaMind tools are NitroStack `@Tool` methods that accept JSON input and return JSON output. Each tool is a backend contract for an agentic action.

## Tool List

### `listenConversation` (Supervisor Module)
- **Description:** Continue speech-to-text transcription for the doctor-patient conversation.
- **Input:** `{}`
- **Output:** `{ transcript: string }
`
- **Example Payload:** `{}`
- **Example Response:** `{ "transcript": "Patient: I have chest pain and fever." }`

```ts
@Tool({
  name: 'listen_conversation',
  description: 'Start or continue speech-to-text transcription from the doctor-patient conversation',
  inputSchema: z.object({})
})
async listenConversation(input, ctx) {
  return { transcript: '...' };
}
```

### `getPatientHistory` (History Module)
- **Description:** Retrieve medical history, allergies, and medications for a patient ID.
- **Input:** `{ patientId: string }
- **Output:** `{ conditions: string[], allergies: string[], medications: string[], recentLabs?: string[] }`
- **Example Payload:** `{ "patientId": "1234" }`

```ts
@Tool({
  name: 'get_patient_history',
  description: 'Retrieve medical history, allergies, and medications for a patient ID',
  inputSchema: z.object({ patientId: z.string() })
})
async getPatientHistory(input, ctx) {
  return {
    conditions: ['hypertension', 'type 2 diabetes'],
    allergies: ['Penicillin'],
    medications: ['Metformin', 'Lisinopril'],
    recentLabs: ['HbA1c 7.8%', 'BP 142/88']
  };
}
```

### `checkDrugInteractions` (Medication Module)
- **Description:** Identify known drug–drug interactions in the list of medications.
- **Input:** `{ drugs: string[] }
- **Output:** `{ interactions: string[] }`
- **Example Payload:** `{ "drugs": ["Aspirin", "Ibuprofen"] }`

```ts
@Tool({
  name: 'check_drug_interactions',
  description: 'Identify known drug–drug interactions in the list of medications',
  inputSchema: z.object({ drugs: z.array(z.string()) })
})
async checkDrugInteractions(input, ctx) {
  return { interactions: ['Aspirin + Ibuprofen may increase bleeding risk'] };
}
```

### `checkAllergyConflicts` (Medication Module)
- **Description:** Detect any drug that matches the patient’s allergy list.
- **Input:** `{ drugs: string[], allergies: string[] }
- **Output:** `{ conflicts: string[] }`
- **Example Payload:** `{ "drugs": ["Amoxicillin"], "allergies": ["Penicillin"] }`

```ts
@Tool({
  name: 'check_allergy_conflicts',
  description: 'Detect any drug that matches patient allergies',
  inputSchema: z.object({
    drugs: z.array(z.string()),
    allergies: z.array(z.string())
  })
})
async checkAllergyConflicts(input, ctx) {
  return { conflicts: ['Amoxicillin may cross-react with Penicillin allergy'] };
}
```

### `searchPubMed` (Research Module)
- **Description:** Query PubMed via NCBI E-utilities.
- **Input:** `{ query: string, limit?: number }
- **Output:** `{ articles: { title: string, summary: string, url: string }[] }`
- **Example Payload:** `{ "query": "pneumonia treatment 2025", "limit": 3 }`

```ts
@Tool({
  name: 'search_pubmed',
  description: 'Search PubMed for medical literature based on a clinical query',
  inputSchema: z.object({ query: z.string(), limit: z.number().optional() })
})
async searchPubMed(input, ctx) {
  return { articles: [] };
}
```

### `summarizeResearch` (Research Module)
- **Description:** Summarize medical article abstracts or research snippets.
- **Input:** `{ text: string }
- **Output:** `{ summary: string }`
- **Example Payload:** `{ "text": "Abstract content..." }`

```ts
@Tool({
  name: 'summarize_research',
  description: 'Summarize medical literature abstracts or research snippets',
  inputSchema: z.object({ text: z.string() })
})
async summarizeResearch(input, ctx) {
  return { summary: '...' };
}
```

### `identifyMissingInfo` (Gap Analysis Module)
- **Description:** Determine missing patient information based on symptoms and history.
- **Input:** `{ symptoms: string[], history: string[], medications: string[] }
- **Output:** `{ missing: string[] }`
- **Example Payload:** `{ "symptoms": ["chest pain"], "history": ["hypertension"], "medications": ["Lisinopril"] }`

```ts
@Tool({
  name: 'identify_missing_info',
  description: 'Identify missing clinical information or follow-up questions',
  inputSchema: z.object({
    symptoms: z.array(z.string()),
    history: z.array(z.string()),
    medications: z.array(z.string())
  })
})
async identifyMissingInfo(input, ctx) {
  return { missing: ['Smoking history', 'Recent travel'] };
}
```

### `generateClinicalSummary` (Report Module)
- **Description:** Compile a clinician-ready summary from aggregated findings.
- **Input:** `{ findings: any }
- **Output:** `{ report: string }`
- **Example Payload:** `{ "findings": { ... } }`

```ts
@Tool({
  name: 'generate_clinical_summary',
  description: 'Compile a final clinical briefing from all collected agent outputs',
  inputSchema: z.object({ findings: z.any() })
})
async generateClinicalSummary(input, ctx) {
  return { report: '...' };
}
```

## Error Cases

- Invalid input shapes should return validation errors from Zod.
- Missing patient data should return empty arrays with a `notes` message.
- External API failures should return a safe fallback value and a useful error note.
