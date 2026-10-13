/**
 * HealthBridge Tools Controller
 * ================================
 * All MCP tools — exact business logic port from Python FastMCP.
 *
 * Tools:
 *  1. log_patient_visit
 *  2. cross_hospital_safety_check
 *  3. medicine_availability_check
 *  4. followup_scheduler
 *  5. get_patient            ← lookup full patient record by ID or name
 */

import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  Injectable,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { HealthBridgeService, type Patient, type Visit } from './healthbridge.service';

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const MedicineSchema = z.object({
  name: z.string().describe('Medicine name (case-insensitive)'),
  dosage: z.string().describe('Dosage and frequency, e.g. "500mg twice daily"'),
});

// ── Controller ────────────────────────────────────────────────────────────────

@Controller()
@Injectable({ deps: [HealthBridgeService] })
export class HealthBridgeTools {
  constructor(private readonly svc: HealthBridgeService) {}

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 1 — log_patient_visit
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'log_patient_visit',
    description:
      'Record a new patient visit into the shared cross-hospital history. ' +
      'Creates the patient record if it does not exist. ' +
      "Merges any newly noted allergies into the patient's known-allergy list. " +
      'Accepts testsOrdered, optional patientName for new records, and a visitDate override.',
    inputSchema: z.object({
      patientId: z.string().describe('Unique patient identifier, e.g. "PAT-001"'),
      hospitalId: z.string().describe('Facility code, e.g. "HOSP-A"'),
      doctorName: z.string().describe('Full name of the attending physician'),
      diagnosis: z.string().describe('Primary clinical diagnosis for this visit'),
      prescribedMedicines: z
        .array(MedicineSchema)
        .optional()
        .default([])
        .describe('Medicines prescribed. Can be empty for observation-only visits.'),
      testsOrdered: z
        .array(z.string())
        .optional()
        .default([])
        .describe('Diagnostic tests ordered at this visit (e.g. ["ECG", "CBC"])'),
      allergiesNoted: z
        .array(z.string())
        .optional()
        .default([])
        .describe('Any new allergies observed during this visit'),
      notes: z.string().optional().describe('Free-text clinical notes'),
      patientName: z.string().optional().describe('Full name used only when creating a new patient record'),
      visitDate: z.string().optional().describe('ISO date override YYYY-MM-DD. Defaults to today.'),
    }),
  })
  async logPatientVisit(
    input: {
      patientId: string;
      hospitalId: string;
      doctorName: string;
      diagnosis: string;
      prescribedMedicines: Array<{ name: string; dosage: string }>;
      testsOrdered: string[];
      allergiesNoted: string[];
      notes?: string;
      patientName?: string;
      visitDate?: string;
    },
    _ctx: ExecutionContext,
  ) {
    const {
      patientId, hospitalId, doctorName, diagnosis,
      prescribedMedicines, testsOrdered, allergiesNoted,
      notes, patientName, visitDate,
    } = input;

    const warnings: string[] = [];
    const messages: string[] = [];
    if (!diagnosis.trim()) messages.push("'diagnosis' must not be empty.");
    for (const m of (prescribedMedicines ?? [])) {
      if (!m.name.trim()) messages.push('Each medicine must have a non-empty name.');
      if (!m.dosage.trim()) messages.push('Each medicine must have a non-empty dosage.');
    }
    // Validate visitDate if provided
    let resolvedDate = new Date().toISOString().slice(0, 10);
    if (visitDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
        messages.push(`'visitDate' must be YYYY-MM-DD format. Got: '${visitDate}'.`);
      } else {
        resolvedDate = visitDate;
      }
    }
    if (messages.length > 0) return { error: true, messages };

    // Resolve hospital — warn but don't block for unknown hospitals
    const facility = this.svc.getFacility(hospitalId);
    let hospitalName = facility?.hospitalName ?? hospitalId;
    if (!facility) {
      warnings.push(`Hospital '${hospitalId}' is not in the known facility network. Visit recorded but stock management unavailable.`);
    }

    let patient = this.svc.getPatient(patientId);
    const priorHospIds = new Set((patient?.visits ?? []).map((v) => v.hospitalId));
    const firstVisitAtThisHospital = !priorHospIds.has(hospitalId);

    const visitCount = (patient?.visits.length ?? 0) + 1;
    const visitId = `VIS-${patientId}-${String(visitCount).padStart(3, '0')}`;

    const newVisit: Visit = {
      visitId,
      hospitalId,
      hospitalName,
      doctorName: doctorName.trim(),
      date: resolvedDate,
      diagnosis: diagnosis.trim(),
      prescribedMedicines: (prescribedMedicines ?? []).map((m) => ({
        name: m.name.trim().toLowerCase(),
        dosage: m.dosage.trim(),
      })),
      testsOrdered: (testsOrdered ?? []).map((t) => t.trim()).filter(Boolean),
      allergiesNoted: (allergiesNoted ?? []).map((a) => a.toLowerCase().trim()).filter(Boolean),
      notes: notes?.trim(),
    };

    const newAllergiesMerged: string[] = [];
    if (patient) {
      const existingLower = new Set(patient.knownAllergies.map((a) => a.toLowerCase()));
      for (const a of (allergiesNoted ?? [])) {
        const al = a.toLowerCase().trim();
        if (al && !existingLower.has(al)) {
          patient.knownAllergies.push(al);
          existingLower.add(al);
          newAllergiesMerged.push(al);
        }
      }
      patient.visits.push(newVisit);
    } else {
      const initAllergies = (allergiesNoted ?? []).map((a) => a.toLowerCase().trim()).filter(Boolean);
      patient = {
        patientId,
        name: patientName?.trim() || `Unknown (${patientId})`,
        dateOfBirth: 'unknown',
        knownAllergies: initAllergies,
        visits: [newVisit],
      } as Patient;
      newAllergiesMerged.push(...initAllergies);
    }
    this.svc.upsertPatient(patient);

    const result: Record<string, unknown> = {
      visitId,
      recordedToHistory: true,
      firstVisitAtThisHospital,
      newAllergiesMerged,
    };
    if (warnings.length) result.warnings = warnings;
    return result;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 2 — cross_hospital_safety_check
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'cross_hospital_safety_check',
    description:
      "Scan a patient's entire cross-hospital history for safety conflicts with a proposed new prescription. " +
      'Detects: (A) drug-drug interactions vs history, (B) intra-prescription drug-drug conflicts, ' +
      '(C) allergy conflicts with mapping + direct name match, (D) duplicate cross-hospital tests. ' +
      'Returns conflicts with subtypes, a summary breakdown, conflictCount, and overall riskLevel.',
    inputSchema: z.object({
      patientId: z.string().describe('Patient identifier'),
      newPrescription: z
        .array(MedicineSchema)
        .min(1)
        .describe("New medicines to check against the patient's full history"),
      duplicateTestWindowDays: z
        .number().int().optional().default(14)
        .describe('Days window for duplicate test detection (default: 14)'),
    }),
  })
  async crossHospitalSafetyCheck(
    input: { patientId: string; newPrescription: Array<{ name: string; dosage: string }>; duplicateTestWindowDays?: number },
    _ctx: ExecutionContext,
  ) {
    const { patientId, newPrescription, duplicateTestWindowDays = 14 } = input;

    if (!this.svc.hasPatient(patientId)) {
      return { error: true, message: `Patient '${patientId}' not found.` };
    }

    const patient = this.svc.getPatient(patientId)!;
    const newMeds = newPrescription.map((m) => m.name.toLowerCase().trim());

    type Severity = 'high' | 'caution';
    const conflicts: Array<{
      type: string; subtype: string;
      sourceHospital: string; sourceDate: string;
      detail: string; _severity: Severity;
    }> = [];

    // ── A: Drug-drug interactions — new meds vs historical meds ────────────
    const existingMeds: Map<string, Visit> = new Map();
    for (const visit of patient.visits) {
      for (const med of visit.prescribedMedicines) {
        existingMeds.set(med.name.toLowerCase().trim(), visit);
      }
    }
    for (const newMed of newMeds) {
      for (const [existingMed, sourceVisit] of existingMeds.entries()) {
        if (newMed === existingMed) continue; // skip self
        const interaction = this.svc.getDrugInteraction(newMed, existingMed);
        if (interaction) {
          conflicts.push({
            type: 'drug_interaction', subtype: 'history_vs_new',
            sourceHospital: sourceVisit.hospitalName, sourceDate: sourceVisit.date,
            detail: interaction.detail, _severity: interaction.severity,
          });
        }
      }
    }

    // ── B: Intra-prescription drug-drug conflicts (NEW) ────────────────────
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < newMeds.length; i++) {
      for (let j = i + 1; j < newMeds.length; j++) {
        const interaction = this.svc.getDrugInteraction(newMeds[i], newMeds[j]);
        if (interaction) {
          conflicts.push({
            type: 'drug_interaction', subtype: 'intra_prescription',
            sourceHospital: 'Current prescription', sourceDate: today,
            detail: `Conflict within this prescription: ${interaction.detail}`,
            _severity: interaction.severity,
          });
        }
      }
    }

    // ── C: Allergy conflicts — mapping + direct name match ─────────────────
    const allergySource: Map<string, Visit> = new Map();
    for (const visit of patient.visits) {
      for (const allergy of visit.allergiesNoted) {
        const al = allergy.toLowerCase().trim();
        if (al && !allergySource.has(al)) allergySource.set(al, visit);
      }
    }
    const knownAllergies = patient.knownAllergies.map((a) => a.toLowerCase().trim());
    for (const newMed of newMeds) {
      for (const allergy of knownAllergies) {
        const src = allergySource.get(allergy);
        const mapping = this.svc.getAllergyMapping(allergy);
        if (mapping && mapping.contraindicated.includes(newMed)) {
          conflicts.push({
            type: 'allergy', subtype: 'mapping_match',
            sourceHospital: src?.hospitalName ?? 'Prior record',
            sourceDate: src?.date ?? 'Unknown',
            detail: mapping.detail, _severity: 'high' as const,
          });
        } else if (allergy === newMed) {
          // Direct name match — allergy name == medicine name
          conflicts.push({
            type: 'allergy', subtype: 'direct_name_match',
            sourceHospital: src?.hospitalName ?? 'Prior record',
            sourceDate: src?.date ?? 'Unknown',
            detail: `Patient has a documented allergy to '${allergy}' and this exact drug is in the new prescription.`,
            _severity: 'high' as const,
          });
        }
      }
    }

    // ── D: Duplicate tests — configurable window ───────────────────────────
    interface TestEntry { test: string; hosp: string; date: string; }
    const testVisits: TestEntry[] = [];
    for (const visit of patient.visits) {
      for (const test of visit.testsOrdered) {
        testVisits.push({ test: test.toLowerCase().trim(), hosp: visit.hospitalName, date: visit.date });
      }
    }
    const seen = new Set<string>();
    for (let i = 0; i < testVisits.length; i++) {
      for (let j = i + 1; j < testVisits.length; j++) {
        const a = testVisits[i], b = testVisits[j];
        if (a.test !== b.test || a.hosp === b.hosp) continue;
        const da = new Date(a.date), db = new Date(b.date);
        const delta = Math.abs((db.getTime() - da.getTime()) / 86_400_000);
        if (delta <= duplicateTestWindowDays) {
          const [earlier, later] = da <= db ? [a, b] : [b, a];
          const key = `${a.test}|${earlier.date}|${earlier.hosp}`;
          if (!seen.has(key)) {
            seen.add(key);
            conflicts.push({
              type: 'duplicate_test', subtype: 'cross_hospital',
              sourceHospital: earlier.hosp, sourceDate: earlier.date,
              detail: `Test '${a.test.replace(/\b\w/g, (c) => c.toUpperCase())}' also ordered at ${later.hosp} on ${later.date} (${Math.round(delta)} days apart, window: ${duplicateTestWindowDays} days).`,
              _severity: 'caution' as const,
            });
          }
        }
      }
    }

    // Compute riskLevel and summary
    let riskLevel: 'none' | 'caution' | 'high' = 'none';
    const summary = { high: 0, caution: 0, duplicateTests: 0 };
    for (const c of conflicts) {
      if (c._severity === 'high') { riskLevel = 'high'; summary.high++; }
      else if (c._severity === 'caution') { if (riskLevel !== 'high') riskLevel = 'caution'; summary.caution++; }
      if (c.type === 'duplicate_test') summary.duplicateTests++;
    }
    this.svc.setSessionRisk(patientId, riskLevel);

    const cleanConflicts = conflicts.map(({ _severity: _s, ...rest }) => rest);
    return { conflicts: cleanConflicts, conflictCount: cleanConflicts.length, summary, riskLevel };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 3 — medicine_availability_check
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'medicine_availability_check',
    description:
      'Check local stock for a medicine at a given hospital. ' +
      'Reroutes to the sister facility with the MOST stock (not alphabetically). ' +
      'Returns localStockBefore/After, shortfall, rerouteFacilityId, and allFacilitiesSnapshot on replenishment.',
    inputSchema: z.object({
      hospitalId: z.string().describe('Requesting facility code, e.g. "HOSP-A"'),
      medicine: z.string().describe('Medicine name (case-insensitive)'),
      quantity: z.number().int().positive().describe('Units required (must be > 0)'),
    }),
  })
  async medicineAvailabilityCheck(
    input: { hospitalId: string; medicine: string; quantity: number },
    _ctx: ExecutionContext,
  ) {
    const { hospitalId, medicine, quantity } = input;

    if (!this.svc.hasFacility(hospitalId)) {
      return { error: true, message: `Facility '${hospitalId}' not found in the network.` };
    }
    if (!medicine || !medicine.trim()) {
      return { error: true, message: "'medicine' is required and must be a non-empty string." };
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { error: true, message: "'quantity' must be a positive integer greater than 0." };
    }

    const medKey = medicine.toLowerCase().trim();
    const local = this.svc.getFacility(hospitalId)!;
    const localStockBefore = local.stock[medKey] ?? 0;

    if (localStockBefore >= quantity) {
      this.svc.decrementStock(hospitalId, medKey, quantity);
      return {
        availableLocally: true,
        action: 'dispense',
        rerouteFacility: null,
        rerouteFacilityId: null,
        notificationSent: false,
        localStockBefore,
        localStockAfter: localStockBefore - quantity,
        shortfall: null,
        allFacilitiesSnapshot: null,
      };
    }

    const shortfall = quantity - localStockBefore;

    // Sort sister facilities by stock quantity DESC — most stock first
    const others = this.svc
      .getAllFacilities()
      .filter((f) => f.hospitalId !== hospitalId)
      .sort((a, b) => (b.stock[medKey] ?? 0) - (a.stock[medKey] ?? 0));

    for (const sister of others) {
      const sisterQty = sister.stock[medKey] ?? 0;
      if (sisterQty >= quantity) {
        return {
          availableLocally: false,
          action: 'reroute',
          rerouteFacility: sister.hospitalName,
          rerouteFacilityId: sister.hospitalId,
          notificationSent: true,
          localStockBefore,
          localStockAfter: null,
          shortfall,
          allFacilitiesSnapshot: null,
        };
      }
    }

    // Replenishment — include full network snapshot
    const allFacilitiesSnapshot = Object.fromEntries(
      this.svc.getAllFacilities().map((f) => [
        f.hospitalId,
        { hospitalName: f.hospitalName, [`stockOf_${medKey}`]: f.stock[medKey] ?? 0 },
      ]),
    );
    return {
      availableLocally: false,
      action: 'replenish_requested',
      rerouteFacility: null,
      rerouteFacilityId: null,
      notificationSent: true,
      localStockBefore,
      localStockAfter: null,
      shortfall,
      allFacilitiesSnapshot,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 4 — followup_scheduler
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'followup_scheduler',
    description:
      'Assign a follow-up urgency tier and recommended timeframe for a patient. ' +
      'Fixes self-escalation bug: excludes the most recent visit from the 90-day recurrence check. ' +
      'Returns followupDate, structured escalationReasons list, and escalatedBy array.',
    inputSchema: z.object({
      patientId: z.string().describe('Patient identifier'),
      diagnosis: z.string().describe('Diagnosis from the current visit'),
      severity: z
        .enum(['mild', 'moderate', 'severe'])
        .describe('Clinical severity: mild | moderate | severe'),
    }),
  })
  async followupScheduler(
    input: { patientId: string; diagnosis: string; severity: string },
    _ctx: ExecutionContext,
  ) {
    const { patientId, diagnosis, severity } = input;

    if (!this.svc.hasPatient(patientId)) {
      return { error: true, message: `Patient '${patientId}' not found.` };
    }
    if (!diagnosis.trim()) {
      return { error: true, message: "'diagnosis' required." };
    }

    const sevLower = severity.toLowerCase().trim() as 'mild' | 'moderate' | 'severe';
    const BASE: Record<string, [string, number, boolean]> = {
      mild:     ['Routine', 30, false],
      moderate: ['Soon',     7, true],
      severe:   ['Urgent',   3, true],
    };
    if (!(sevLower in BASE)) {
      return { error: true, message: `'severity' must be mild/moderate/severe. Got: '${severity}'.` };
    }
    const ESCALATION: Record<string, [string, number]> = {
      Routine: ['Soon',   14],
      Soon:    ['Urgent',  3],
      Urgent:  ['Urgent',  3],
    };

    let [tier, days, doctorNotified] = BASE[sevLower];
    const escalationReasons: string[] = [];
    const escalatedBy: string[] = [];

    const patient = this.svc.getPatient(patientId)!;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    // Self-escalation fix: exclude the MOST RECENT visit from the recurrence scan.
    // This prevents a freshly-logged encounter from immediately triggering escalation.
    const visitsToScan = patient.visits.length > 1 ? patient.visits.slice(0, -1) : [];

    let recurringVisit: (typeof patient.visits)[0] | null = null;
    for (const visit of visitsToScan) {
      const vd = new Date(visit.date);
      if (vd >= cutoff && visit.diagnosis.toLowerCase() === diagnosis.toLowerCase()) {
        if (!recurringVisit || vd > new Date(recurringVisit.date)) recurringVisit = visit;
      }
    }

    if (recurringVisit) {
      const oldTier = tier;
      [tier, days] = ESCALATION[tier];
      doctorNotified = true;
      escalatedBy.push('recurrence');
      escalationReasons.push(
        `Same diagnosis ('${diagnosis}') recorded at ${recurringVisit.hospitalName} ` +
        `on ${recurringVisit.date}, within 90 days — escalated from ${oldTier} to ${tier}.`,
      );
    }

    const sessionRisk = this.svc.getSessionRisk(patientId);
    if (sessionRisk === 'high') {
      const oldTier = tier;
      const [newTier, newDays] = ESCALATION[tier];
      doctorNotified = true;
      escalatedBy.push('high_risk');
      if (newTier !== oldTier) {
        tier = newTier; days = newDays;
        escalationReasons.push(`Cross-hospital safety check flagged HIGH risk — escalated from ${oldTier} to ${tier}.`);
      } else {
        escalationReasons.push(`Cross-hospital safety check flagged HIGH risk. Tier already at maximum (${tier}).`);
      }
    }

    if (escalationReasons.length === 0) {
      if (sevLower === 'severe') escalationReasons.push(`Urgent follow-up within ${days} days required. Doctor notified.`);
      else if (sevLower === 'moderate') escalationReasons.push(`Follow-up within ${days} days recommended. Doctor notified.`);
      else escalationReasons.push(`Routine follow-up in ${days} days. No immediate escalation required.`);
    }

    // Compute followupDate
    const followupDate = new Date();
    followupDate.setDate(followupDate.getDate() + days);
    const followupDateStr = followupDate.toISOString().slice(0, 10);

    return {
      urgencyTier: tier,
      recommendedFollowupDays: days,
      followupDate: followupDateStr,
      doctorNotified,
      reason: `Severity is ${sevLower} (${diagnosis.trim()}). ` + escalationReasons.join(' '),
      escalationReasons,
      escalatedBy,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 5 — get_patient
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_patient',
    description:
      'Retrieve the complete patient record — including all visits, diagnoses, prescribed ' +
      'medicines, tests ordered, allergies, and clinical notes — for a specific patient. ' +
      'Search by patientId (e.g. "PAT-001") OR by name (case-insensitive, partial match allowed). ' +
      'If multiple patients match the name query, all matches are returned as a summary list.',
    inputSchema: z.object({
      patientId: z
        .string()
        .optional()
        .describe('Exact patient ID, e.g. "PAT-001". Takes priority over name search.'),
      name: z
        .string()
        .optional()
        .describe('Patient name or partial name (case-insensitive). Used when patientId is absent.'),
    }),
  })
  async getPatient(
    input: { patientId?: string; name?: string },
    _ctx: ExecutionContext,
  ) {
    const { patientId, name } = input;

    if (!patientId && !name) {
      return { error: true, message: "Provide either 'patientId' or 'name' to look up a patient." };
    }

    // ── Lookup by ID (exact) ─────────────────────────────────────────────────
    if (patientId) {
      const patient = this.svc.getPatient(patientId);
      if (!patient) {
        return { error: true, message: `Patient '${patientId}' not found.` };
      }
      return { found: 1, patient };
    }

    // ── Lookup by name (partial, case-insensitive) ───────────────────────────
    const query = name!.toLowerCase().trim();
    const matches = this.svc
      .getAllPatients()
      .filter((p) => p.name.toLowerCase().includes(query));

    if (matches.length === 0) {
      return { error: true, message: `No patient found matching name '${name}'.` };
    }

    // If exactly one match, return the full record
    if (matches.length === 1) {
      return { found: 1, patient: matches[0] };
    }

    // Multiple matches — return summaries so the LLM can narrow down
    return {
      found: matches.length,
      message: 'Multiple patients matched. Use patientId for a precise lookup.',
      matches: matches.map((p) => ({
        patientId: p.patientId,
        name: p.name,
        dateOfBirth: p.dateOfBirth,
        knownAllergies: p.knownAllergies,
        visitCount: p.visits.length,
      })),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 6 — list_hospitals
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'list_hospitals',
    description:
      'List all hospitals (facilities) in the HealthBridge network. ' +
      "Returns each hospital's ID, name, and current medicine stock levels. " +
      "Use this to answer: 'how many hospitals are there?', 'what facilities are available?', " +
      "'what medicines does HOSP-A stock?'",
    inputSchema: z.object({}),
  })
  async listHospitals(_input: Record<string, never>, _ctx: ExecutionContext) {
    const hospitals = this.svc.getAllFacilities().map((f) => ({
      hospitalId: f.hospitalId,
      hospitalName: f.hospitalName,
      stockedMedicines: Object.fromEntries(
        Object.entries(f.stock).filter(([, qty]) => qty > 0),
      ),
      outOfStock: Object.entries(f.stock)
        .filter(([, qty]) => qty === 0)
        .map(([med]) => med),
    }));
    return { totalHospitals: hospitals.length, hospitals };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 7 — get_patient_stats
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_patient_stats',
    description:
      'Return aggregate statistics across all patients in the HealthBridge network. ' +
      "Use this to answer: 'how many patients have allergies?', " +
      "'what is the most common diagnosis?', 'how many total visits have been recorded?', " +
      "'which hospital has the most visits?', 'what are the most prescribed medicines?'",
    inputSchema: z.object({}),
  })
  async getPatientStats(_input: Record<string, never>, _ctx: ExecutionContext) {
    const allPatients = this.svc.getAllPatients();
    const totalPatients = allPatients.length;
    const patientsWithAllergies = allPatients.filter((p) => p.knownAllergies.length > 0).length;

    const diagnosisCounts = new Map<string, number>();
    const medicineCounts = new Map<string, number>();
    const hospitalCounts = new Map<string, number>();
    const allergyCounts = new Map<string, number>();
    let totalVisits = 0;

    for (const p of allPatients) {
      for (const a of p.knownAllergies) {
        allergyCounts.set(a.toLowerCase(), (allergyCounts.get(a.toLowerCase()) ?? 0) + 1);
      }
      for (const v of p.visits) {
        totalVisits++;
        diagnosisCounts.set(v.diagnosis, (diagnosisCounts.get(v.diagnosis) ?? 0) + 1);
        hospitalCounts.set(v.hospitalName, (hospitalCounts.get(v.hospitalName) ?? 0) + 1);
        for (const m of v.prescribedMedicines) {
          const key = m.name.toLowerCase();
          medicineCounts.set(key, (medicineCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const top = <T>(map: Map<T, number>, n = 10) =>
      [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, v]);

    return {
      totalPatients,
      patientsWithAllergies,
      patientsWithNoAllergies: totalPatients - patientsWithAllergies,
      totalVisitsRecorded: totalVisits,
      averageVisitsPerPatient: totalPatients ? Math.round((totalVisits / totalPatients) * 100) / 100 : 0,
      topDiagnoses: top(diagnosisCounts),
      topPrescribedMedicines: top(medicineCounts),
      visitsByHospital: Object.fromEntries([...hospitalCounts.entries()].sort((a, b) => b[1] - a[1])),
      topAllergies: top(allergyCounts),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 8 — search_patients
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'search_patients',
    description:
      'Search and filter patients by one or more criteria. ' +
      'Returns lightweight summaries (patientId, name, DOB, allergies, visitCount). ' +
      "Use this to answer: 'which patients have a penicillin allergy?', " +
      "'which patients visited City General Hospital?', " +
      "'which patients were diagnosed with Hypertension?', " +
      "'which patients have more than 4 visits?'. " +
      'All filters are optional — provide only those you need.',
    inputSchema: z.object({
      hasAllergy: z.string().optional().describe('Filter patients who have this allergy (e.g. "penicillin")'),
      visitedHospitalId: z.string().optional().describe('Filter patients who visited this hospital ID (e.g. "HOSP-A")'),
      diagnosis: z.string().optional().describe('Filter patients who were diagnosed with this condition'),
      minVisits: z.number().int().optional().describe('Filter patients with at least this many visits'),
    }),
  })
  async searchPatients(
    input: { hasAllergy?: string; visitedHospitalId?: string; diagnosis?: string; minVisits?: number },
    _ctx: ExecutionContext,
  ) {
    const { hasAllergy, visitedHospitalId, diagnosis, minVisits } = input;
    const results = this.svc.getAllPatients().filter((p) => {
      if (hasAllergy && !p.knownAllergies.map((a) => a.toLowerCase()).includes(hasAllergy.toLowerCase())) return false;
      if (visitedHospitalId && !p.visits.some((v) => v.hospitalId.toUpperCase() === visitedHospitalId.toUpperCase())) return false;
      if (diagnosis && !p.visits.some((v) => v.diagnosis.toLowerCase() === diagnosis.toLowerCase())) return false;
      if (minVisits !== undefined && p.visits.length < minVisits) return false;
      return true;
    });

    return {
      matchedPatients: results.length,
      patients: results.map((p) => ({
        patientId: p.patientId,
        name: p.name,
        dateOfBirth: p.dateOfBirth,
        knownAllergies: p.knownAllergies,
        visitCount: p.visits.length,
      })),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 9 — get_patient_visits
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_patient_visits',
    description:
      'Get a structured, visit-by-visit breakdown for a specific patient. ' +
      'For each visit shows: hospital, date, doctor, diagnosis, all prescribed medicines ' +
      'with dosages, tests ordered, allergies noted, and clinical notes. ' +
      "Also returns which hospitals the patient has attended. " +
      "Use this to answer: 'what hospitals has patient X visited?', " +
      "'what was prescribed at each visit?', 'list all visits of patient X', " +
      "'what tests has patient X had?'. " +
      'Accepts either patientId (exact) or name (partial, case-insensitive).',
    inputSchema: z.object({
      patientId: z.string().optional().describe('Exact patient ID, e.g. "PAT-001"'),
      name: z.string().optional().describe('Patient name or partial name (case-insensitive)'),
    }),
  })
  async getPatientVisits(
    input: { patientId?: string; name?: string },
    _ctx: ExecutionContext,
  ) {
    const { patientId, name } = input;
    if (!patientId && !name) {
      return { error: true, message: "Provide either 'patientId' or 'name'." };
    }

    let patient = patientId
      ? this.svc.getPatient(patientId)
      : undefined;

    if (!patient && name) {
      const query = name.toLowerCase().trim();
      const matches = this.svc.getAllPatients().filter((p) => p.name.toLowerCase().includes(query));
      if (matches.length === 0) return { error: true, message: `No patient found matching name '${name}'.` };
      if (matches.length > 1) {
        return {
          error: true,
          message: 'Multiple patients matched — please specify patientId.',
          matches: matches.map((p) => ({ patientId: p.patientId, name: p.name })),
        };
      }
      patient = matches[0];
    }

    if (!patient) return { error: true, message: `Patient '${patientId}' not found.` };

    const hospitalMap = new Map<string, string>();
    for (const v of patient.visits) hospitalMap.set(v.hospitalId, v.hospitalName);

    return {
      patientId: patient.patientId,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      knownAllergies: patient.knownAllergies,
      totalVisits: patient.visits.length,
      hospitalsVisited: [...hospitalMap.entries()].map(([hid, hname]) => ({
        hospitalId: hid,
        hospitalName: hname,
      })),
      visits: patient.visits.map((v) => ({
        visitId: v.visitId,
        date: v.date,
        hospital: v.hospitalName,
        hospitalId: v.hospitalId,
        doctor: v.doctorName,
        diagnosis: v.diagnosis,
        prescribedMedicines: v.prescribedMedicines,
        testsOrdered: v.testsOrdered,
        allergiesNoted: v.allergiesNoted,
        notes: v.notes ?? '',
      })),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 10 — get_upcoming_followups  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_upcoming_followups',
    description:
      "Query all scheduled patient follow-ups within the next N days. " +
      "Answers: 'how many patients have a follow-up this week?', " +
      "'which Urgent patients need a call in the next 3 days?', 'who has a follow-up scheduled?'. " +
      "Also returns overdue follow-ups. Populated when followup_scheduler or simulate_workflow is called.",
    inputSchema: z.object({
      days: z.number().int().optional().default(7).describe('Look-ahead window in days (default: 7)'),
      urgencyTier: z.string().optional().describe('Filter by tier: Routine | Soon | Urgent'),
    }),
  })
  async getUpcomingFollowups(input: { days?: number; urgencyTier?: string }, _ctx: ExecutionContext) {
    const days = input.days ?? 7;
    const today = this.svc.today();
    const cutoff = this.svc.addDays(days);
    const all = this.svc.getAllFollowups();
    const upcoming: object[] = [];
    const overdue: object[] = [];
    for (const fu of all) {
      if (input.urgencyTier && fu.urgencyTier.toLowerCase() !== input.urgencyTier.toLowerCase()) continue;
      if (fu.followupDate < today) overdue.push(fu);
      else if (fu.followupDate <= cutoff) upcoming.push(fu);
    }
    return { queryWindowDays: days, upcomingCount: upcoming.length, overdueCount: overdue.length, upcoming, overdue };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 11 — cancel_followup  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'cancel_followup',
    description:
      "Cancel a scheduled follow-up for a patient. " +
      "Answers: 'cancel the follow-up for PAT-001', 'remove PAT-007 scheduled follow-up'.",
    inputSchema: z.object({
      patientId: z.string().describe('Patient identifier'),
      reason: z.string().optional().default('Cancelled by clinician'),
    }),
  })
  async cancelFollowup(input: { patientId: string; reason?: string }, _ctx: ExecutionContext) {
    const removed = this.svc.deleteFollowup(input.patientId);
    if (!removed) return { error: true, message: `No scheduled follow-up found for patient '${input.patientId}'.` };
    this.svc.addAudit({ tool: 'cancel_followup', patientId: input.patientId, inputSummary: `patientId=${input.patientId}`, outputSummary: `cancelled follow-up for ${removed.followupDate}` });
    return { cancelled: true, patientId: input.patientId, wasScheduledFor: removed.followupDate, urgencyTier: removed.urgencyTier, reason: input.reason ?? 'Cancelled by clinician' };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 12 — get_notifications  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_notifications',
    description:
      "Query the HealthBridge notification log for reroutes, replenishments, and safety alerts. " +
      "Answers: 'what replenishment requests are pending?', 'what reroutes happened today?'.",
    inputSchema: z.object({
      typeFilter: z.enum(['reroute', 'replenishment', 'safety_alert']).optional(),
      resolved: z.boolean().optional(),
      limit: z.number().int().optional().default(50),
    }),
  })
  async getNotifications(input: { typeFilter?: string; resolved?: boolean; limit?: number }, _ctx: ExecutionContext) {
    const limit = input.limit ?? 50;
    let results = this.svc.getNotifications();
    if (input.typeFilter) results = results.filter((n) => n.type === input.typeFilter);
    if (input.resolved !== undefined) results = results.filter((n) => n.resolved === input.resolved);
    results = results.slice(-limit).reverse();
    return { total: results.length, filters: { type: input.typeFilter, resolved: input.resolved }, notifications: results };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 13 — get_audit_log  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_audit_log',
    description:
      "Query the full audit trail of all tool calls. " +
      "Answers: 'show me everything that happened to PAT-001 today', 'which tools were called most recently?'",
    inputSchema: z.object({
      patientId: z.string().optional(),
      toolName: z.string().optional(),
      limit: z.number().int().optional().default(50),
    }),
  })
  async getAuditLog(input: { patientId?: string; toolName?: string; limit?: number }, _ctx: ExecutionContext) {
    const limit = input.limit ?? 50;
    let results = this.svc.getAuditLog();
    if (input.patientId) results = results.filter((e) => e.patientId === input.patientId);
    if (input.toolName) results = results.filter((e) => e.tool === input.toolName);
    results = results.slice(-limit).reverse();
    return { totalEvents: results.length, events: results };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 14 — risk_dashboard  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'risk_dashboard',
    description:
      "Network-wide risk snapshot — the perfect demo opener. " +
      "Returns total patients, allergies, pending replenishments, overdue follow-ups, recent safety alerts, stock health. " +
      "Answers: 'show me the HealthBridge risk dashboard', 'give me a network overview', 'how many urgent follow-ups?'",
    inputSchema: z.object({}),
  })
  async riskDashboard(_input: Record<string, never>, _ctx: ExecutionContext) {
    const all = this.svc.getAllPatients();
    const withAllergies = all.filter((p) => p.knownAllergies.length > 0).length;
    const totalVisits = all.reduce((s, p) => s + p.visits.length, 0);
    const today = this.svc.today();
    const in7 = this.svc.addDays(7);
    const allFollowups = this.svc.getAllFollowups();
    const overdue = allFollowups.filter((f) => f.followupDate < today);
    const upcoming7 = allFollowups.filter((f) => f.followupDate >= today && f.followupDate <= in7);
    const urgentUpcoming = upcoming7.filter((f) => f.urgencyTier === 'Urgent');
    const allNotifs = this.svc.getNotifications();
    const stockHealth: Record<string, object> = {};
    for (const fac of this.svc.getAllFacilities()) {
      const items = Object.entries(fac.stock);
      const oos = items.filter(([, v]) => v === 0).length;
      const low = items.filter(([, v]) => v > 0 && v < 20).length;
      stockHealth[fac.hospitalId] = {
        hospitalName: fac.hospitalName,
        status: oos > items.length * 0.5 ? 'critical' : low > items.length * 0.3 ? 'low' : 'ok',
        outOfStockItems: oos,
        lowStockItems: low,
      };
    }
    return {
      generatedAt: this.svc.nowIso(),
      networkSummary: {
        totalPatients: all.length,
        patientsWithKnownAllergies: withAllergies,
        totalVisitsRecorded: totalVisits,
        knownDrugInteractions: this.svc.getDrugInteractionCount(),
        knownAllergyMappings: this.svc.getAllergyMappingCount(),
      },
      followupStatus: {
        totalScheduled: allFollowups.length,
        overdueCount: overdue.length,
        urgentInNext7Days: urgentUpcoming.length,
        totalInNext7Days: upcoming7.length,
        overdue: overdue.slice(0, 5),
        urgentUpcoming: urgentUpcoming.slice(0, 5),
      },
      notificationStatus: {
        pendingReplenishments: allNotifs.filter((n) => n.type === 'replenishment' && !n.resolved).length,
        pendingReroutes: allNotifs.filter((n) => n.type === 'reroute' && !n.resolved).length,
        recentSafetyAlerts: allNotifs.filter((n) => n.type === 'safety_alert').slice(-5).reverse(),
      },
      hospitalStockHealth: stockHealth,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 15 — patient_risk_profile  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'patient_risk_profile',
    description:
      "Generate a comprehensive risk report for a single patient. Combines allergies, medications, pending follow-up, session risk, and duplicate tests. " +
      "Answers: 'give me the full risk profile for Rahul Desai', 'is PAT-005 high risk?'",
    inputSchema: z.object({
      patientId: z.string().optional().describe('Exact patient ID'),
      name: z.string().optional().describe('Patient name (partial, case-insensitive)'),
    }),
  })
  async patientRiskProfile(input: { patientId?: string; name?: string }, _ctx: ExecutionContext) {
    let patient = input.patientId ? this.svc.getPatient(input.patientId) : undefined;
    if (!patient && input.name) {
      const q = input.name.toLowerCase().trim();
      const matches = this.svc.getAllPatients().filter((p) => p.name.toLowerCase().includes(q));
      if (!matches.length) return { error: true, message: `No patient found matching '${input.name}'.` };
      if (matches.length > 1) return { error: true, message: 'Multiple patients matched. Use patientId.', matches: matches.map((p) => ({ patientId: p.patientId, name: p.name })) };
      patient = matches[0];
    }
    if (!patient) return { error: true, message: "Provide 'patientId' or 'name'." };
    const pid = patient.patientId;
    const activeMedsByHosp: Record<string, object> = {};
    for (const v of patient.visits) {
      activeMedsByHosp[v.hospitalId] = { hospitalName: v.hospitalName, date: v.date, medicines: v.prescribedMedicines };
    }
    const allActiveMeds = [...new Set(patient.visits.flatMap((v) => v.prescribedMedicines.map((m) => m.name.toLowerCase())))];
    const allergySourceMap: Record<string, object> = {};
    for (const v of patient.visits) {
      for (const a of v.allergiesNoted) {
        const al = a.toLowerCase();
        if (al && !allergySourceMap[al]) allergySourceMap[al] = { firstNotedAt: v.hospitalName, date: v.date };
      }
    }
    const testEntries = patient.visits.flatMap((v) => v.testsOrdered.map((t) => ({ test: t.toLowerCase(), hosp: v.hospitalName, date: v.date })));
    const dupTests: object[] = [];
    const seenPairs = new Set<string>();
    for (let i = 0; i < testEntries.length; i++) {
      for (let j = i + 1; j < testEntries.length; j++) {
        const a = testEntries[i], b = testEntries[j];
        if (a.test !== b.test || a.hosp === b.hosp) continue;
        const delta = Math.abs((new Date(a.date).getTime() - new Date(b.date).getTime()) / 86_400_000);
        if (delta <= 90) {
          const key = `${a.test}|${[a.date, b.date].sort().join('|')}`;
          if (!seenPairs.has(key)) {
            seenPairs.add(key);
            dupTests.push({ test: a.test, hospital1: a.hosp, date1: a.date, hospital2: b.hosp, date2: b.date, daysApart: Math.round(delta) });
          }
        }
      }
    }
    const cut90 = new Date(); cut90.setDate(cut90.getDate() - 90);
    const recentHospIds = new Set(patient.visits.filter((v) => new Date(v.date) >= cut90).map((v) => v.hospitalId));
    const pendingFollowup = this.svc.getFollowup(pid);
    const sessionRisk = this.svc.getSessionRisk(pid);
    const riskFactors: string[] = [];
    if (sessionRisk === 'high') riskFactors.push('HIGH safety check result in current session');
    if (patient.knownAllergies.length > 0) riskFactors.push(`${patient.knownAllergies.length} known allerg${patient.knownAllergies.length === 1 ? 'y' : 'ies'}`);
    if (recentHospIds.size > 1) riskFactors.push(`Visited ${recentHospIds.size} hospitals in last 90 days`);
    if (dupTests.length) riskFactors.push(`${dupTests.length} duplicate test(s) detected`);
    if (pendingFollowup?.urgencyTier === 'Urgent') riskFactors.push('Pending URGENT follow-up');
    const overallRisk = sessionRisk === 'high' || pendingFollowup?.urgencyTier === 'Urgent' ? 'high' : riskFactors.length >= 2 ? 'moderate' : 'low';
    return {
      patientId: pid, name: patient.name, dateOfBirth: patient.dateOfBirth,
      overallRisk, riskFactors, sessionRiskLevel: sessionRisk,
      knownAllergies: patient.knownAllergies.map((a) => ({ allergy: a, ...(allergySourceMap[a] ?? {}) })),
      activeMedicationsByHospital: activeMedsByHosp,
      allActiveMedications: allActiveMeds,
      totalVisits: patient.visits.length,
      hospitalsVisitedLast90Days: [...recentHospIds],
      duplicateTestsDetected: dupTests,
      pendingFollowup: pendingFollowup ?? null,
      generatedAt: this.svc.nowIso(),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 16 — bulk_safety_scan  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'bulk_safety_scan',
    description:
      "Run a network-wide safety scan across ALL patients. Checks for drug interactions and allergy conflicts. " +
      "Answers: 'run a network-wide safety scan', 'which patients are at risk?', 'how many of 300 patients have drug interaction risks?'",
    inputSchema: z.object({
      severityFilter: z.enum(['all', 'high', 'caution']).optional().default('all'),
      hospitalId: z.string().optional().describe('Limit scan to patients who visited a specific hospital'),
    }),
  })
  async bulkSafetyScan(input: { severityFilter?: string; hospitalId?: string }, _ctx: ExecutionContext) {
    const sevFilter = input.severityFilter ?? 'all';
    const highRisk: object[] = [], cautionRisk: object[] = [];
    let totalScanned = 0;
    for (const p of this.svc.getAllPatients()) {
      if (input.hospitalId && !p.visits.some((v) => v.hospitalId.toUpperCase() === input.hospitalId!.toUpperCase())) continue;
      totalScanned++;
      const allMeds = [...new Set(p.visits.flatMap((v) => v.prescribedMedicines.map((m) => m.name.toLowerCase())))];
      const conflicts: object[] = [];
      for (let i = 0; i < allMeds.length; i++) {
        for (let j = i + 1; j < allMeds.length; j++) {
          const ix = this.svc.getDrugInteraction(allMeds[i], allMeds[j]);
          if (ix) conflicts.push({ drug1: allMeds[i], drug2: allMeds[j], severity: ix.severity, detail: ix.detail });
        }
      }
      for (const al of p.knownAllergies.map((a) => a.toLowerCase())) {
        const mp = this.svc.getAllergyMapping(al);
        if (mp) for (const med of allMeds) if (mp.contraindicated.includes(med)) conflicts.push({ drug1: med, drug2: `ALLERGY:${al}`, severity: 'high', detail: mp.detail });
      }
      if (!conflicts.length) continue;
      const entry = { patientId: p.patientId, name: p.name, conflictCount: conflicts.length, conflicts };
      if ((conflicts as any[]).some((c) => c.severity === 'high')) highRisk.push(entry); else cautionRisk.push(entry);
    }
    const results = (sevFilter === 'high' ? highRisk : sevFilter === 'caution' ? cautionRisk : [...highRisk, ...cautionRisk])
      .sort((a: any, b: any) => b.conflictCount - a.conflictCount);
    return { scannedPatients: totalScanned, patientsWithRisks: results.length, highRiskCount: highRisk.length, cautionRiskCount: cautionRisk.length, results, generatedAt: this.svc.nowIso() };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 17 — simulate_workflow  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'simulate_workflow',
    description:
      "Run the COMPLETE 4-step clinical workflow in one call: " +
      "Step 1 log visit, Step 2 safety check, Step 3 medicine stock, Step 4 schedule follow-up. " +
      "Perfect for demos. Example: 'simulate a full clinical workflow for PAT-001 at HOSP-B prescribing aspirin + warfarin'.",
    inputSchema: z.object({
      patientId: z.string(),
      hospitalId: z.string(),
      doctorName: z.string(),
      diagnosis: z.string(),
      severity: z.enum(['mild', 'moderate', 'severe']),
      prescribedMedicines: z.array(MedicineSchema),
      testsOrdered: z.array(z.string()).optional().default([]),
      allergiesNoted: z.array(z.string()).optional().default([]),
      notes: z.string().optional().default(''),
      checkStockMedicine: z.string().optional(),
      checkStockQuantity: z.number().int().optional().default(1),
    }),
  })
  async simulateWorkflow(
    input: {
      patientId: string; hospitalId: string; doctorName: string;
      diagnosis: string; severity: string;
      prescribedMedicines: Array<{ name: string; dosage: string }>;
      testsOrdered?: string[]; allergiesNoted?: string[]; notes?: string;
      checkStockMedicine?: string; checkStockQuantity?: number;
    },
    _ctx: ExecutionContext,
  ) {
    const {
      patientId, hospitalId, doctorName, diagnosis, severity,
      prescribedMedicines, testsOrdered = [], allergiesNoted = [],
      notes = '', checkStockMedicine, checkStockQuantity = 1,
    } = input;
    const facility = this.svc.getFacility(hospitalId);
    const hospitalName = facility?.hospitalName ?? hospitalId;
    const pipelineSteps: Record<string, object> = {};

    // ── Step 1: Log visit ─────────────────────────────────────────────────
    let patient = this.svc.getPatient(patientId) ?? { patientId, name: `Unknown (${patientId})`, dateOfBirth: 'unknown', knownAllergies: [], visits: [] } as Patient;
    const priorHospIds = new Set(patient.visits.map((v) => v.hospitalId));
    const visitId = `VIS-${patientId}-${String(patient.visits.length + 1).padStart(3, '0')}`;
    const today = this.svc.today();
    const newVisit: Visit = {
      visitId, hospitalId, hospitalName, doctorName, date: today, diagnosis,
      prescribedMedicines: prescribedMedicines.map((m) => ({ name: m.name.toLowerCase(), dosage: m.dosage })),
      testsOrdered, allergiesNoted: allergiesNoted.map((a) => a.toLowerCase()), notes,
    };
    patient.visits.push(newVisit);
    const newAllergies: string[] = [];
    const existingSet = new Set(patient.knownAllergies.map((a) => a.toLowerCase()));
    for (const a of allergiesNoted) {
      const al = a.toLowerCase().trim();
      if (al && !existingSet.has(al)) { patient.knownAllergies.push(al); existingSet.add(al); newAllergies.push(al); }
    }
    this.svc.upsertPatient(patient);
    pipelineSteps['step1_log_visit'] = { status: 'completed', visitId, firstVisitAtThisHospital: !priorHospIds.has(hospitalId), newAllergiesMerged: newAllergies };

    // ── Step 2: Safety check ──────────────────────────────────────────────
    const newMeds = prescribedMedicines.map((m) => m.name.toLowerCase().trim());
    const conflicts: object[] = [];
    const existingMeds = new Map<string, Visit>();
    for (const v of patient.visits.slice(0, -1)) {
      for (const m of v.prescribedMedicines) existingMeds.set(m.name.toLowerCase(), v);
    }
    for (const nm of newMeds) {
      for (const [em, sv] of existingMeds.entries()) {
        if (nm === em) continue;
        const ix = this.svc.getDrugInteraction(nm, em);
        if (ix) conflicts.push({ type: 'drug_interaction', subtype: 'history_vs_new', sourceHospital: sv.hospitalName, detail: ix.detail, severity: ix.severity });
      }
    }
    for (let i = 0; i < newMeds.length; i++) {
      for (let j = i + 1; j < newMeds.length; j++) {
        const ix = this.svc.getDrugInteraction(newMeds[i], newMeds[j]);
        if (ix) conflicts.push({ type: 'drug_interaction', subtype: 'intra_prescription', detail: ix.detail, severity: ix.severity });
      }
    }
    for (const nm of newMeds) {
      for (const al of patient.knownAllergies.map((a) => a.toLowerCase())) {
        const mp = this.svc.getAllergyMapping(al);
        if (mp && mp.contraindicated.includes(nm)) conflicts.push({ type: 'allergy', allergy: al, detail: mp.detail, severity: 'high' });
      }
    }
    const riskLevel: 'none' | 'caution' | 'high' = (conflicts as any[]).some((c) => c.severity === 'high') ? 'high' : conflicts.length > 0 ? 'caution' : 'none';
    this.svc.setSessionRisk(patientId, riskLevel);
    if (conflicts.length) {
      this.svc.addNotification({ type: 'safety_alert', hospitalId, hospitalName, detail: `${conflicts.length} conflict(s) for ${patient.name}: riskLevel=${riskLevel}`, patientId });
    }
    pipelineSteps['step2_safety_check'] = { status: 'completed', conflictCount: conflicts.length, conflicts, riskLevel };

    // ── Step 3: Stock check ───────────────────────────────────────────────
    let stockResult: object | string = 'skipped (no medicine specified)';
    if (checkStockMedicine && facility) {
      const medKey = checkStockMedicine.toLowerCase().trim();
      const localStock = facility.stock[medKey] ?? 0;
      if (localStock >= checkStockQuantity) {
        facility.stock[medKey] = localStock - checkStockQuantity;
        stockResult = { action: 'dispense', medicine: medKey, localStockBefore: localStock, localStockAfter: localStock - checkStockQuantity };
      } else {
        const others = this.svc.getAllFacilities().filter((f) => f.hospitalId !== hospitalId).sort((a, b) => (b.stock[medKey] ?? 0) - (a.stock[medKey] ?? 0));
        const reroute = others.find((f) => (f.stock[medKey] ?? 0) >= checkStockQuantity);
        if (reroute) {
          this.svc.addNotification({ type: 'reroute', hospitalId, hospitalName, detail: `Rerouting ${medKey} to ${reroute.hospitalName}`, medicine: medKey });
          stockResult = { action: 'reroute', medicine: medKey, rerouteFacility: reroute.hospitalName, rerouteFacilityId: reroute.hospitalId, shortfall: checkStockQuantity - localStock };
        } else {
          this.svc.addNotification({ type: 'replenishment', hospitalId, hospitalName, detail: `Replenishment needed for ${medKey}`, medicine: medKey });
          stockResult = { action: 'replenish_requested', medicine: medKey, shortfall: checkStockQuantity - localStock };
        }
      }
    }
    pipelineSteps['step3_medicine_check'] = { status: 'completed', result: stockResult };

    // ── Step 4: Follow-up scheduling ──────────────────────────────────────
    const BASE: Record<string, [string, number, boolean]> = {
      mild: ['Routine', 30, false], moderate: ['Soon', 7, true], severe: ['Urgent', 3, true],
    };
    const ESC: Record<string, [string, number]> = {
      Routine: ['Soon', 14], Soon: ['Urgent', 3], Urgent: ['Urgent', 3],
    };
    const sevLower = severity.toLowerCase() as 'mild' | 'moderate' | 'severe';
    let [tier, days, doctorNotified] = BASE[sevLower] ?? BASE.mild;
    const escalatedBy: string[] = [];
    const cut90 = new Date(); cut90.setDate(cut90.getDate() - 90);
    const recur = patient.visits.slice(0, -1).find((v) => new Date(v.date) >= cut90 && v.diagnosis.toLowerCase() === diagnosis.toLowerCase());
    if (recur) { [tier, days] = ESC[tier]; doctorNotified = true; escalatedBy.push(`recurrence (${recur.hospitalName} on ${recur.date})`); }
    if (riskLevel === 'high') {
      const [nt, nd] = ESC[tier];
      if (nt !== tier) { tier = nt; days = nd; }
      doctorNotified = true;
      if (!escalatedBy.includes('high_risk')) escalatedBy.push('high_risk safety check');
    }
    const followupDate = this.svc.addDays(days);
    this.svc.saveFollowup({ patientId, patientName: patient.name, urgencyTier: tier, followupDate, recommendedFollowupDays: days, diagnosis, severity: sevLower, doctorNotified, escalatedBy, scheduledAt: this.svc.nowIso() });
    this.svc.addAudit({ tool: 'simulate_workflow', patientId, hospitalId, inputSummary: `diagnosis=${diagnosis}, severity=${sevLower}`, outputSummary: `visit=${visitId}, ${conflicts.length} conflicts, followup=${tier} on ${followupDate}` });
    pipelineSteps['step4_followup'] = { status: 'completed', urgencyTier: tier, followupDate, doctorNotified, escalatedBy };

    const stockAction = typeof stockResult === 'object' ? (stockResult as any).action : 'not checked';
    return {
      patientId, pipelineSteps,
      summary: { visitRecorded: true, safetyRisk: riskLevel, conflictsDetected: conflicts.length, stockAction, followupTier: tier, followupDate, actionRequired: riskLevel !== 'none' || ['Urgent', 'Soon'].includes(tier) },
      generatedAt: this.svc.nowIso(),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 18 — doctor_workload  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'doctor_workload',
    description:
      "Find all patients seen by a specific doctor across all hospitals. " +
      "Answers: 'how many patients has Dr. Radhika Menon seen?', 'list all patients seen by Dr. Nair'.",
    inputSchema: z.object({
      doctorName: z.string().describe('Doctor name or partial name (case-insensitive)'),
    }),
  })
  async doctorWorkload(input: { doctorName: string }, _ctx: ExecutionContext) {
    if (!input.doctorName?.trim()) return { error: true, message: "'doctorName' is required." };
    const q = input.doctorName.toLowerCase().trim();
    const patientMap = new Map<string, { patient: Patient; visits: object[] }>();
    for (const p of this.svc.getAllPatients()) {
      for (const v of p.visits) {
        if (!v.doctorName.toLowerCase().includes(q)) continue;
        if (!patientMap.has(p.patientId)) patientMap.set(p.patientId, { patient: p, visits: [] });
        patientMap.get(p.patientId)!.visits.push({ visitId: v.visitId, date: v.date, hospital: v.hospitalName, hospitalId: v.hospitalId, diagnosis: v.diagnosis, medicinesCount: v.prescribedMedicines.length });
      }
    }
    const results = [...patientMap.values()].map(({ patient: p, visits }) => ({
      patientId: p.patientId, name: p.name,
      totalVisitsWithDoctor: visits.length,
      visits: (visits as any[]).sort((a, b) => b.date.localeCompare(a.date)),
    })).sort((a, b) => b.totalVisitsWithDoctor - a.totalVisitsWithDoctor);
    return { doctorQuery: input.doctorName, totalPatientsFound: results.length, totalVisitsByDoctor: results.reduce((s, r) => s + r.totalVisitsWithDoctor, 0), patients: results };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TOOL 19 — trend_analysis  (v2.0)
  // ════════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'trend_analysis',
    description:
      "Analyse whether a diagnosis is trending up or down at a hospital or network-wide. " +
      "Answers: 'is Hypertension trending up at City General?', " +
      "'show the monthly trend for Diabetes across the network', 'has Pneumonia increased at HOSP-B?'",
    inputSchema: z.object({
      diagnosis: z.string().describe('Diagnosis to analyse (partial match)'),
      hospitalId: z.string().optional().describe('Specific hospital (omit for network-wide)'),
      periodMonths: z.number().int().optional().default(6),
    }),
  })
  async trendAnalysis(input: { diagnosis: string; hospitalId?: string; periodMonths?: number }, _ctx: ExecutionContext) {
    if (!input.diagnosis?.trim()) return { error: true, message: "'diagnosis' is required." };
    const diagLower = input.diagnosis.toLowerCase().trim();
    const monthlyCounts = new Map<string, number>();
    let totalMatches = 0;
    for (const p of this.svc.getAllPatients()) {
      for (const v of p.visits) {
        if (input.hospitalId && v.hospitalId.toUpperCase() !== input.hospitalId.toUpperCase()) continue;
        if (!v.diagnosis.toLowerCase().includes(diagLower)) continue;
        const mk = v.date.slice(0, 7);
        monthlyCounts.set(mk, (monthlyCounts.get(mk) ?? 0) + 1);
        totalMatches++;
      }
    }
    if (!monthlyCounts.size) return { diagnosis: input.diagnosis, hospitalId: input.hospitalId, message: 'No matching visits found.', trend: 'unknown' };
    const sortedMonths = [...monthlyCounts.keys()].sort();
    const series = sortedMonths.map((m) => ({ month: m, count: monthlyCounts.get(m)! }));
    const counts = series.map((s) => s.count);
    let trend = 'insufficient_data', pctChange = 0;
    if (counts.length >= 4) {
      const ra = counts.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const pa = counts.slice(-4, -2).reduce((a, b) => a + b, 0) / 2;
      pctChange = pa > 0 ? ((ra - pa) / pa) * 100 : 0;
      trend = pctChange > 10 ? 'increasing' : pctChange < -10 ? 'decreasing' : 'stable';
    } else if (counts.length >= 2) {
      pctChange = counts[0] > 0 ? ((counts[counts.length - 1] - counts[0]) / counts[0]) * 100 : 0;
      trend = pctChange > 10 ? 'increasing' : pctChange < -10 ? 'decreasing' : 'stable';
    }
    const peakMonth = sortedMonths.reduce((a, b) => (monthlyCounts.get(a)! >= monthlyCounts.get(b)! ? a : b));
    return {
      diagnosis: input.diagnosis,
      hospitalId: input.hospitalId ?? 'network-wide',
      totalMatchingVisits: totalMatches,
      trend,
      percentageChange: Math.round(pctChange * 10) / 10,
      monthlySeries: series,
      peakMonth,
      generatedAt: this.svc.nowIso(),
    };
  }
}