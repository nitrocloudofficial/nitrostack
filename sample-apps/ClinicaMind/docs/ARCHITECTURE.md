# ARCHITECTURE.md

**Purpose:** Describes the overall ClinicaMind system design and how NitroStack modules and agents interact.

## System Diagram (Conceptual)

```
[Patient/Doctor Conversation]
        ↓ Speech-to-Text
      [Supervisor Agent]
        ↓ calls
 ┌───────┴───────┬────────┬────────┐
 ↓ History Agent ↓ Medication Agent ↓ Research Agent
 (retrieves past   (checks current     (fetches latest
 diagnoses, labs)   meds/allergies)     literature)
        ↓                ↓                ↓
 └────────┴────────┴────────┘
        ↓
 [Gap Analysis Agent] (identifies missing questions/data)
        ↓
 [Report Generator Agent] (assembles findings into a summary)
        ↓
 [Frontend Canvas] (visualizes agent outputs)
```

*(Figure: Multi-agent workflow. Each box is a NitroStack module or UI component.)*

## NitroStack Modules

ClinicaMind uses a modular NitroStack architecture. Each agent lives in its own module:

- **SupervisorModule**: Orchestrates the workflow and decides which tools to invoke based on transcript context.
- **HistoryModule**: Retrieves past records, allergies, conditions, and medications from mock or EHR-like data.
- **MedicationModule**: Checks drug interactions and allergy conflicts, using OpenFDA or static fallback data.
- **ResearchModule**: Queries medical literature through PubMed E-utilities and summarizes key findings.
- **GapAnalysisModule**: Identifies missing clinical details and follow-up questions.
- **ReportModule**: Compiles all agent outputs into a final clinician-friendly briefing.

Each module uses NitroStack decorators such as `@Tool` and `@Resource` to define tool entry points and validation.

## Data Flow

1. **Input**: The browser captures speech and converts it to text using Web Speech API or a backend STT service.
2. **Supervisor Agent**: Receives transcript text and uses an LLM to plan the next actions.
3. **Tool Calls**: Supervisor invokes NitroStack tools like `getPatientHistory`, `checkDrugInteractions`, or `searchPubMed`.
4. **Agent Responses**: Each module returns structured results, such as conditions, warnings, or article summaries.
5. **Report Generation**: The Report Agent merges findings and creates a summary.
6. **Frontend Update**: The UI canvas receives node/edge data and renders the clinical briefing visually.

NitroStack’s MCP framework enables multi-step reasoning and tool chaining, where LLM prompts can include tool outputs to shape later decisions.

## MCP Role

NitroStack’s Model Context Protocol (MCP) is the glue for ClinicaMind:

- Tools are declared with `@Tool` and accept JSON input.
- Input validation is enforced with Zod schemas.
- Agents can trigger other modules by calling named tools and processing the structured results.
- The framework supports an orchestrated workflow where the Supervisor acts as a planner.

Example tool definition:

```ts
@Tool({
  name: 'get_patient_history',
  description: 'Retrieve prior diagnoses, medications, and allergies for a patient',
  inputSchema: z.object({ patientId: z.string().describe('EHR patient ID') })
})
async getPatientHistory(input, ctx) {
  return { conditions: [...], allergies: [...], medications: [...] };
}
```

## Agents Interactions

The Supervisor Agent acts as the central planner. It evaluates the conversation context and invokes other agents by referencing their tools.

- The **Supervisor** decides whether to call **History**, **Medication**, **Research**, or **Gap Analysis**.
- Each agent returns structured results to the Supervisor or Report Generator.
- The **Report Generator** synthesizes a clinical briefing for the UI.

## Example Workflow

- **Supervisor Prompt:**
  "Patient reports chest pain and dizziness. What tools should be called?"
- **Tool Invocations**:
  - `getPatientHistory({ patientId: '1234' })`
  - `checkDrugInteractions({ drugs: ['Warfarin', 'Ibuprofen'] })`
  - `searchPubMed({ query: 'chest pain pneumonia guidelines', limit: 3 })`
- **Result Integration**: The Supervisor merges findings and requests a summary from `generateClinicalSummary`.

This modular, decorator-driven architecture aligns with NitroStack best practices and supports ClinicaMind’s multi-agent vision.
