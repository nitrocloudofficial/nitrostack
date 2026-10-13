/**
 * CareService — Care Coordination module logic.
 * Handles SBAR clinical handoffs, medication reconciliation, referral drafting, guidelines, and visit prep.
 */
import { Injectable } from '@nitrostack/core';
import { FhirService } from '../../integrations/fhir.service.js';
import { PubMedService } from '../../integrations/pubmed.service.js';
import { RxNormService } from '../../integrations/rxnorm.service.js';
import { loadDataJson } from '../../data/load-json.js';

const apptPrepData = loadDataJson('appointment-prep.json');

@Injectable({ deps: [FhirService, PubMedService, RxNormService] })
export class CareService {
  private readonly apptChecklists: Record<
    string,
    {
      checklist: Array<{ item: string; category: string; why: string }>;
      bring_list: string[];
    }
  > = apptPrepData.checklists;

  constructor(
    private readonly fhir: FhirService,
    private readonly pubmed: PubMedService,
    private readonly rxnorm: RxNormService,
  ) {}

  /** Generate SBAR or Narrative clinical handoff from FHIR data. */
  async generateHandoff(patientId: string, format: 'sbar' | 'narrative' = 'sbar') {
    let summary;
    try {
      summary = await this.fhir.getPatientSummary(patientId);
    } catch {
      summary = null;
    }

    const sectionsFailed = summary?.sections_failed ?? [
      'patient',
      'conditions',
      'medications',
      'vitals',
      'encounters',
    ];
    const patientContextAvailable = Boolean(summary && !sectionsFailed.includes('patient'));
    const patientName = patientContextAvailable ? summary?.patient?.name ?? '[patient context unavailable]' : '[patient context unavailable]';
    const age = patientContextAvailable ? summary?.patient?.age ?? '[patient context unavailable]' : '[patient context unavailable]';
    const gender = patientContextAvailable ? summary?.patient?.gender ?? '[patient context unavailable]' : '[patient context unavailable]';

    const conditions = summary?.active_conditions.map((c) => c.display).join(', ') || '[No active conditions recorded]';
    const medications = summary?.active_medications.map((m) => m.name).join(', ') || '[No active medications recorded]';
    const vitals =
      summary?.recent_vitals.map((v) => `${v.display}: ${v.value} ${v.unit ?? ''}`).join('; ') ||
      '[No recent vitals recorded]';
    const encounters =
      summary?.recent_encounters.map((e) => `${e.type} (${e.period_start ?? 'recent'})`).join('; ') ||
      '[No recent encounters recorded]';

    const situation = `Patient ${patientName} (${age}y ${gender}) presenting for clinical handoff/transfer. Active problems: ${conditions}.`;
    const background = `Past encounters: ${encounters}. Current active regimen: ${medications}.`;
    const assessment = `Recent vital signs: ${vitals}. Allergy status: ${summary?.allergy_note ?? 'Unconfirmed'}.`;
    const recommendation =
      `1. Re-evaluate active conditions (${conditions}).\n` +
      `2. Verify medication adherence and reconcile reported drugs against ${medications}.\n` +
      `3. Monitor vital signs trend and complete clinical handover.`;

    if (format === 'narrative') {
      return {
        patient_id: patientId,
        narrative: `${situation} ${background} ${assessment} ${recommendation}`,
        source_data_window: 'FHIR R4 Active Summary',
        synthetic_data: true,
        sections_failed: sectionsFailed,
        server_used: summary?.server_used ?? 'unavailable',
      };
    }

    return {
      patient_id: patientId,
      sbar: {
        situation,
        background,
        assessment,
        recommendation,
      },
      source_data_window: 'FHIR R4 Active Summary',
      synthetic_data: true,
      sections_failed: sectionsFailed,
      server_used: summary?.server_used ?? 'unavailable',
    };
  }

  private async normalizeMedication(medication: string): Promise<string> {
    const fallback = medication.trim().toLowerCase();
    try {
      const rxcui = await this.rxnorm.resolveName(medication);
      if (!rxcui) return fallback;
      const properties = await this.rxnorm.getProperties(rxcui);
      return properties?.name?.trim().toLowerCase() ?? fallback;
    } catch {
      // RxNorm is an enhancement, not a reason to fail reconciliation.
      return fallback;
    }
  }

  /** Reconcile two medication lists to identify discrepancies and duplicate risks. */
  async reconcileMedications(
    listA: string[],
    listB: string[],
    labelA: string = 'List A',
    labelB: string = 'List B',
  ) {
    const normalizedA = await Promise.all(listA.map((medication) => this.normalizeMedication(medication)));
    const normalizedB = await Promise.all(listB.map((medication) => this.normalizeMedication(medication)));
    const matches = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);

    const continued: string[] = [];
    const added: string[] = [];
    const removed: string[] = [];
    const possibleDuplicates: Array<{ a: string; b: string; reason: string }> = [];
    const duplicateKeys = new Set<string>();
    const addDuplicate = (a: string, b: string, reason: string) => {
      const key = [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join('|');
      if (duplicateKeys.has(key)) return;
      duplicateKeys.add(key);
      possibleDuplicates.push({ a, b, reason });
    };

    for (let i = 0; i < listA.length; i++) {
      if (normalizedB.some((b) => matches(normalizedA[i], b))) {
        if (!continued.includes(listA[i])) continued.push(listA[i]);
      } else {
        removed.push(listA[i]);
      }
    }

    for (let i = 0; i < listB.length; i++) {
      if (!normalizedA.some((a) => matches(a, normalizedB[i]))) {
        added.push(listB[i]);
      }
    }

    // Conservative cross-list medication-risk heuristics. These are warnings,
    // not diagnoses or interaction verdicts, and are shown for clinician review.
    const nsaidTerms = ['ibuprofen', 'aspirin', 'naproxen', 'advil', 'aleve', 'celebrex', 'meloxicam'];
    const anticoagulantTerms = ['warfarin', 'heparin', 'apixaban', 'rivaroxaban', 'dabigatran', 'clopidogrel'];
    const containsAny = (name: string, terms: string[]) =>
      terms.some((term) => name.toLowerCase().includes(term));

    for (const aName of listA) {
      for (const bName of listB) {
        if (aName.trim().toLowerCase() === bName.trim().toLowerCase()) continue;
        const aNsaid = containsAny(aName, nsaidTerms);
        const bNsaid = containsAny(bName, nsaidTerms);
        const aAnticoagulant = containsAny(aName, anticoagulantTerms);
        const bAnticoagulant = containsAny(bName, anticoagulantTerms);

        if (aNsaid && bNsaid) {
          addDuplicate(
            aName,
            bName,
            'Multiple NSAID agents detected. Risk of severe GI toxicity and renal impairment.',
          );
        } else if ((aAnticoagulant && bNsaid) || (bAnticoagulant && aNsaid)) {
          addDuplicate(
            aName,
            bName,
            'Anticoagulant plus NSAID/antiplatelet exposure may increase bleeding risk. Confirm with a clinician or pharmacist.',
          );
        }
      }
    }

    return {
      labels: { list_a: labelA, list_b: labelB },
      continued,
      added,
      removed,
      possible_duplicates: possibleDuplicates,
      duplicate_detection_note:
        'Duplicate and interaction-risk warnings are conservative heuristics for clinician review, not definitive interaction findings.',
      discrepancy_count: added.length + removed.length + possibleDuplicates.length,
    };
  }

  /** Draft specialist referral note. */
  async draftReferral(
    patientId: string,
    specialty: string,
    reason: string,
    urgency: 'routine' | 'urgent' = 'routine',
  ) {
    let summary;
    try {
      summary = await this.fhir.getPatientSummary(patientId);
    } catch {
      summary = null;
    }

    const sectionsFailed = summary?.sections_failed ?? ['patient'];
    const patientContextAvailable = Boolean(summary && !sectionsFailed.includes('patient'));
    const patientName = patientContextAvailable ? summary?.patient?.name ?? '[patient context unavailable]' : '[patient context unavailable]';
    const age = patientContextAvailable ? summary?.patient?.age ?? '[patient context unavailable]' : '[patient context unavailable]';
    const gender = patientContextAvailable ? summary?.patient?.gender ?? '[patient context unavailable]' : '[patient context unavailable]';

    const conditions = summary?.active_conditions.map((c) => c.display) ?? [];
    const medications = summary?.active_medications.map((m) => m.name) ?? [];
    const conditionsText = conditions.length ? conditions.map((c) => `• ${c}`).join('\n') : '[patient context unavailable]';
    const medicationsText = medications.length ? medications.map((m) => `• ${m}`).join('\n') : '[patient context unavailable]';

    const draftText =
      `SPECIALIST REFERRAL CONSULTATION REQUEST\n` +
      `----------------------------------------\n` +
      `Date: ${new Date().toLocaleDateString()}\n` +
      `To: Department of ${specialty}\n` +
      `Urgency: ${urgency.toUpperCase()}\n\n` +
      `RE: ${patientName} (Age: ${age}, Gender: ${gender})\n\n` +
      `REASON FOR REFERRAL:\n${reason}\n\n` +
      `RELEVANT ACTIVE CONDITIONS:\n${conditionsText}\n\n` +
      `CURRENT ACTIVE MEDICATIONS:\n${medicationsText}\n\n` +
      `CLINICIAN SIGN-OFF REQUIRED:\nThis draft referral was generated by Vitalis Care Coordination. A licensed clinician must review and sign prior to transmission.`;

    return {
      referral: {
        to_specialty: specialty,
        reason,
        urgency,
        patient_summary_block: `${patientName}, ${age}y ${gender}`,
        relevant_conditions: conditions,
        relevant_medications: medications,
        draft_text: draftText,
      },
      requires_clinician_review: true,
      sections_failed: sectionsFailed,
      server_used: summary?.server_used ?? 'unavailable',
    };
  }

  /** Find clinical practice guidelines for a condition via PubMed. */
  async findGuidelines(condition: string, maxResults: number = 5) {
    const { pmids } = await this.pubmed.search(condition, maxResults, 'guideline');
    const summaries = await this.pubmed.getSummaries(pmids);

    const guidelines = summaries.map((s) => ({
      pmid: s.pmid,
      title: s.title,
      journal: s.journal,
      pub_date: s.pubDate,
      organization: s.authors[0] ?? 'Consensus Panel',
      url: `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`,
    }));

    return {
      guidelines,
      search_strategy: `PubMed ESearch query: "${condition}" AND "guideline"[pt]`,
    };
  }

  /** Get appointment prep checklist per visit type. */
  getAppointmentPrep(
    visitType: 'new_diagnosis' | 'follow_up' | 'annual_physical' | 'specialist_referral',
    condition?: string,
  ) {
    const prep = this.apptChecklists[visitType] ?? this.apptChecklists.new_diagnosis;
    return {
      visit_type: visitType,
      condition: condition ?? null,
      checklist: prep.checklist,
      bring_list: prep.bring_list,
    };
  }
}
