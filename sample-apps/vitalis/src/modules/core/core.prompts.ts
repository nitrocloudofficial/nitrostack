/**
 * CorePrompts — Prompt templates for Vitalis MCP gateway.
 * Exposes clinical_handoff_prompt, patient_education_prompt, research_critique_prompt,
 * discharge_summary_prompt, and medication_counseling_prompt.
 */
import { PromptDecorator as Prompt, Injectable, ControllerDecorator as Controller } from '@nitrostack/core';

@Controller('core')
@Injectable()
export class CorePrompts {
  @Prompt({
    name: 'clinical_handoff_prompt',
    description: 'Generates an SBAR clinical handoff instruction template for the LLM.',
    arguments: [
      {
        name: 'patient_summary_json',
        description: 'JSON string of FHIR patient summary bundle',
        required: true,
      },
    ],
  })
  async clinicalHandoffPrompt(input: any) {
    return [
      {
        role: 'user',
        content:
          `You are a clinical care coordinator. Review the following FHIR patient summary bundle:\n\n` +
          `\`\`\`json\n${input.patient_summary_json}\n\`\`\`\n\n` +
          `Generate a structured SBAR (Situation, Background, Assessment, Recommendation) clinical handoff report. ` +
          `Emphasize active problems, drug reconciliation risks, and immediate follow-up recommendations.`,
      },
    ];
  }

  @Prompt({
    name: 'patient_education_prompt',
    description: 'Generates a patient-friendly condition explanation prompt avoiding diagnostic overreach.',
    arguments: [
      {
        name: 'condition',
        description: 'Medical condition name',
        required: true,
      },
      {
        name: 'reading_level',
        description: 'Target reading level (e.g. grade6)',
        required: false,
      },
    ],
  })
  async patientEducationPrompt(input: any) {
    return [
      {
        role: 'user',
        content:
          `Explain the medical condition "${input.condition}" for a patient at a ${input.reading_level ?? 'grade6'} reading level.\n` +
          `Rules:\n` +
          `1. Use simple, clear language without medical jargon.\n` +
          `2. Do NOT diagnose the user or say "you have this condition".\n` +
          `3. Cover: What it is, common symptoms, general management steps, and when to seek emergency care.\n` +
          `4. Include a reminder to discuss personal health questions with a doctor.`,
      },
    ];
  }

  @Prompt({
    name: 'research_critique_prompt',
    description: 'PICO-structured critical appraisal prompt for analyzing a study abstract.',
    arguments: [
      {
        name: 'abstract',
        description: 'PubMed article abstract text',
        required: true,
      },
    ],
  })
  async researchCritiquePrompt(input: any) {
    return [
      {
        role: 'user',
        content:
          `Perform a PICO critical appraisal of the following PubMed article abstract:\n\n` +
          `"${input.abstract}"\n\n` +
          `Break down your analysis into:\n` +
          `- **P (Population/Problem):** Who was studied?\n` +
          `- **I (Intervention):** What was tested?\n` +
          `- **C (Comparison):** What was the control group?\n` +
          `- **O (Outcome):** What were the key findings?\n` +
          `- **Clinical Relevance & Limitations:** Is this study applicable to clinical practice?`,
      },
    ];
  }

  @Prompt({
    name: 'discharge_summary_prompt',
    description: 'Generates a hospital discharge summary & patient home-care instruction guide.',
    arguments: [
      {
        name: 'patient_name',
        description: 'Patient full name',
        required: true,
      },
      {
        name: 'discharge_diagnosis',
        description: 'Primary discharge diagnosis',
        required: true,
      },
      {
        name: 'medications_json',
        description: 'JSON list of discharge medications',
        required: false,
      },
    ],
  })
  async dischargeSummaryPrompt(input: any) {
    return [
      {
        role: 'user',
        content:
          `Draft a clinical hospital discharge summary and patient home-care guide for patient "${input.patient_name}".\n` +
          `Primary Discharge Diagnosis: ${input.discharge_diagnosis}\n` +
          `Discharge Regimen: ${input.medications_json ?? 'See active medication list'}\n\n` +
          `Structure the summary into:\n` +
          `1. **Hospital Course & Primary Diagnosis**\n` +
          `2. **Discharge Medication Instructions** (dosage, frequency, purpose)\n` +
          `3. **Home Care & Activity Restrictions**\n` +
          `4. **Warning Signs & Red Flags** (when to call doctor or go to ER)\n` +
          `5. **Follow-Up Appointments & PCP Communication**`,
      },
    ];
  }

  @Prompt({
    name: 'medication_counseling_prompt',
    description: 'Generates a patient medication counseling guide covering usage, side effects, and FDA warnings.',
    arguments: [
      {
        name: 'drug_name',
        description: 'Generic or brand drug name',
        required: true,
      },
      {
        name: 'label_info_json',
        description: 'FDA label JSON snippet (boxed warnings, contraindications, interactions)',
        required: false,
      },
    ],
  })
  async medicationCounselingPrompt(input: any) {
    return [
      {
        role: 'user',
        content:
          `Prepare a comprehensive patient medication counseling guide for "${input.drug_name}".\n` +
          (input.label_info_json ? `Official FDA Label Data:\n\`\`\`json\n${input.label_info_json}\n\`\`\`\n\n` : '') +
          `Cover the following in patient-friendly terms (Grade 6 reading level):\n` +
          `- **What this medication is for**\n` +
          `- **How and when to take it** (e.g. with food, time of day)\n` +
          `- **Important FDA Boxed Warnings & Contraindications**\n` +
          `- **Common side effects vs Serious side effects requiring immediate medical attention**\n` +
          `- **What to avoid** (alcohol, specific OTC drugs, food interactions)\n` +
          `- **What to do if a dose is missed**`,
      },
    ];
  }
}
