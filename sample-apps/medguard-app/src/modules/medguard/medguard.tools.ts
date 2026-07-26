import { ToolDecorator as Tool, PromptDecorator as Prompt, Widget, z } from '@nitrostack/core';
import { createClient } from '@supabase/supabase-js';
import patients from '../../../fixtures/patients.json' with { type: 'json' };
import interactionDataset from '../../../fixtures/medguard-dataset.json' with { type: 'json' };

type Patient = {
  patientId: string;
  name: string;
  conditions: string[];
  eGFR: number;
  activeMedications: string[];
};

type InteractionEntry = {
  category: string;
  disease: string;
  drug: string;
  combination: string;
  risk: string;
  effect: string;
  alternatives: string[];
};

const patientRecords = patients as unknown as Patient[];
const interactionRules = interactionDataset as unknown as InteractionEntry[];

// Initialize Supabase client if credentials are provided in env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildTokens(text: string) {
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .filter((token) => token.length > 2);
}

function findBestMatch(patient: Patient, proposedDrug: string, rulesList: InteractionEntry[], diseaseOverride?: string, currentMedications?: string[]) {
  const candidateText = [
    patient.conditions.join(' '),
    diseaseOverride ?? '',
    patient.activeMedications.join(' '),
    currentMedications?.join(' ') ?? ''
  ].join(' ');

  const patientTokens = new Set(buildTokens(candidateText));
  const proposedDrugTokens = buildTokens(proposedDrug);

  const scored = rulesList
    .map((entry) => {
      const diseaseText = `${entry.disease} ${entry.category}`;
      const diseaseTokens = buildTokens(diseaseText);
      const drugTokens = buildTokens(entry.drug);
      const comboTokens = buildTokens(entry.combination);

      const diseaseScore = diseaseTokens.filter((token) => patientTokens.has(token)).length;
      const drugScore = proposedDrugTokens.filter((token) => drugTokens.includes(token)).length;
      const comboScore = comboTokens.filter((token) => patientTokens.has(token)).length;
      const generalMatch = drugScore > 0 && (diseaseScore > 0 || comboScore > 0);

      const score = diseaseScore + drugScore + comboScore;
      return { entry, score, matched: generalMatch };
    })
    .filter((result) => result.matched)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.entry ?? null;
}

function getRiskLevelValue(risk: string) {
  const normalized = normalize(risk);
  if (normalized.includes('high')) return 3;
  if (normalized.includes('medium')) return 2;
  return 1;
}

export class MedGuardTools {
  @Tool({
    name: 'evaluate_treatment_safety',
    description: 'Cross-checks a proposed medication against patient history and a curated drug-disease interaction dataset.',
    inputSchema: z.object({
      patientId: z.string().describe('The ID of the patient (e.g., P101)'),
      proposedDrug: z.string().describe('The name of the new dermatology drug proposed (e.g., Cyclosporine, Oral Terbinafine)'),
      disease: z.string().optional().describe('Optional disease or condition context to evaluate against the dataset'),
      currentMedications: z.array(z.string()).optional().describe('Optional list of current medications the patient is already taking')
    }),
  })
  @Widget('calculator-result')
  async evaluateSafety(input: { patientId: string; proposedDrug: string; disease?: string; currentMedications?: string[] }) {
    // 1. Fetch Patient Record (live Supabase query with local fallback)
    let patient: Patient | undefined;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('patient_id', input.patientId)
          .single();
        if (!error && data) {
          patient = {
            patientId: data.patient_id,
            name: data.name,
            conditions: data.conditions || [],
            eGFR: data.egfr,
            activeMedications: data.active_medications || []
          };
        }
      } catch (err) {
        // Fallback silently to local cache on error
      }
    }

    if (!patient) {
      patient = patientRecords.find((p) => p.patientId === input.patientId) || patientRecords[0];
    }

    // 2. Fetch Interaction Rules (live Supabase query with local fallback)
    let rulesList = interactionRules;
    let isLiveDatabase = false;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('interaction_rules')
          .select('*');
        if (!error && data && data.length > 0) {
          rulesList = data.map((r: any) => ({
            category: r.category,
            disease: r.disease,
            drug: r.drug,
            combination: r.combination,
            risk: r.risk,
            effect: r.effect,
            alternatives: r.alternatives || []
          }));
          isLiveDatabase = true;
        }
      } catch (err) {
        // Fallback silently to local cache on error
      }
    }

    const matchedRule = findBestMatch(patient, input.proposedDrug, rulesList, input.disease, input.currentMedications);

    if (matchedRule) {
      const riskLevel = getRiskLevelValue(matchedRule.risk);
      const isCritical = riskLevel >= 3 && patient.eGFR < 60;

      return {
        status: isCritical ? 'CRITICAL_RISK' : 'WARNING',
        patientName: patient.name,
        eGFR: patient.eGFR,
        category: matchedRule.category,
        disease: matchedRule.disease,
        proposedDrug: input.proposedDrug,
        interactionEffect: matchedRule.effect,
        riskLevel: matchedRule.risk,
        warning: `Potential ${matchedRule.risk.toLowerCase()} interaction detected for ${input.proposedDrug}. ${matchedRule.effect}`,
        suggestedAlternatives: matchedRule.alternatives.length > 0 ? matchedRule.alternatives : ['Review with a clinical pharmacist', 'Consider a lower-risk alternative'],
        source: isLiveDatabase ? 'Supabase MedGuard database' : 'MedGuard local database',
        demoSummary: `Patient ${patient.name} has ${patient.conditions.join(', ')} and is being evaluated for ${input.proposedDrug}.`,
        visual: {
          type: isCritical ? 'critical' : 'warning',
          icon: isCritical ? '⚠️' : '🟡',
          color: isCritical ? 'red' : 'orange',
          title: isCritical ? 'Critical Drug Safety Alert' : 'Medication Interaction Warning'
        }
      };
    }

    return {
      status: 'SAFE',
      patientName: patient.name,
      eGFR: patient.eGFR,
      warning: 'No matching interaction detected in the current MedGuard dataset.',
      source: isLiveDatabase ? 'Supabase MedGuard database' : 'MedGuard local database',
      demoSummary: `Patient ${patient.name} appears stable for this proposed medication based on the current database.`,
      visual: {
        type: 'safe',
        icon: '✅',
        color: 'green',
        title: 'Medication looks safe'
      }
    };
  }

  @Tool({
    name: 'get_patient_details',
    description: 'Fetch details for a specific patient including conditions, eGFR, and active medications',
    taskSupport: 'optional',
    inputSchema: z.object({
      patientId: z.string().describe('The ID of the patient (e.g., P101)'),
    }),
  })
  async getPatientDetails(input: { patientId: string }) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('patient_id', input.patientId)
          .single();
        if (!error && data) {
          return {
            patientId: data.patient_id,
            name: data.name,
            conditions: data.conditions || [],
            eGFR: data.egfr,
            activeMedications: data.active_medications || [],
            source: 'Supabase MedGuard database'
          };
        }
      } catch (err) {
        // Fallback silently
      }
    }

    const patient = patientRecords.find((p) => p.patientId === input.patientId);
    if (!patient) {
      throw new Error(`Patient with ID ${input.patientId} not found.`);
    }
    return { ...patient, source: 'MedGuard local database' };
  }

  @Tool({
    name: 'list_interaction_rules',
    description: 'Search the MedGuard interaction rules dataset by disease or drug category',
    taskSupport: 'optional',
    inputSchema: z.object({
      query: z.string().describe('The disease, condition, or drug to search for'),
    }),
  })
  async listInteractionRules(input: { query: string }) {
    let rulesList = interactionRules;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('interaction_rules')
          .select('*')
          .or(`disease.ilike.%${input.query}%,drug.ilike.%${input.query}%,combination.ilike.%${input.query}%`)
          .limit(10);
        if (!error && data) {
          return {
            results: data,
            source: 'Supabase MedGuard database'
          };
        }
      } catch (err) {
        // Fallback silently
      }
    }

    const queryLower = input.query.toLowerCase();
    const results = rulesList.filter(rule => 
      rule.disease.toLowerCase().includes(queryLower) || 
      rule.drug.toLowerCase().includes(queryLower) ||
      rule.combination.toLowerCase().includes(queryLower)
    ).slice(0, 10);

    return {
      results,
      source: 'MedGuard local database'
    };
  }



  @Tool({
    name: 'add_patient',
    description: 'Add a new patient to the MedGuard database',
    taskSupport: 'optional',
    inputSchema: z.object({
      patientId: z.string().describe('The ID of the patient (e.g., P103)'),
      username: z.string().describe('The username for the patient'),
      password: z.string().describe('The password for the patient'),
      name: z.string().describe('The full name of the patient'),
      conditions: z.array(z.string()).describe('List of conditions'),
      eGFR: z.number().describe('The eGFR value (kidney function metric)'),
      activeMedications: z.array(z.string()).describe('List of active medications'),
    }),
  })
  async addPatient(input: {
    patientId: string;
    username: string;
    password: string;
    name: string;
    conditions: string[];
    eGFR: number;
    activeMedications: string[];
  }) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .insert([{
            patient_id: input.patientId,
            username: input.username,
            password: input.password,
            name: input.name,
            conditions: input.conditions,
            egfr: input.eGFR,
            active_medications: input.activeMedications
          }]);
        if (error) {
          throw new Error(error.message);
        }
        return { success: true, message: `Patient ${input.name} added successfully to Supabase.` };
      } catch (err: any) {
        throw new Error(`Failed to insert into Supabase: ${err.message}`);
      }
    } else {
      // Add to local cache if no Supabase
      patientRecords.push({
        patientId: input.patientId,
        name: input.name,
        conditions: input.conditions,
        eGFR: input.eGFR,
        activeMedications: input.activeMedications
      });
      return { success: true, message: `Patient ${input.name} added successfully to local cache.` };
    }
  }

  @Prompt({
    name: 'process_patient_workflow',
    title: 'Process Patient Workflow',
    description: 'Instructs the assistant on how to process a patient: check if they exist, confirm before adding, and fetch details.',
  })
  async processPatientWorkflow() {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please help me process a patient. 
Follow this workflow strictly:
1. Use the 'get_patient_details' tool to check if the patient exists in the database.
2. If the patient DOES NOT exist, STOP and ask me for confirmation to add them. 
3. After I confirm, use the 'add_patient' tool to insert them into the database.
4. Once the patient is in the database (either they already existed or you just added them), use 'get_patient_details' to fetch their active medications and conditions.
5. Then call the 'evaluate_treatment_safety' tool with a proposed drug (ask me which drug if you don't know) and report the results.`
          }
        }
      ]
    };
  }
}