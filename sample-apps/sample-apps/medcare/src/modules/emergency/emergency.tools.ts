import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { loadJSON } from '../../shared/resource-loader.js';
import type { PatientDB, PatientProfile } from '../../shared/shared.types.js';

// ---------------------------------------------------------------------------
// EmergencyTools — Agent 3: Emergency & Family Hub
// ---------------------------------------------------------------------------

export class EmergencyTools {

  @Tool({
    name: 'generate_emergency_card',
    description:
      'Generates a quick-glance critical care summary for a patient — optimized for emergency responders and first-time caregivers. Aggregates blood type, critical allergies, life-threatening conditions, active medications, genetic risk alerts, and primary emergency contacts from the patient profile.',
    inputSchema: z.object({
      patient_id: z.string().describe('Patient ID from the family profile (P001, P002, or P003)')
    }),
    examples: {
      request: { patient_id: 'P001' },
      response: {
        patient_id: 'P001',
        name: 'Arthur Krishnamurthy',
        age: 74,
        sex: 'Male',
        blood_type: 'A+',
        critical_allergies: [],
        critical_conditions: [],
        active_medications: [],
        genetic_alerts: [],
        emergency_contacts: [],
        generated_at: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @Widget('emergency-card')
  async generateEmergencyCard(input: { patient_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating emergency card', { patient_id: input.patient_id });

    const db = loadJSON<PatientDB>('patient_profile.json', 'patient profiles');

    const patient = db.patients.find(p => p.patient_id === input.patient_id);
    if (!patient) {
      throw new Error(`Patient "${input.patient_id}" not found. Available IDs: P001, P002, P003`);
    }

    // Filter to critical/severe allergies for emergency prominence
    const criticalAllergies = (patient.allergies || []).filter(
      a => a.severity === 'severe' || a.severity === 'high'
    );

    // All allergies matter in emergencies — include all but sort by severity
    const allAllergies = [...(patient.allergies || [])].sort((a, b) => {
      const order = { severe: 0, high: 0, moderate: 1, low: 2 };
      return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3);
    });

    // Active/high-severity conditions
    const criticalConditions = (patient.conditions || []).filter(
      c => c.status === 'active' && (c.severity === 'high' || c.severity === 'moderate')
    );

    // Genetic markers that could affect emergency treatment decisions
    const geneticAlerts = (patient.genetic_markers || [])
      .filter(m => m.gene === 'CYP2C19' || m.gene === 'TPMT') // Most clinically urgent in emergencies
      .map(m => ({
        gene: m.gene,
        phenotype: m.phenotype,
        emergency_relevance: this.getEmergencyRelevance(m.gene, m.variant),
        clinical_note: m.clinical_note
      }));

    // Primary contact first
    const contacts = [...(patient.emergency_contacts || [])].sort(
      (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
    );

    ctx.logger.info('Emergency card generated', {
      patient: patient.name,
      critical_allergies: criticalAllergies.length,
      conditions: criticalConditions.length
    });

    return {
      patient_id: patient.patient_id,
      name: patient.name,
      relationship: patient.relationship,
      age: patient.age,
      sex: patient.sex,
      blood_type: patient.blood_type,
      weight_kg: patient.weight_kg,
      height_cm: patient.height_cm,
      critical_allergies: allAllergies,
      critical_conditions: criticalConditions,
      all_conditions: patient.conditions || [],
      active_medications: patient.active_medications || [],
      genetic_alerts: geneticAlerts,
      emergency_contacts: contacts,
      care_warnings: this.buildCareWarnings(patient),
      generated_at: new Date().toISOString()
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private getEmergencyRelevance(gene: string, variant: string): string {
    const relevanceMap: Record<string, Record<string, string>> = {
      CYP2C19: {
        poor_metabolizer: 'Avoid Clopidogrel (ineffective). Warfarin dosing may require adjustment. Inform treating physician before antiplatelet or anticoagulant therapy.',
        rapid_metabolizer: 'Standard antifungal dosing may be insufficient. Alert anesthesiology if sedatives are planned.'
      },
      TPMT: {
        intermediate_activity: 'CRITICAL: If immunosuppressants (azathioprine, mercaptopurine) are needed in an emergency, use 30-70% of standard dose. Risk of fatal myelosuppression at standard doses.'
      }
    };
    return relevanceMap[gene]?.[variant] || 'Consult clinical pharmacist before prescribing affected drug classes.';
  }

  private buildCareWarnings(patient: PatientProfile): string[] {
    const warnings: string[] = [];

    // Allergy warnings
    const severeAllergies = (patient.allergies || []).filter(a => a.severity === 'severe');
    for (const allergy of severeAllergies) {
      const crossReactions = allergy.cross_reactions?.length
        ? ` Cross-reactive drugs to avoid: ${allergy.cross_reactions.join(', ')}.`
        : '';
      warnings.push(`🚫 SEVERE ALLERGY: ${allergy.substance} — ${allergy.reaction}.${crossReactions}`);
    }

    // Anticoagulant warning
    const onAnticoagulant = (patient.active_medications || []).some(
      m => ['warfarin', 'rivaroxaban', 'apixaban', 'dabigatran'].includes(m.name.toLowerCase())
    );
    if (onAnticoagulant) {
      warnings.push('⚠️ ANTICOAGULANT: Patient is on anticoagulant therapy. Increased bleeding risk. Avoid NSAIDs. Check INR before any invasive procedures.');
    }

    // Renal warning
    const hasKidneyDisease = (patient.conditions || []).some(
      c => c.name.toLowerCase().includes('kidney') || c.name.toLowerCase().includes('renal')
    );
    if (hasKidneyDisease) {
      warnings.push('⚠️ RENAL IMPAIRMENT: Dose-adjust renally cleared drugs. Avoid nephrotoxic agents. Monitor eGFR.');
    }

    // Age warning
    if (patient.age >= 65) {
      warnings.push('ℹ️ ELDERLY PATIENT: Apply Beers Criteria for medication selection. Increased fall risk. Monitor for polypharmacy interactions.');
    }

    // TPMT warning
    const hasTpmt = (patient.genetic_markers || []).some(m => m.gene === 'TPMT');
    if (hasTpmt) {
      warnings.push('🧬 GENETIC ALERT: TPMT intermediate metabolizer. Fatal myelosuppression risk if thiopurines (azathioprine, mercaptopurine) given at standard doses.');
    }

    return warnings;
  }
}
