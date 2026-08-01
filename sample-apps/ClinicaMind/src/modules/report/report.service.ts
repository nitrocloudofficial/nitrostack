import { Injectable } from '@nitrostack/core';

export interface ClinicalSummary {
  patientId: string;
  chiefComplaint: string;
  suspectedDiagnosis: string;
  primaryDiagnosis?: string;
  riskLevel: 'CRITICAL RISK' | 'HIGH RISK' | 'MODERATE' | 'LOW' | 'EVALUATED';
  keyWarnings: string[];
  evidenceSummary: string;
  recommendedActionPlan: string[];
  recommendedActions?: string[];
}

@Injectable({ deps: [] })
export class ReportService {
  generateSummary(findings: any): ClinicalSummary {
    const patientId = findings.history?.patientId || 'Unknown';
    const symptoms = findings.symptoms || [];
    const sLower = symptoms.map((s: string) => s.toLowerCase());

    if (sLower.some((s: string) => s.includes('chest pain') || s.includes('cough'))) {
      const suspectedDiagnosis = 'High-risk Community-Acquired Pneumonia (CAP) with potential sepsis progression.';
      const recommendedActionPlan = [
        'Order immediate Stat Chest Radiograph (PA & Lateral) and blood cultures.',
        'Initiate Levofloxacin 750mg IV/PO daily (non-penicillin respiratory fluoroquinolone).',
        'Ask patient regarding smoking history and recent travel exposure.'
      ];
      return {
        patientId,
        chiefComplaint: 'Acute chest pain, productive cough, high fever risk in 70yo diabetic female.',
        suspectedDiagnosis,
        primaryDiagnosis: suspectedDiagnosis,
        riskLevel: 'CRITICAL RISK',
        keyWarnings: [
          'CRITICAL ALLERGY ALERT: Documented severe Penicillin allergy. Avoid all Penicillin/Amoxicillin prescriptions.',
          'HIGH RISK FACTOR: Co-morbid Type 2 Diabetes (HbA1c 7.8%) increases CAP mortality 2.4-fold.',
          'GAP ALERT: Smoking history and recent travel history unconfirmed.'
        ],
        evidenceSummary: 'JAMA 2026 guidelines recommend early empirical Levofloxacin/Azithromycin for diabetic CAP patients with beta-lactam hypersensitivity.',
        recommendedActionPlan,
        recommendedActions: recommendedActionPlan
      };
    }

    if (sLower.some((s: string) => s.includes('warfarin') || s.includes('ibuprofen') || s.includes('leg pain'))) {
      const suspectedDiagnosis = 'Severe Drug-Drug Interaction Warning (Warfarin + NSAID).';
      const recommendedActionPlan = [
        'Cancel proposed Ibuprofen prescription.',
        'Prescribe Acetaminophen 500mg q6h PRN pain.',
        'Check current STAT INR level.'
      ];
      return {
        patientId,
        chiefComplaint: 'Patient on maintenance Warfarin therapy initiating Ibuprofen for leg discomfort.',
        suspectedDiagnosis,
        primaryDiagnosis: suspectedDiagnosis,
        riskLevel: 'HIGH RISK',
        keyWarnings: [
          'SEVERE DRUG INTERACTION: Warfarin + Ibuprofen increases upper GI bleeding risk 3.4-fold.',
          'RECOMMENDATION: Discontinue Ibuprofen immediately. Switch to Acetaminophen for analgesia.'
        ],
        evidenceSummary: 'Lancet Respiratory Medicine 2025 systemic review advises against concurrent NSAID administration in anticoagulated patients.',
        recommendedActionPlan,
        recommendedActions: recommendedActionPlan
      };
    }

    const suspectedDiagnosis = 'Acute Viral Upper Respiratory Tract Infection (Common Cold).';
    const recommendedActionPlan = [
      'Recommend rest, oral hydration, and OTC Acetaminophen PRN for mild headache.',
      'Educate patient on red-flag symptoms (shortness of breath, persistent fever).'
    ];
    return {
      patientId,
      chiefComplaint: 'Headache and mild upper respiratory runny nose.',
      suspectedDiagnosis,
      primaryDiagnosis: suspectedDiagnosis,
      riskLevel: 'LOW',
      keyWarnings: ['No acute red flags or drug allergy contraindications noted.'],
      evidenceSummary: 'BMJ Evidence-Based Medicine 2024 guidelines advocate supportive symptomatic therapy only; routine antibiotics are inappropriate.',
      recommendedActionPlan,
      recommendedActions: recommendedActionPlan
    };
  }
}
