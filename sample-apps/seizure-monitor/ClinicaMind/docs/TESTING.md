# TESTING.md

**Purpose:** Outline ClinicaMind’s testing strategy, including unit tests, integration tests, and demo validation.

## Unit Tests

Use Jest with TypeScript to test each NitroStack tool.

### Example Test for `checkDrugInteractions`

```ts
import { checkDrugInteractions } from '../src/modules/medication/medication.tools';

test('checks a known bleeding interaction', async () => {
  const result = await checkDrugInteractions({ drugs: ['Warfarin', 'Ibuprofen'] }, {} as any);
  expect(result.interactions).toContain('Warfarin + Ibuprofen may increase bleeding risk');
});
```

### Example Test for `getPatientHistory`

```ts
import { getPatientHistory } from '../src/modules/history/history.tools';

test('returns patient history for a valid ID', async () => {
  const result = await getPatientHistory({ patientId: '1234' }, {} as any);
  expect(result.conditions).toEqual(expect.arrayContaining(['hypertension']));
});
```

## Integration Tests

Simulate a full agentic workflow by invoking the Supervisor and verifying the final summary.

### Example Pseudocode

```ts
const transcript = 'I have chest pain and cough.';
const plan = await supervisor.analyzeConversation({ transcript }, ctx);
expect(plan.actions).toContainEqual(expect.objectContaining({ tool: 'get_patient_history' }));
```

Mock external API responses for PubMed/OpenFDA so tests are deterministic.

## Demo Scripts

Define fixed test cases and expected outcomes:

1. **Mild Cold**
   - Transcript: "Headache and runny nose."
   - Assert: `searchPubMed` is called with `common cold symptomatic treatment`.
   - Assert: Final report mentions "routine" and "rest".

2. **Drug Interaction**
   - Transcript: "I’m on warfarin and taking ibuprofen."
   - Assert: `checkDrugInteractions` returns a bleeding risk.
   - Assert: Summary contains "bleeding risk".

3. **Complex Pneumonia Case**
   - Transcript: "Chest pain for two days; I’m diabetic and allergic to penicillin."
   - Assert: Gap analysis suggests `Smoking history`.
   - Assert: Summary mentions pneumonia risk.

### Example Test Plan Pseudocode

```ts
const transcript = 'Doctor gave me ibuprofen; I take warfarin.';
const medicationResult = await checkDrugInteractions({ drugs: ['Ibuprofen', 'Warfarin'] });
expect(medicationResult.interactions[0]).toMatch(/bleeding risk/i);
```

## Mock Data

Use fixed patient IDs and transcripts in test fixtures.

## Automation

Run tests with:

```bash
npm test
```

Optionally add GitHub Actions to run Jest on every push.

This testing guide ensures ClinicaMind’s tools and workflows are verifiable with repeatable cases.
