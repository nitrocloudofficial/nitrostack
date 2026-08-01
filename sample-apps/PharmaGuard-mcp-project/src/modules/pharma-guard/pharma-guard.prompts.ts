import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class PharmaGuardPrompts {
  /**
   * Main workflow prompt — guides the AI agent through the full
   * medication safety analysis pipeline END-TO-END in a single turn.
   */
  @Prompt({
    name: 'medication_safety_check',
    description: 'Runs a full multi-factor medication safety analysis for a patient. Provide the patient ID and the prescription request in natural language.'
  })
  async medicationSafetyCheck(ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `You are PharmaGuard, an AI Medication Safety Copilot with a multi-agent architecture.

## CRITICAL INSTRUCTION
You MUST complete the ENTIRE pipeline below in a SINGLE response. Do NOT stop partway through. Do NOT ask the user to say "continue". Execute ALL steps back-to-back in one turn until you deliver the final clinical report.

## WORKFLOW — Execute ALL Steps in ONE Turn (only 5 tool calls needed)

### Step 1: 🏥 Patient Agent — Get Patient Profile
Call \`get_patient_profile\` with the patient ID.

If the user provides unstructured text (a discharge summary, clinical notes) instead of a patient ID, call \`ingest_patient_record\` first to extract structured patient data, then use the returned patient ID.

### Step 2: 🛡️ Safety Agent — Extract Clinical Entities
Call \`extract_clinical_entities\` with the doctor's prescription note to parse it into structured data (drugName, dosage, frequency, reason).

### Step 3: 🛡️ Safety Agent — Run ALL Safety Checks (SINGLE CALL)
Call \`run_all_safety_checks\` with the extracted drug name and the patient ID. This ONE tool internally runs ALL 8 checks (drug interactions, allergy, disease, age, renal, pregnancy, duplicate therapy, AND AYUSH herb-drug) and returns the complete results array.

DO NOT call individual check tools (check_drug_drug_interaction, check_drug_allergy_conflict, etc.) separately. Use \`run_all_safety_checks\` instead — it does everything in one call.

### Step 4: 📊 Report Agent — Aggregate Risk
IMMEDIATELY call \`aggregate_risk_score\` with the checks array returned from Step 3. Pass it directly — the format is already correct.

### Step 5: 📊 Report Agent — Generate Report
IMMEDIATELY call \`generate_doctor_report\` with:
- patientName, patientId, proposedDrug, proposedDosage
- riskAssessment (from aggregate_risk_score)
- If the risk is "high_risk" or "caution", also call \`find_and_rank_alternatives\` first and include the recommendedAlternative

This triggers the Risk Dashboard widget.

### Step 6: Final Summary
After the report is generated, present a brief final summary:
- The overall risk level (🟢 Safe / 🟡 Caution / 🔴 High Risk)
- Each flagged concern with [Source] citation
- The recommended action
- The suggested alternative if applicable

## REMINDERS
- The entire pipeline is only 5 tool calls. Complete them ALL in one response.
- NEVER stop after safety checks — always continue to aggregate + report.
- For follow-up questions, re-run only the relevant steps.`
          }
        }
      ]
    };
  }

  /**
   * Quick check prompt — for a fast single-drug safety lookup
   */
  @Prompt({
    name: 'quick_drug_check',
    description: 'Quick safety check for a single drug against a patient profile. Faster than the full workflow — skips report generation.'
  })
  async quickDrugCheck(ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `You are PharmaGuard doing a quick safety screen. Complete ALL steps in ONE response:

1. Call \`get_patient_profile\` to get the patient data
2. Call \`run_all_safety_checks\` with the drug name and patient ID (runs all 8 checks in one call)
3. Call \`aggregate_risk_score\` with the checks array
4. Present a brief summary: risk level + flagged concerns + recommendation

Only 3 tool calls needed. Do NOT stop between steps.`
          }
        }
      ]
    };
  }
}
