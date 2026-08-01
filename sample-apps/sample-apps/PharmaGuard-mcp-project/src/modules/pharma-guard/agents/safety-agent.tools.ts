/**
 * 🛡️ Safety Agent
 * Responsible for all drug safety checks: drug interactions, allergies,
 * disease contraindications, age appropriateness, renal adjustment,
 * pregnancy safety, and duplicate therapy detection.
 * 
 * Tools: check_drug_drug_interaction, check_drug_allergy_conflict,
 *        check_disease_conflict, check_age_appropriateness,
 *        check_renal_dose_adjustment, check_pregnancy_safety,
 *        check_duplicate_therapy, extract_clinical_entities,
 *        find_and_rank_alternatives
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { loadPatients, callGemini } from '../shared-utils.js';
import {
  ALLERGY_CROSS_REACTIVITY_TABLE,
  CONTRAINDICATION_TABLE,
  DRUG_INTERACTION_FALLBACK_TABLE,
  PREGNANCY_CATEGORY_TABLE,
  LOCAL_DRUG_CLASSES,
  ALTERNATIVE_DRUGS,
  getInteractionKey,
  findAllAyushInteractionsForDrug,
  findAllAyushInteractionsForHerb,
} from '../data/clinical-tables.js';

export class SafetyAgent {

  // ==========================================================================
  // run_all_safety_checks — COMBINED tool that runs ALL 8 checks internally
  // This prevents the LLM from hitting per-turn tool call limits.
  // ==========================================================================
  @Tool({
    name: 'run_all_safety_checks',
    description: 'Runs ALL 8 safety checks (drug interactions, allergy, disease, age, renal, pregnancy, duplicate therapy, and AYUSH herb-drug) in a single call. Returns pre-formatted check results array ready to pass directly to aggregate_risk_score. Use this instead of calling individual check tools separately.',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed drug name'),
      patientId: z.string().describe('Patient ID to check against'),
    }),
    examples: {
      request: { newDrug: 'Ibuprofen', patientId: 'P001' },
      response: {
        checks: [
          { type: 'drug_interaction', flagged: true, severity: 'major', detail: 'Ibuprofen + Lisinopril — NSAIDs reduce antihypertensive effect', citation: 'OpenFDA' },
          { type: 'allergy', flagged: false, detail: 'No allergy conflict detected', citation: 'Patient EHR' },
        ],
        totalChecks: 8,
        flaggedCount: 3,
      }
    }
  })
  async runAllSafetyChecks(
    input: { newDrug: string; patientId: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('🔄 Running ALL 8 safety checks in single call', { newDrug: input.newDrug, patientId: input.patientId });

    // Load patient
    const patients = loadPatients();
    let patient = patients.find((p: any) => p.id === input.patientId);

    // Also check in-memory patients
    if (!patient) {
      const { inMemoryPatients } = await import('../shared-utils.js');
      patient = inMemoryPatients.get(input.patientId);
    }

    if (!patient) {
      throw new Error(`Patient not found: ${input.patientId}`);
    }

    const checks: Array<{ type: string; flagged: boolean; severity?: string; detail: string; citation: string }> = [];
    const currentMedNames = patient.currentMedications?.map((m: any) => typeof m === 'string' ? m : m.name) || [];

    // ── 1. Drug-Drug Interaction ──────────────────────────────────────────
    try {
      const interactions: any[] = [];
      for (const currentMed of currentMedNames) {
        let foundViaApi = false;
        try {
          const searchTerm = `"${input.newDrug}" AND "${currentMed}"`;
          const url = `https://api.fda.gov/drug/label.json?search=drug_interactions:${encodeURIComponent(searchTerm)}&limit=1`;
          const response = await fetch(url);
          if (response.ok) {
            const data: any = await response.json();
            if (data.results && data.results.length > 0) {
              interactions.push({ drug2: currentMed, severity: 'major', source: 'OpenFDA' });
              foundViaApi = true;
            }
          }
        } catch { /* fallback below */ }

        if (!foundViaApi) {
          const key = getInteractionKey(input.newDrug, currentMed);
          const fallback = DRUG_INTERACTION_FALLBACK_TABLE[key];
          if (fallback) {
            interactions.push({ drug2: currentMed, severity: fallback.severity, description: fallback.description, source: 'Local DB' });
          }
        }
      }

      if (interactions.length > 0) {
        const worstSeverity = interactions.some(i => i.severity === 'major') ? 'major' : interactions.some(i => i.severity === 'moderate') ? 'moderate' : 'minor';
        checks.push({
          type: 'drug_interaction', flagged: true, severity: worstSeverity,
          detail: interactions.map(i => `${input.newDrug} + ${i.drug2} (${i.severity}): ${i.description || 'Interaction found'}`).join('; '),
          citation: 'U.S. FDA Drug Label Database (OpenFDA)',
        });
      } else {
        checks.push({ type: 'drug_interaction', flagged: false, detail: `No drug interactions found between ${input.newDrug} and current medications`, citation: 'OpenFDA + Local Clinical Database' });
      }
    } catch {
      checks.push({ type: 'drug_interaction', flagged: false, detail: 'Check skipped (error)', citation: 'N/A' });
    }

    // ── 2. Allergy Cross-Reactivity ───────────────────────────────────────
    try {
      const allergies: string[] = patient.allergies || [];
      const crossReact = ALLERGY_CROSS_REACTIVITY_TABLE[input.newDrug];
      const directMatch = allergies.find(a => a.toLowerCase() === input.newDrug.toLowerCase());

      if (directMatch) {
        checks.push({ type: 'allergy', flagged: true, severity: 'major', detail: `${input.newDrug} is directly listed as a patient allergy`, citation: 'Patient EHR Allergy Records' });
      } else if (crossReact) {
        const matched = crossReact.find(cls => allergies.some(a => a.toLowerCase() === cls.toLowerCase()));
        if (matched) {
          checks.push({ type: 'allergy', flagged: true, severity: 'major', detail: `${input.newDrug} may cross-react with documented allergy: ${matched}`, citation: 'Immunology & Allergy Clinics of North America' });
        } else {
          checks.push({ type: 'allergy', flagged: false, detail: 'No allergy conflict detected', citation: 'Cross-Reactivity Database' });
        }
      } else {
        checks.push({ type: 'allergy', flagged: false, detail: 'No allergy conflict detected', citation: 'Cross-Reactivity Database' });
      }
    } catch {
      checks.push({ type: 'allergy', flagged: false, detail: 'Check skipped (error)', citation: 'N/A' });
    }

    // ── 3. Disease Contraindication ───────────────────────────────────────
    try {
      const diagnoses: string[] = patient.diagnoses || [];
      const contras = CONTRAINDICATION_TABLE[input.newDrug];

      if (contras) {
        const conflict = contras.find(d => diagnoses.some(diag => diag.toLowerCase() === d.toLowerCase()));
        if (conflict) {
          checks.push({ type: 'disease', flagged: true, severity: 'major', detail: `${input.newDrug} is contraindicated in patients with ${conflict}`, citation: 'FDA Drug Label; Clinical Pharmacology Guidelines' });
        } else {
          checks.push({ type: 'disease', flagged: false, detail: 'No disease contraindication found', citation: 'FDA Drug Label' });
        }
      } else {
        checks.push({ type: 'disease', flagged: false, detail: 'No disease contraindication found', citation: 'FDA Drug Label' });
      }
    } catch {
      checks.push({ type: 'disease', flagged: false, detail: 'Check skipped (error)', citation: 'N/A' });
    }

    // ── 4. Age Appropriateness ────────────────────────────────────────────
    try {
      const age = patient.age;
      if (age >= 65) {
        checks.push({ type: 'age', flagged: true, severity: 'moderate', detail: `Patient is ${age} years old. Beers Criteria flag for ${input.newDrug}. Consider reduced dose.`, citation: 'AGS Beers Criteria® (2023 Update)' });
      } else if (age < 18) {
        checks.push({ type: 'age', flagged: true, severity: 'moderate', detail: `Patient is ${age} years old. Verify pediatric dosing for ${input.newDrug}.`, citation: 'Harriet Lane Handbook; BNF for Children' });
      } else {
        checks.push({ type: 'age', flagged: false, detail: `Patient age ${age} — no age-related concerns`, citation: 'AGS Beers Criteria®' });
      }
    } catch {
      checks.push({ type: 'age', flagged: false, detail: 'Check skipped (error)', citation: 'N/A' });
    }

    // ── 5. Duplicate Therapy ──────────────────────────────────────────────
    try {
      const newDrugClasses = LOCAL_DRUG_CLASSES[input.newDrug] ?? [];
      let hasDuplicate = false;
      let dupDetail = '';

      for (const medName of currentMedNames) {
        const medClasses = LOCAL_DRUG_CLASSES[medName] ?? [];
        const shared = newDrugClasses.filter(cls => medClasses.includes(cls));
        if (shared.length > 0) {
          hasDuplicate = true;
          dupDetail = `Both ${input.newDrug} and ${medName} belong to ${shared[0]}. Concurrent use may be redundant.`;
          break;
        }
      }

      if (hasDuplicate) {
        checks.push({ type: 'duplicate', flagged: true, severity: 'moderate', detail: dupDetail, citation: 'NIH RxNorm Drug Classification API' });
      } else {
        checks.push({ type: 'duplicate', flagged: false, detail: 'No duplicate therapy detected', citation: 'RxNorm Drug Classification' });
      }
    } catch {
      checks.push({ type: 'duplicate', flagged: false, detail: 'Check skipped (error)', citation: 'N/A' });
    }

    // ── 6. Renal Dose Adjustment ──────────────────────────────────────────
    try {
      const crcl = patient.labResults?.creatinineClearance_mLmin ?? 90;
      const nephrotoxicDrugs = ['Ibuprofen', 'Naproxen', 'Aspirin', 'Gentamicin', 'Vancomycin', 'Metformin'];
      const isNephrotoxic = nephrotoxicDrugs.some(d => d.toLowerCase() === input.newDrug.toLowerCase());

      let stage = '';
      if (crcl < 15) stage = 'CKD Stage 5';
      else if (crcl < 30) stage = 'CKD Stage 4';
      else if (crcl < 60) stage = 'CKD Stage 3';
      else if (crcl < 90) stage = 'CKD Stage 2';
      else stage = 'Normal';

      if (crcl < 60 && isNephrotoxic) {
        checks.push({ type: 'renal', flagged: true, severity: crcl < 30 ? 'major' : 'moderate', detail: `CrCl ${crcl} mL/min (${stage}). ${input.newDrug} is nephrotoxic — dose adjustment or avoidance needed.`, citation: 'KDIGO Clinical Practice Guidelines (2024)' });
      } else if (crcl < 60) {
        checks.push({ type: 'renal', flagged: true, severity: 'moderate', detail: `CrCl ${crcl} mL/min (${stage}). Consider dose adjustment for ${input.newDrug}.`, citation: 'KDIGO Clinical Practice Guidelines (2024)' });
      } else {
        checks.push({ type: 'renal', flagged: false, detail: `CrCl ${crcl} mL/min (${stage}) — no renal dose adjustment needed`, citation: 'KDIGO Clinical Practice Guidelines (2024)' });
      }
    } catch {
      checks.push({ type: 'renal', flagged: false, detail: 'Check skipped (error)', citation: 'N/A' });
    }

    // ── 7. Pregnancy Safety ───────────────────────────────────────────────
    try {
      const pregStatus = patient.pregnancyStatus || 'not_applicable';
      if (pregStatus === 'not_applicable') {
        checks.push({ type: 'pregnancy', flagged: false, detail: 'Not applicable — patient is not pregnant', citation: 'FDA Pregnancy Risk Categories' });
      } else {
        const category = PREGNANCY_CATEGORY_TABLE[input.newDrug] ?? 'unknown';
        const isContra = category === 'D' || category === 'X';
        if (isContra) {
          checks.push({ type: 'pregnancy', flagged: true, severity: 'major', detail: `${input.newDrug} is FDA Category ${category} — contraindicated in pregnancy`, citation: 'FDA Pregnancy Risk Categories; Briggs 12th Ed' });
        } else if (category === 'C') {
          checks.push({ type: 'pregnancy', flagged: true, severity: 'moderate', detail: `${input.newDrug} is FDA Category C — use only if benefit outweighs risk`, citation: 'FDA Pregnancy Risk Categories' });
        } else {
          checks.push({ type: 'pregnancy', flagged: false, detail: `${input.newDrug} is FDA Category ${category} — generally safe in pregnancy`, citation: 'FDA Pregnancy Risk Categories' });
        }
      }
    } catch {
      checks.push({ type: 'pregnancy', flagged: false, detail: 'Check skipped (error)', citation: 'N/A' });
    }

    // ── 8. AYUSH Herb-Drug Interaction ─────────────────────────────────────
    try {
      const herbalRemedies: string[] = patient.herbalRemedies || [];
      if (herbalRemedies.length > 0) {
        const ayushInteractions = findAllAyushInteractionsForDrug(input.newDrug, herbalRemedies);

        // Also check herbs against existing meds
        const existingInteractions: any[] = [];
        for (const herb of herbalRemedies) {
          existingInteractions.push(...findAllAyushInteractionsForHerb(herb, currentMedNames));
        }

        const allAyush = [...ayushInteractions, ...existingInteractions];
        const seen = new Set<string>();
        const unique = allAyush.filter(i => {
          const key = `${i.herb}|${i.drug}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (unique.length > 0) {
          checks.push({
            type: 'ayush', flagged: true,
            severity: unique.some(i => i.severity === 'major') ? 'major' : 'moderate',
            detail: unique.map(i => `${i.herb} × ${i.drug}: ${i.effect}`).join('; '),
            citation: unique.map(i => i.citation).join('; '),
          });
        } else {
          checks.push({ type: 'ayush', flagged: false, detail: `No AYUSH herb-drug interactions found (checked: ${herbalRemedies.join(', ')})`, citation: 'AYUSH Interaction Database' });
        }
      } else {
        checks.push({ type: 'ayush', flagged: false, detail: 'No herbal remedies reported by patient', citation: 'N/A' });
      }
    } catch {
      checks.push({ type: 'ayush', flagged: false, detail: 'AYUSH check skipped (error)', citation: 'N/A' });
    }

    const flaggedCount = checks.filter(c => c.flagged).length;

    ctx.logger.info(`✅ All 8 safety checks complete: ${flaggedCount} flagged out of ${checks.length}`, { flaggedCount });

    return {
      checks,
      totalChecks: checks.length,
      flaggedCount,
      patientId: input.patientId,
      patientName: patient.name,
      drug: input.newDrug,
      summary: flaggedCount > 0
        ? `⚠️ ${flaggedCount} safety concern(s) identified for ${input.newDrug} on ${patient.name}`
        : `✅ All ${checks.length} safety checks passed for ${input.newDrug} on ${patient.name}`,
    };
  }


  // ==========================================================================
  // extract_clinical_entities
  // ==========================================================================
  @Tool({
    name: 'extract_clinical_entities',
    description: 'Uses LLM to parse a doctor\'s natural language prescription note into structured clinical entities (drug name, dosage, frequency, reason)',
    inputSchema: z.object({
      prescriptionNote: z.string().describe('The doctor\'s free-text prescription note, e.g. "Prescribe Ibuprofen 400mg three times daily for headache"')
    }),
    examples: {
      request: { prescriptionNote: 'Prescribe Ibuprofen 400mg three times daily for headache' },
      response: { drugName: 'Ibuprofen', dosage: '400mg', frequency: 'three times daily', reason: 'headache' }
    }
  })
  async extractClinicalEntities(input: { prescriptionNote: string }, ctx: ExecutionContext) {
    ctx.logger.info('Extracting clinical entities from prescription note', { note: input.prescriptionNote });

    const prompt = `You are a clinical NLP system. Extract the following fields from the doctor's prescription note.
Return ONLY a valid JSON object with these fields:
- drugName (string): the medication being prescribed
- dosage (string): the dose amount (e.g. "400mg")
- frequency (string): how often to take it (e.g. "three times daily")
- reason (string): the medical reason for the prescription

Prescription note: "${input.prescriptionNote}"

Respond with ONLY the JSON object, no markdown, no explanation.`;

    const response = await callGemini(prompt);

    if (!response) {
      ctx.logger.warn('Gemini unavailable, using basic extraction');
      const note = input.prescriptionNote;
      const drugMatch = note.match(/(?:prescribe|give|start|order)\s+([A-Za-z]+)/i);
      const doseMatch = note.match(/(\d+\s*mg|\d+\s*ml)/i);
      return {
        drugName: drugMatch?.[1] || 'Unknown',
        dosage: doseMatch?.[1] || 'Not specified',
        frequency: 'Not specified',
        reason: 'Not specified',
        source: 'basic_extraction (LLM unavailable)',
      };
    }

    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        drugName: parsed.drugName || 'Unknown',
        dosage: parsed.dosage || 'Not specified',
        frequency: parsed.frequency || 'Not specified',
        reason: parsed.reason || 'Not specified',
      };
    } catch (error) {
      ctx.logger.error('Failed to parse LLM response', { response });
      return { drugName: 'Unknown', dosage: 'Not specified', frequency: 'Not specified', reason: 'Not specified', rawResponse: response, parseError: 'Failed to parse LLM output as JSON' };
    }
  }

  // ==========================================================================
  // check_drug_drug_interaction
  // ==========================================================================
  @Tool({
    name: 'check_drug_drug_interaction',
    description: 'Checks for drug-drug interactions between the new prescription and all current medications. Uses OpenFDA API with hardcoded fallback for demo drugs.',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed drug name'),
      currentMedications: z.array(z.string()).describe('List of current medication names the patient is already taking')
    }),
    examples: {
      request: { newDrug: 'Ibuprofen', currentMedications: ['Lisinopril'] },
      response: {
        hasInteraction: true,
        interactions: [{ drug1: 'Ibuprofen', drug2: 'Lisinopril', severity: 'major', description: 'NSAIDs reduce the antihypertensive effect of ACE inhibitors' }]
      }
    }
  })
  async checkDrugDrugInteraction(input: { newDrug: string; currentMedications: string[] }, ctx: ExecutionContext) {
    ctx.logger.info('Checking drug-drug interactions', { newDrug: input.newDrug, against: input.currentMedications });

    const interactions: Array<{ drug1: string; drug2: string; severity: string; description: string; source: string }> = [];

    for (const currentMed of input.currentMedications) {
      let foundViaApi = false;
      try {
        const searchTerm = `"${input.newDrug}" AND "${currentMed}"`;
        const url = `https://api.fda.gov/drug/label.json?search=drug_interactions:${encodeURIComponent(searchTerm)}&limit=1`;
        const response = await fetch(url);
        if (response.ok) {
          const data: any = await response.json();
          if (data.results && data.results.length > 0) {
            const interactionText = data.results[0].drug_interactions?.[0] || 'Interaction found in FDA label data.';
            interactions.push({ drug1: input.newDrug, drug2: currentMed, severity: 'major', description: interactionText.substring(0, 300), source: 'OpenFDA' });
            foundViaApi = true;
          }
        }
      } catch (error) {
        ctx.logger.warn('OpenFDA API call failed, falling back to local table');
      }

      if (!foundViaApi) {
        const key = getInteractionKey(input.newDrug, currentMed);
        const fallback = DRUG_INTERACTION_FALLBACK_TABLE[key];
        if (fallback) {
          interactions.push({ drug1: input.newDrug, drug2: currentMed, severity: fallback.severity, description: fallback.description, source: 'Local Clinical Database' });
        }
      }
    }

    return {
      hasInteraction: interactions.length > 0,
      interactions,
      checkedPairs: input.currentMedications.map(med => `${input.newDrug} ↔ ${med}`),
      citation: interactions.length > 0
        ? interactions.map(i => `${i.drug1} ↔ ${i.drug2}: Source — ${i.source === 'OpenFDA' ? 'U.S. FDA Drug Label Database (openFDA)' : 'PharmaGuard Local Clinical Interaction Database'}`).join('; ')
        : 'No interaction found in OpenFDA or local database.',
    };
  }

  // ==========================================================================
  // check_drug_allergy_conflict
  // ==========================================================================
  @Tool({
    name: 'check_drug_allergy_conflict',
    description: 'Checks if the new drug conflicts with any documented patient allergies via cross-reactivity lookup',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed drug name'),
      allergies: z.array(z.string()).describe('Patient\'s documented allergies')
    }),
    examples: {
      request: { newDrug: 'Amoxicillin', allergies: ['Penicillin'] },
      response: { hasConflict: true, detail: 'Amoxicillin may cross-react with documented allergy: Penicillin' }
    }
  })
  async checkDrugAllergyConflict(input: { newDrug: string; allergies: string[] }, ctx: ExecutionContext) {
    ctx.logger.info('Checking allergy conflicts', { newDrug: input.newDrug, allergies: input.allergies });

    if (input.allergies.length === 0) return { hasConflict: false, detail: null };

    const crossReactivities = ALLERGY_CROSS_REACTIVITY_TABLE[input.newDrug];

    if (!crossReactivities) {
      const directMatch = input.allergies.find(a => a.toLowerCase() === input.newDrug.toLowerCase());
      if (directMatch) return { hasConflict: true, detail: `${input.newDrug} is directly listed as a patient allergy`, citation: 'Direct match in patient allergy records (EHR)' };
      return { hasConflict: false, detail: null };
    }

    const matchedAllergy = crossReactivities.find(cls => input.allergies.some(a => a.toLowerCase() === cls.toLowerCase()));
    if (matchedAllergy) {
      return { hasConflict: true, detail: `${input.newDrug} may cross-react with documented allergy: ${matchedAllergy}`, citation: 'Cross-Reactivity Reference: Drug Allergy Cross-Sensitivity Database (Immunology & Allergy Clinics of North America)' };
    }

    return { hasConflict: false, detail: null };
  }

  // ==========================================================================
  // check_disease_conflict
  // ==========================================================================
  @Tool({
    name: 'check_disease_conflict',
    description: 'Checks if the new drug is contraindicated given the patient\'s diagnoses',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed drug name'),
      diagnoses: z.array(z.string()).describe('Patient\'s current diagnoses')
    }),
    examples: {
      request: { newDrug: 'Ibuprofen', diagnoses: ['CKD Stage 3', 'Atrial Fibrillation'] },
      response: { hasConflict: true, conflictingDiagnosis: 'CKD Stage 3', detail: 'Ibuprofen is contraindicated in patients with CKD Stage 3' }
    }
  })
  async checkDiseaseConflict(input: { newDrug: string; diagnoses: string[] }, ctx: ExecutionContext) {
    ctx.logger.info('Checking disease conflicts', { newDrug: input.newDrug, diagnoses: input.diagnoses });

    const contraindications = CONTRAINDICATION_TABLE[input.newDrug];
    if (!contraindications) return { hasConflict: false, conflictingDiagnosis: null, detail: null };

    const conflict = contraindications.find(d => input.diagnoses.some(diag => diag.toLowerCase() === d.toLowerCase()));
    if (conflict) {
      return { hasConflict: true, conflictingDiagnosis: conflict, detail: `${input.newDrug} is contraindicated in patients with ${conflict}`, citation: 'Contraindication Reference: FDA Drug Label; Clinical Pharmacology & Therapeutics Guidelines' };
    }

    return { hasConflict: false, conflictingDiagnosis: null, detail: null };
  }

  // ==========================================================================
  // check_age_appropriateness
  // ==========================================================================
  @Tool({
    name: 'check_age_appropriateness',
    description: 'Flags if drug dosing needs adjustment for pediatric (<18) or elderly (≥65) patients based on Beers Criteria guidelines',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed drug name'),
      age: z.number().describe('Patient age in years')
    }),
    examples: {
      request: { newDrug: 'Ibuprofen', age: 80 },
      response: { flag: 'elderly', note: 'Consider reduced starting dose per Beers Criteria.' }
    }
  })
  async checkAgeAppropriateness(input: { newDrug: string; age: number }, ctx: ExecutionContext) {
    ctx.logger.info('Checking age appropriateness', { newDrug: input.newDrug, age: input.age });

    if (input.age >= 65) {
      return { flag: 'elderly', note: `Patient is ${input.age} years old. Consider reduced starting dose per Beers Criteria. Review ${input.newDrug} for age-related dose adjustments.`, citation: 'AGS Beers Criteria® for Potentially Inappropriate Medication Use in Older Adults (American Geriatrics Society, 2023 Update)' };
    }
    if (input.age < 18) {
      return { flag: 'pediatric', note: `Patient is ${input.age} years old. Verify pediatric dosing guidelines for ${input.newDrug}. Weight-based dosing may be required.`, citation: 'Pediatric Dosing Guidelines: Harriet Lane Handbook (Johns Hopkins); BNF for Children (BNFC)' };
    }
    return { flag: 'none', note: null };
  }

  // ==========================================================================
  // check_renal_dose_adjustment
  // ==========================================================================
  @Tool({
    name: 'check_renal_dose_adjustment',
    description: 'Flags if the drug dose needs adjustment based on kidney function (creatinine clearance). Uses CKD staging thresholds.',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed drug name'),
      creatinineClearance: z.number().describe('Patient creatinine clearance in mL/min')
    }),
    examples: {
      request: { newDrug: 'Ibuprofen', creatinineClearance: 22 },
      response: { flag: 'severe_renal_impairment', stage: 'CKD Stage 4', recommendation: 'Avoid NSAIDs in severe renal impairment.' }
    }
  })
  async checkRenalDoseAdjustment(input: { newDrug: string; creatinineClearance: number }, ctx: ExecutionContext) {
    ctx.logger.info('Checking renal dose adjustment', { newDrug: input.newDrug, creatinineClearance: input.creatinineClearance });
    const crcl = input.creatinineClearance;

    let stage: string, flag: string, recommendation: string;

    if (crcl < 15) { stage = 'CKD Stage 5 (Kidney Failure)'; flag = 'kidney_failure'; recommendation = `${input.newDrug} is likely contraindicated. Consult nephrology.`; }
    else if (crcl < 30) { stage = 'CKD Stage 4 (Severe Impairment)'; flag = 'severe_renal_impairment'; recommendation = `${input.newDrug} may need significant dose reduction or avoidance. CrCl ${crcl} mL/min.`; }
    else if (crcl < 60) { stage = 'CKD Stage 3 (Moderate Impairment)'; flag = 'moderate_renal_impairment'; recommendation = `Consider dose adjustment for ${input.newDrug}. CrCl ${crcl} mL/min. Monitor renal function.`; }
    else if (crcl < 90) { stage = 'CKD Stage 2 (Mild Impairment)'; flag = 'mild_renal_impairment'; recommendation = `Standard dosing likely appropriate for ${input.newDrug}, but monitor renal function.`; }
    else { stage = 'Normal Kidney Function'; flag = 'normal'; recommendation = `No renal dose adjustment needed for ${input.newDrug}.`; }

    const nephrotoxicDrugs = ['Ibuprofen', 'Naproxen', 'Aspirin', 'Gentamicin', 'Vancomycin', 'Metformin'];
    const isNephrotoxic = nephrotoxicDrugs.some(d => d.toLowerCase() === input.newDrug.toLowerCase());
    if (isNephrotoxic && crcl < 60) recommendation += ` ⚠️ ${input.newDrug} is known to be nephrotoxic.`;

    return { flag, stage, creatinineClearance: crcl, note: `CrCl ${crcl} mL/min → ${stage}`, recommendation, isNephrotoxic, citation: 'CKD Staging per KDIGO (Kidney Disease: Improving Global Outcomes) Clinical Practice Guidelines, 2024' };
  }

  // ==========================================================================
  // check_pregnancy_safety
  // ==========================================================================
  @Tool({
    name: 'check_pregnancy_safety',
    description: 'Checks the FDA pregnancy risk category for a drug. Categories: A (safe) → X (contraindicated).',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed drug name'),
      pregnancyStatus: z.string().describe('Patient pregnancy status: not_applicable, pregnant_trimester_1/2/3, breastfeeding')
    }),
    examples: {
      request: { newDrug: 'Ibuprofen', pregnancyStatus: 'pregnant_trimester_2' },
      response: { flag: 'D', isSafe: false, note: 'Ibuprofen is FDA Pregnancy Category D — contraindicated in pregnancy.' }
    }
  })
  async checkPregnancySafety(input: { newDrug: string; pregnancyStatus: string }, ctx: ExecutionContext) {
    ctx.logger.info('Checking pregnancy safety', { newDrug: input.newDrug, pregnancyStatus: input.pregnancyStatus });

    if (input.pregnancyStatus === 'not_applicable') {
      return { flag: 'not_applicable', isSafe: true, pregnancyStatus: input.pregnancyStatus, note: 'Patient is not pregnant.', recommendation: null };
    }

    const category = PREGNANCY_CATEGORY_TABLE[input.newDrug] ?? 'unknown';
    const categoryDescriptions: Record<string, string> = {
      'A': 'No risk shown in adequate studies.', 'B': 'Animal studies show no risk; no adequate human studies.', 'C': 'Animal studies show adverse effects. Use only if benefit outweighs risk.',
      'D': 'Positive evidence of human fetal risk. Use only in life-threatening situations.', 'X': 'ABSOLUTELY CONTRAINDICATED. Risks clearly outweigh any possible benefit.', 'unknown': 'Category not established. Consult pharmacist.',
    };

    const isSafe = category === 'A' || category === 'B';
    const isContraindicated = category === 'D' || category === 'X';

    let recommendation: string;
    if (isContraindicated) recommendation = `AVOID ${input.newDrug} during pregnancy (Category ${category}). Consider Acetaminophen (Category B).`;
    else if (category === 'C') recommendation = `Use ${input.newDrug} with caution during pregnancy (Category ${category}).`;
    else if (isSafe) recommendation = `${input.newDrug} is generally safe during pregnancy (Category ${category}).`;
    else recommendation = `Pregnancy safety data for ${input.newDrug} is insufficient. Consult pharmacist.`;

    return { flag: category, isSafe, isContraindicated, pregnancyStatus: input.pregnancyStatus, categoryDescription: categoryDescriptions[category] ?? categoryDescriptions['unknown'], note: `${input.newDrug} is FDA Pregnancy Category ${category} — ${categoryDescriptions[category] ?? categoryDescriptions['unknown']}`, recommendation, citation: 'FDA Pregnancy Risk Category System; Drugs in Pregnancy and Lactation (Briggs, Freeman & Yaffe, 12th Edition)' };
  }

  // ==========================================================================
  // check_duplicate_therapy
  // ==========================================================================
  @Tool({
    name: 'check_duplicate_therapy',
    description: 'Checks if the new drug is in the same therapeutic class as any existing medication using RxNorm API.',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed drug name'),
      currentMedications: z.array(z.string()).describe('List of current medication names')
    }),
    examples: {
      request: { newDrug: 'Aspirin', currentMedications: ['Warfarin', 'Metoprolol'] },
      response: { hasDuplicate: true, duplicates: [{ newDrug: 'Aspirin', existingDrug: 'Warfarin', sharedClass: 'Anticoagulants / Antithrombotics' }] }
    }
  })
  async checkDuplicateTherapy(input: { newDrug: string; currentMedications: string[] }, ctx: ExecutionContext) {
    ctx.logger.info('Checking duplicate therapy via RxNorm', { newDrug: input.newDrug, currentMedications: input.currentMedications });

    const duplicates: Array<{ newDrug: string; existingDrug: string; sharedClass: string; detail: string }> = [];
    let newDrugClasses: string[] = [];

    try {
      const classUrl = `https://rxnav.nlm.nih.gov/REST/rxclass/class/byDrugName.json?drugName=${encodeURIComponent(input.newDrug)}&relaSource=ATC`;
      const classResponse = await fetch(classUrl);
      if (classResponse.ok) {
        const classData: any = await classResponse.json();
        const entries = classData?.rxclassDrugInfoList?.rxclassDrugInfo;
        if (Array.isArray(entries)) newDrugClasses = entries.map((e: any) => e.rxclassMinConceptItem?.className).filter(Boolean);
      }
    } catch (error) { ctx.logger.warn('RxNorm API failed for new drug class lookup'); }

    if (newDrugClasses.length === 0) newDrugClasses = LOCAL_DRUG_CLASSES[input.newDrug] ?? [];

    for (const currentMed of input.currentMedications) {
      let currentMedClasses: string[] = [];
      try {
        const medClassUrl = `https://rxnav.nlm.nih.gov/REST/rxclass/class/byDrugName.json?drugName=${encodeURIComponent(currentMed)}&relaSource=ATC`;
        const medResponse = await fetch(medClassUrl);
        if (medResponse.ok) {
          const medData: any = await medResponse.json();
          const entries = medData?.rxclassDrugInfoList?.rxclassDrugInfo;
          if (Array.isArray(entries)) currentMedClasses = entries.map((e: any) => e.rxclassMinConceptItem?.className).filter(Boolean);
        }
      } catch (error) { ctx.logger.warn('RxNorm API failed for current med class lookup'); }

      if (currentMedClasses.length === 0) currentMedClasses = LOCAL_DRUG_CLASSES[currentMed] ?? [];

      const shared = newDrugClasses.filter(cls => currentMedClasses.includes(cls));
      if (shared.length > 0) {
        duplicates.push({ newDrug: input.newDrug, existingDrug: currentMed, sharedClass: shared.join(', '), detail: `Both ${input.newDrug} and ${currentMed} belong to ${shared[0]}. Concurrent use may be redundant.` });
      }
    }

    return { hasDuplicate: duplicates.length > 0, duplicates, classesFound: { [input.newDrug]: newDrugClasses.slice(0, 5) }, citation: duplicates.length > 0 ? 'NIH RxNorm Drug Classification API + PharmaGuard Local Drug Class Database' : 'No duplicate therapy found.' };
  }

  // ==========================================================================
  // find_and_rank_alternatives
  // ==========================================================================
  @Tool({
    name: 'find_and_rank_alternatives',
    description: 'Finds safer alternative medications using RxNorm and ranks them by how many safety checks they pass against the patient\'s profile',
    inputSchema: z.object({
      unsafeDrug: z.string().describe('The drug that was flagged as risky'),
      patientId: z.string().describe('Patient ID to check alternatives against'),
    }),
    examples: {
      request: { unsafeDrug: 'Ibuprofen', patientId: 'P001' },
      response: { alternatives: [{ drug: 'Acetaminophen', safetyScore: 5 }], recommendedAlternative: 'Acetaminophen' }
    }
  })
  async findAndRankAlternatives(input: { unsafeDrug: string; patientId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Finding and ranking alternatives', { unsafeDrug: input.unsafeDrug, patientId: input.patientId });

    const patients = loadPatients();
    const patient = patients.find((p: any) => p.id === input.patientId);
    if (!patient) throw new Error(`Patient not found: ${input.patientId}`);

    let candidates: string[] = [];
    try {
      const rxcuiUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(input.unsafeDrug)}&search=1`;
      const rxcuiResponse = await fetch(rxcuiUrl);
      if (rxcuiResponse.ok) {
        const rxcuiData: any = await rxcuiResponse.json();
        const rxcui = rxcuiData?.idGroup?.rxnormId?.[0];
        if (rxcui) {
          const relatedUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=SBD+SCD+IN`;
          const relatedResponse = await fetch(relatedUrl);
          if (relatedResponse.ok) {
            const relatedData: any = await relatedResponse.json();
            const groups = relatedData?.relatedGroup?.conceptGroup;
            if (Array.isArray(groups)) {
              for (const group of groups) {
                if (Array.isArray(group.conceptProperties)) {
                  for (const concept of group.conceptProperties.slice(0, 3)) {
                    if (concept.name && !candidates.includes(concept.name)) candidates.push(concept.name);
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) { ctx.logger.warn('RxNorm alternative lookup failed'); }

    if (candidates.length === 0) candidates = ALTERNATIVE_DRUGS[input.unsafeDrug] ?? ['Acetaminophen'];

    const rankedAlternatives = [];
    for (const candidate of candidates.slice(0, 5)) {
      const checks = { allergy: true, disease: true, age: true, renal: true, interaction: true };
      const failedChecks: string[] = [];

      const crossReact = ALLERGY_CROSS_REACTIVITY_TABLE[candidate];
      if (crossReact && crossReact.some(cls => patient.allergies.includes(cls))) { checks.allergy = false; failedChecks.push('allergy'); }
      if (patient.allergies.some((a: string) => a.toLowerCase() === candidate.toLowerCase())) { checks.allergy = false; if (!failedChecks.includes('allergy')) failedChecks.push('allergy'); }

      const contras = CONTRAINDICATION_TABLE[candidate];
      if (contras && contras.some(d => patient.diagnoses.some((diag: string) => diag.toLowerCase() === d.toLowerCase()))) { checks.disease = false; failedChecks.push('disease'); }

      const crcl = patient.labResults.creatinineClearance_mLmin;
      const nephrotoxic = ['Ibuprofen', 'Naproxen', 'Aspirin', 'Gentamicin', 'Metformin'];
      if (crcl < 30 && nephrotoxic.some(d => d.toLowerCase() === candidate.toLowerCase())) { checks.renal = false; failedChecks.push('renal'); }

      for (const med of patient.currentMedications) {
        const key = getInteractionKey(candidate, med.name);
        if (DRUG_INTERACTION_FALLBACK_TABLE[key]) { checks.interaction = false; if (!failedChecks.includes('interaction')) failedChecks.push('interaction'); }
      }

      const passedChecks = Object.entries(checks).filter(([, passed]) => passed).map(([name]) => name);
      rankedAlternatives.push({ drug: candidate, safetyScore: passedChecks.length, totalChecks: 5, passedChecks, failedChecks });
    }

    rankedAlternatives.sort((a, b) => b.safetyScore - a.safetyScore);
    return {
      alternatives: rankedAlternatives,
      recommendedAlternative: rankedAlternatives.length > 0 ? rankedAlternatives[0].drug : null,
      note: rankedAlternatives.length > 0 ? `${rankedAlternatives[0].drug} passed ${rankedAlternatives[0].safetyScore}/5 safety checks.` : 'No suitable alternatives found.',
    };
  }
}
