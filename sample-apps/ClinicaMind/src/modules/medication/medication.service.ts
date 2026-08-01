import { Injectable } from '@nitrostack/core';

export interface InteractionResult {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  drugs: string[];
  description: string;
  recommendation: string;
  source?: string;
  rxcui?: string;
}

export interface AllergyConflictResult {
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  drug: string;
  allergy: string;
  description: string;
}

@Injectable({ deps: [] })
export class MedicationService {
  private knownInteractions: Array<{ drugs: [string, string]; severity: 'HIGH' | 'MEDIUM' | 'LOW'; description: string; recommendation: string }> = [
    {
      drugs: ['warfarin', 'ibuprofen'],
      severity: 'HIGH',
      description: 'Concomitant use of Warfarin and NSAIDs (Ibuprofen) significantly increases upper gastrointestinal and major bleeding risks.',
      recommendation: 'Avoid NSAIDs; consider Acetaminophen/Tylenol for analgesia and monitor INR closely.'
    },
    {
      drugs: ['lisinopril', 'spironolactone'],
      severity: 'HIGH',
      description: 'Combined ACE inhibitor and potassium-sparing diuretic therapy can cause severe hyperkalemia.',
      recommendation: 'Monitor serum potassium levels frequently.'
    },
    {
      drugs: ['aspirin', 'ibuprofen'],
      severity: 'MEDIUM',
      description: 'Ibuprofen may attenuate the cardioprotective antiplatelet effect of low-dose Aspirin.',
      recommendation: 'Take Ibuprofen at least 8 hours after or 30 minutes before immediate-release Aspirin.'
    }
  ];

  async getRxCui(drugName: string): Promise<string | null> {
    try {
      const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as any;
        const rxcui = json?.idGroup?.rxnormId?.[0];
        return rxcui || null;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  async checkOpenFDAInteractions(drugName: string): Promise<string | null> {
    try {
      const rxcui = await this.getRxCui(drugName);
      const queryParam = rxcui ? `openfda.rxcui:${rxcui}` : `openfda.brand_name:${encodeURIComponent(drugName)}`;
      const url = `https://api.fda.gov/drug/label.json?search=${queryParam}&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as any;
        const interactions = json?.results?.[0]?.drug_interactions?.[0];
        return interactions ? interactions.substring(0, 300) + '...' : null;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  async checkDrugInteractionsAsync(drugs: string[]): Promise<InteractionResult[]> {
    const local = this.checkDrugInteractions(drugs);
    if (local.length > 0) return local;

    // Check openFDA for live drug label interaction data
    const results: InteractionResult[] = [];
    for (const drug of drugs) {
      const fdaText = await this.checkOpenFDAInteractions(drug);
      if (fdaText) {
        results.push({
          severity: 'HIGH',
          drugs: [drug, 'Target Co-medication'],
          description: fdaText,
          recommendation: `Verify openFDA drug interaction guidelines for ${drug.toUpperCase()}.`,
          source: 'openFDA Drug Label API'
        });
      }
    }
    return results.length > 0 ? results : local;
  }

  checkDrugInteractions(drugs: string[]): InteractionResult[] {
    const normalized = drugs.map((d) => d.toLowerCase());
    const results: InteractionResult[] = [];

    for (const rule of this.knownInteractions) {
      const match0 = normalized.some((d) => d.includes(rule.drugs[0]));
      const match1 = normalized.some((d) => d.includes(rule.drugs[1]));
      if (match0 && match1) {
        results.push({
          severity: rule.severity,
          drugs: rule.drugs,
          description: rule.description,
          recommendation: rule.recommendation,
          source: 'ClinicaMind Rules Engine'
        });
      }
    }

    return results;
  }

  checkAllergyConflicts(drugs: string[], allergies: string[]): AllergyConflictResult[] {
    const normDrugs = drugs.map((d) => d.toLowerCase());
    const normAllergies = allergies.map((a) => a.toLowerCase());
    const conflicts: AllergyConflictResult[] = [];

    for (const allergy of normAllergies) {
      if (allergy.includes('penicillin')) {
        for (const drug of normDrugs) {
          if (drug.includes('penicillin') || drug.includes('amoxicillin') || drug.includes('ampicillin') || drug.includes('augmentin')) {
            conflicts.push({
              severity: 'CRITICAL',
              drug,
              allergy: 'Penicillin',
              description: `CRITICAL ALLERGY ALERT: Patient has a documented Penicillin allergy. ${drug.toUpperCase()} is a beta-lactam antibiotic and carries high risk of anaphylaxis.`
            });
          }
        }
      }
      if (allergy.includes('sulfa')) {
        for (const drug of normDrugs) {
          if (drug.includes('bactrim') || drug.includes('sulfamethoxazole') || drug.includes('sulfa')) {
            conflicts.push({
              severity: 'HIGH',
              drug,
              allergy: 'Sulfa Drugs',
              description: `ALLERGY ALERT: Patient is allergic to Sulfa compounds. Prescribing ${drug.toUpperCase()} may cause severe cutaneous reactions.`
            });
          }
        }
      }
    }

    return conflicts;
  }
}
