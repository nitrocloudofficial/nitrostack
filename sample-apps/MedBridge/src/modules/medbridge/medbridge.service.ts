import { Injectable } from '@nitrostack/core';
import nodemailer from 'nodemailer';
import { randomInt, randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Patient {
  patientId: string;
  name: string;
  abhaId: string; // mock ABHA-format ID
  mobile: string; // mock mobile, e.g. "+91 9845012233" — masked in tool output
  email: string; // where access-log notifications are sent
}

export interface HospitalRecord {
  hospitalName: string;
  patientId: string;
  lastVisit: string;
  allergies: string[];
  diagnoses: string[];
  activeMedications: { name: string; dosage: string }[];
  notes: string;
}

export interface LabReport {
  patientId: string;
  labName: string;
  date: string;
  creatinine: string;
  liverEnzymes: string;
  flags: string[];
}

export interface PharmacyRecord {
  patientId: string;
  pharmacyName: string;
  activeMedications: { name: string; dosage: string; since: string }[];
  refillHistory: { name: string; date: string }[];
}

export interface Citation {
  source: string;
  recordType: 'hospital_record' | 'lab_report' | 'pharmacy_record';
  asOf: string;
}

export interface ReconciledField {
  field: string;
  value: string;
  citations: Citation[];
}

export interface Conflict {
  field: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  sources: { source: string; value: string; asOf: string }[];
}

export interface ReconciliationResult {
  patientId: string;
  agreed: ReconciledField[];
  conflicts: Conflict[];
  sourcesConsulted: string[];
  summaryText?: string;
}

export interface DrugCheckResult {
  patientId: string;
  drug: string;
  safe: boolean;
  conflicts: {
    source: string;
    allergyOnFile: string;
    asOf: string;
    recommendation: string;
  }[];
  checkedSources: string[];
  summaryText?: string;
}

export interface MedicationInteractionResult {
  patientId: string;
  medicationsChecked: string[];
  interactions: { drugA: string; drugB: string; risk: 'moderate' | 'severe'; guidance: string }[];
  summaryText?: string;
}

export interface SimilarCase {
  patientId: string;
  sharedField: string;
  severity: Conflict['severity'];
  description: string;
}

export interface FlaggedCase {
  patientId: string;
  flaggedBy: string;
  reason: string;
  flaggedAt: string;
}

export interface ConsentLogEntry {
  patientId: string;
  timestamp: string;
  actor: string;
  action: 'access' | 'consent_granted' | 'consent_revoked' | 'access_denied' | 'otp_sent' | 'otp_failed' | 'report_generated' | 'report_shared';
  tool: string;
  reason: string;
}

export interface DoctorSession {
  sessionId: string;
  doctorName: string;
  hospitalName: string;
  registrationId: string; // medical council registration number
  contact: string;
  createdAt: string;
}

export interface ConsentGrant {
  patientId: string;
  grantedTo: string; // doctorName
  doctorSessionId: string;
  scope: string[];
  grantedAt: string;
  expiresAt: string;
}

export interface ConsentStatus {
  patientId: string;
  active: boolean;
  grantedTo?: string;
  doctorSessionId?: string;
  scope?: string[];
  expiresAt?: string;
}

export interface OtpChallenge {
  patientId: string;
  doctorSessionId: string;
  code: string;
  expiresAt: string;
  attempts: number;
}

export interface ReconciliationReport {
  reportId: string;
  patientId: string;
  doctorSessionId: string;
  generatedAt: string;
  markdown: string;
  shared: boolean;
}

// ---------------------------------------------------------------------------
// Errors — thrown with actionable, agent-facing messages
// ---------------------------------------------------------------------------

export class ConsentRequiredError extends Error {
  constructor(public patientId: string) {
    super(
      `No active patient consent on file for ${patientId}. The flow is: ` +
        `1) medbridge_register_doctor_session, 2) medbridge_send_patient_otp, ` +
        `3) ask the doctor for the OTP the patient shared verbally, ` +
        `4) medbridge_verify_patient_otp. Then retry this call.`
    );
    this.name = 'ConsentRequiredError';
  }
}

export class DoctorSessionRequiredError extends Error {
  constructor() {
    super('No doctor session provided or session unknown. Call medbridge_register_doctor_session first and pass the returned sessionId.');
    this.name = 'DoctorSessionRequiredError';
  }
}

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

const DRUG_ALLERGY_CLASS: Record<string, string> = {
  amoxicillin: 'penicillin',
  penicillin: 'penicillin',
  ampicillin: 'penicillin',
  augmentin: 'penicillin',
  ibuprofen: 'nsaid',
  aspirin: 'nsaid',
  naproxen: 'nsaid',
  sulfamethoxazole: 'sulfa',
  bactrim: 'sulfa',
};

function allergyClassOf(allergyText: string): string | null {
  const t = allergyText.toLowerCase();
  if (t.includes('penicillin') || t.includes('amoxicillin')) return 'penicillin';
  if (t.includes('sulfa')) return 'sulfa';
  if (t.includes('nsaid') || t.includes('ibuprofen') || t.includes('aspirin')) return 'nsaid';
  return null;
}

// Small, demo-scoped drug-drug interaction matrix (pair is order-independent)
const DRUG_INTERACTIONS: { a: string; b: string; risk: 'moderate' | 'severe'; guidance: string }[] = [
  {
    a: 'metformin',
    b: 'contrast dye',
    risk: 'severe',
    guidance: 'Hold metformin 48h before/after iodinated contrast — risk of lactic acidosis in renal impairment.',
  },
  {
    a: 'amlodipine',
    b: 'simvastatin',
    risk: 'moderate',
    guidance: 'Amlodipine raises simvastatin exposure — cap simvastatin at 20mg/day if co-prescribed.',
  },
  {
    a: 'ibuprofen',
    b: 'lisinopril',
    risk: 'moderate',
    guidance: 'NSAIDs blunt ACE-inhibitor effect and raise renal risk — monitor renal function and blood pressure.',
  },
];

const DEFAULT_CONSENT_MINUTES = 30;
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;

function maskMobile(mobile: string): string {
  return mobile.replace(/\d(?=\d{2})/g, (d, offset, full) => (offset < full.length - 4 ? '•' : d));
}

// ---------------------------------------------------------------------------
// In-memory store — swap for a real DB / ABHA connector later
// ---------------------------------------------------------------------------

@Injectable()
export class MedBridgeService {
  private patients: Patient[] = [
    { patientId: 'P001', name: 'Arjun Rao', abhaId: '14-2233-4455-6677', mobile: '+91 9845012233', email: 'arjun.rao.demo@example.com' },
    { patientId: 'P002', name: 'Meena Iyer', abhaId: '14-9988-7766-5544', mobile: '+91 9902213344', email: 'meena.iyer.demo@example.com' },
    { patientId: 'P003', name: 'Divya Krishnan', abhaId: '14-1122-3344-5566', mobile: '+91 9741199887', email: 'divya.krishnan.demo@example.com' },
  ];

  private hospitalRecords: HospitalRecord[] = [
    { hospitalName: 'Hospital A', patientId: 'P001', lastVisit: '2024-03-10', allergies: [], diagnoses: ['Seasonal flu'], activeMedications: [], notes: 'No known drug allergies reported by patient at intake.' },
    { hospitalName: 'Hospital B', patientId: 'P001', lastVisit: '2025-02-18', allergies: ['Penicillin'], diagnoses: ['Bacterial sinusitis'], activeMedications: [], notes: 'Documented penicillin reaction (rash, hives) during 2025-02-18 admission.' },
    { hospitalName: 'Hospital A', patientId: 'P002', lastVisit: '2026-05-02', allergies: [], diagnoses: ['Type 2 diabetes'], activeMedications: [{ name: 'Metformin', dosage: '500mg' }], notes: 'Metformin 500mg BID prescribed at discharge.' },
    { hospitalName: 'Hospital A', patientId: 'P003', lastVisit: '2026-01-15', allergies: ['Shellfish'], diagnoses: ['Hypertension'], activeMedications: [{ name: 'Amlodipine', dosage: '5mg' }, { name: 'Simvastatin', dosage: '40mg' }], notes: 'Stable on current regimen.' },
  ];

  private labReports: LabReport[] = [
    { patientId: 'P001', labName: 'City Diagnostics Lab', date: '2025-06-01', creatinine: '0.9 mg/dL (normal)', liverEnzymes: 'ALT 22 U/L, AST 24 U/L (normal)', flags: [] },
    { patientId: 'P002', labName: 'City Diagnostics Lab', date: '2026-06-20', creatinine: '1.4 mg/dL (mildly elevated)', liverEnzymes: 'ALT 28 U/L, AST 30 U/L (normal)', flags: ['Mildly elevated creatinine — consider renal dosing review for Metformin'] },
  ];

  private pharmacyRecords: PharmacyRecord[] = [
    { patientId: 'P001', pharmacyName: 'Apollo Pharmacy', activeMedications: [{ name: 'Metformin', dosage: '500mg', since: '2023-11-01' }], refillHistory: [{ name: 'Metformin', date: '2026-07-01' }] },
    { patientId: 'P002', pharmacyName: 'MedPlus Pharmacy', activeMedications: [{ name: 'Metformin', dosage: '1000mg', since: '2026-05-05' }], refillHistory: [{ name: 'Metformin', date: '2026-07-15' }] },
  ];

  private consentLog: ConsentLogEntry[] = [];
  private consentGrants: Map<string, ConsentGrant> = new Map();
  private doctorSessions: Map<string, DoctorSession> = new Map();
  private otpChallenges: Map<string, OtpChallenge> = new Map(); // key: patientId
  private reports: Map<string, ReconciliationReport> = new Map();
  private flaggedCases: FlaggedCase[] = [];

  // --- patient directory -----------------------------------------------------

  listPatients(): Patient[] {
    return this.patients;
  }

  findPatient(patientId: string) {
    return this.patients.find((p) => p.patientId === patientId) ?? null;
  }

  // --- doctor identity ---------------------------------------------------------

  registerDoctorSession(doctorName: string, hospitalName: string, registrationId: string, contact: string): DoctorSession {
    const session: DoctorSession = {
      sessionId: randomUUID(),
      doctorName,
      hospitalName,
      registrationId,
      contact,
      createdAt: new Date().toISOString(),
    };
    this.doctorSessions.set(session.sessionId, session);
    return session;
  }

  findDoctorSession(sessionId: string): DoctorSession | null {
    return this.doctorSessions.get(sessionId) ?? null;
  }

  requireDoctorSession(sessionId: string): DoctorSession {
    const session = this.findDoctorSession(sessionId);
    if (!session) throw new DoctorSessionRequiredError();
    return session;
  }

  // --- OTP-gated consent lifecycle --------------------------------------------

  /** Step 1 of consent: generate + "deliver" an OTP to the patient's mobile. */
  async sendPatientOtp(patientId: string, doctorSessionId: string): Promise<{ maskedMobile: string; expiresAt: string; devOtp?: string }> {
    const patient = this.findPatient(patientId);
    if (!patient) throw new Error(`Unknown patient ${patientId}. Call medbridge_list_patients for valid IDs.`);
    this.requireDoctorSession(doctorSessionId);

    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
    this.otpChallenges.set(patientId, { patientId, doctorSessionId, code, expiresAt, attempts: 0 });

    this.appendLog(patientId, 'otp_sent', 'medbridge_send_patient_otp', doctorSessionId, `OTP sent to ${maskMobile(patient.mobile)}`);

    // Try to send SMS (best-effort)
    try {
      await this.sendSms(patient.mobile, `Your MedBridge OTP is ${code}. It expires at ${expiresAt}`);
    } catch (err) {
      // swallow
    }

    // Dev-mode: return devOtp only when SMS not configured (helpful in demos)
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
    if (!twilioConfigured || process.env.NODE_ENV !== 'production') {
      return { maskedMobile: maskMobile(patient.mobile), expiresAt, devOtp: code };
    }
    return { maskedMobile: maskMobile(patient.mobile), expiresAt };
  }

  /** Step 2 of consent: verify the OTP the doctor was told by the patient, then grant consent. */
  verifyPatientOtp(patientId: string, code: string, doctorSessionId: string, scope: string[], minutes = DEFAULT_CONSENT_MINUTES): ConsentGrant {
    const doctor = this.requireDoctorSession(doctorSessionId);
    const challenge = this.otpChallenges.get(patientId);

    if (!challenge || challenge.doctorSessionId !== doctorSessionId) {
      throw new Error(`No OTP challenge in progress for ${patientId} with this doctor session. Call medbridge_send_patient_otp first.`);
    }
    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      this.otpChallenges.delete(patientId);
      throw new Error('OTP expired. Call medbridge_send_patient_otp again to request a new code.');
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      this.otpChallenges.delete(patientId);
      throw new Error('Too many incorrect OTP attempts. Call medbridge_send_patient_otp again to request a new code.');
    }
    if (challenge.code !== code) {
      challenge.attempts += 1;
      this.appendLog(patientId, 'otp_failed', 'medbridge_verify_patient_otp', doctorSessionId, `Incorrect OTP (attempt ${challenge.attempts}/${OTP_MAX_ATTEMPTS})`);
      throw new Error(`Incorrect OTP. ${OTP_MAX_ATTEMPTS - challenge.attempts} attempt(s) remaining.`);
    }

    this.otpChallenges.delete(patientId);
    const grantedAt = new Date();
    const expiresAt = new Date(grantedAt.getTime() + minutes * 60_000);
    const grant: ConsentGrant = {
      patientId,
      grantedTo: doctor.doctorName,
      doctorSessionId,
      scope,
      grantedAt: grantedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    this.consentGrants.set(patientId, grant);
    this.appendLog(
      patientId,
      'consent_granted',
      'medbridge_verify_patient_otp',
      doctor.doctorName,
      `OTP-verified consent granted to Dr. ${doctor.doctorName} (${doctor.hospitalName}, reg. ${doctor.registrationId}) for scope [${scope.join(', ')}], ${minutes} minute(s)`
    );
    return grant;
  }

  grantConsent(patientId: string, actor: string, scope: string[], minutes = DEFAULT_CONSENT_MINUTES): ConsentGrant {
    const patient = this.findPatient(patientId);
    if (!patient) throw new Error(`Unknown patient ${patientId}. Call medbridge_list_patients for valid IDs.`);

    const grantedAt = new Date();
    const expiresAt = new Date(grantedAt.getTime() + minutes * 60_000);
    const grant: ConsentGrant = {
      patientId,
      grantedTo: actor,
      doctorSessionId: `simulated-${randomUUID()}`,
      scope,
      grantedAt: grantedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.consentGrants.set(patientId, grant);
    this.appendLog(patientId, 'consent_granted', 'medbridge_request_consent', actor, `Consent granted for scope [${scope.join(', ')}], ${minutes} minute(s)`);
    return grant;
  }

  revokeConsent(patientId: string, actor: string): boolean {
    const existed = this.consentGrants.delete(patientId);
    this.appendLog(patientId, 'consent_revoked', 'medbridge_revoke_consent', actor, 'Consent revoked');
    return existed;
  }

  getConsentStatus(patientId: string): ConsentStatus {
    const grant = this.consentGrants.get(patientId);
    if (!grant || new Date(grant.expiresAt).getTime() < Date.now()) {
      return { patientId, active: false };
    }
    return { patientId, active: true, grantedTo: grant.grantedTo, doctorSessionId: grant.doctorSessionId, scope: grant.scope, expiresAt: grant.expiresAt };
  }

  requireConsent(patientId: string, tool: string, actor: string): ConsentGrant {
    const status = this.getConsentStatus(patientId);
    if (!status.active) {
      this.appendLog(patientId, 'access_denied', tool, actor, 'Blocked: no active consent grant');
      throw new ConsentRequiredError(patientId);
    }
    return this.consentGrants.get(patientId)!;
  }

  // --- logging -----------------------------------------------------------------

  private appendLog(patientId: string, action: ConsentLogEntry['action'], tool: string, actor: string, reason: string) {
    const entry: ConsentLogEntry = { patientId, timestamp: new Date().toISOString(), actor, action, tool, reason };
    this.consentLog.push(entry);

    // Send a notification email to the patient for access events (best-effort; does not block)
    if (action === 'access') {
      this.sendPatientEmail(patientId, 'MedBridge access notification', `Your record was accessed by ${actor} via ${tool} for reason: ${reason} at ${entry.timestamp}`).catch((err) => {
        // swallow errors but log to console for diagnostics
        // eslint-disable-next-line no-console
        console.error('Failed to send patient notification email', err);
      });
    }
  }

  logAccess(patientId: string, tool: string, actor: string, reason: string) {
    this.appendLog(patientId, 'access', tool, actor, reason);
  }

  getConsentLog(patientId: string): ConsentLogEntry[] {
    return this.consentLog.filter((e) => e.patientId === patientId);
  }

  /**
   * Send a best-effort email to the patient's configured email address.
   * Uses SMTP credentials from environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
   * If SMTP configuration is missing, the function logs the message instead of failing.
   */
  async sendEmail(to: string, subject: string, text: string) {
    try {
      const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
      const port = Number(process.env.SMTP_PORT ?? 587);
      const user = process.env.SMTP_USER ?? process.env.GMAIL_USER;
      const pass = process.env.SMTP_PASS ?? process.env.GMAIL_PASS;
      if (!user || !pass) {
        // Credentials not configured — log the intended message instead of failing.
        // eslint-disable-next-line no-console
        console.info(`SMTP not configured; would send email to ${to}: ${subject}\n${text}`);
        return;
      }
      const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      await transporter.sendMail({ from: user, to, subject, text });
      // eslint-disable-next-line no-console
      console.info(`Sent email to ${to}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('sendEmail error', err);
      throw err;
    }
  }

  async sendPatientEmail(patientId: string, subject: string, text: string, recipientEmail?: string) {
    const patient = this.findPatient(patientId);
    if (!patient) {
      // eslint-disable-next-line no-console
      console.warn(`Unknown patient ${patientId}; skipping sendPatientEmail.`);
      return;
    }
    const to = recipientEmail ?? patient.email;
    if (!to) {
      // eslint-disable-next-line no-console
      console.warn(`No email configured for patient ${patientId}; skipping sendPatientEmail.`);
      return;
    }
    await this.sendEmail(to, subject, text);
  }
  /**
   * Best-effort SMS sending using Twilio if configured. Environment variables:
   * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
   * If not configured, the SMS is logged for dev purposes.
   */
  async sendSms(to: string, text: string) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM;
      if (!accountSid || !authToken || !from) {
        // Not configured; log and return
        // eslint-disable-next-line no-console
        console.info(`TWILIO not configured; would send SMS to ${to}: ${text}`);
        return;
      }

      // Dynamically import twilio to avoid requiring it when not configured
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Twilio = (await import('twilio')).default;
      const client = Twilio(accountSid, authToken);
      await client.messages.create({ body: text, from, to });
      // eslint-disable-next-line no-console
      console.info(`Sent SMS to ${to}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('sendSms error', err);
      // do not throw; best-effort
    }
  }

  // --- lookups -------------------------------------------------------------

  private findHospitalRecords(patientId: string) {
    return this.hospitalRecords.filter((r) => r.patientId === patientId);
  }
  private findLab(patientId: string) {
    return this.labReports.find((r) => r.patientId === patientId) ?? null;
  }
  private findPharmacy(patientId: string) {
    return this.pharmacyRecords.find((r) => r.patientId === patientId) ?? null;
  }

  // --- reconciliation --------------------------------------------------------

  reconcilePatientHistory(patientId: string): ReconciliationResult {
    const hospitals = this.findHospitalRecords(patientId);
    const lab = this.findLab(patientId);
    const pharmacy = this.findPharmacy(patientId);
    if (!hospitals.length) throw new Error(`No hospital records found for patient ${patientId}.`);

    const agreed: ReconciledField[] = [];
    const conflicts: Conflict[] = [];
    const sourcesConsulted = [...hospitals.map((h) => h.hospitalName), ...(lab ? [lab.labName] : []), ...(pharmacy ? [pharmacy.pharmacyName] : [])];

    const allergySources = hospitals.map((h) => ({ source: h.hospitalName, value: h.allergies.length ? h.allergies.join(', ') : 'No known allergies', asOf: h.lastVisit }));
    const distinctAllergyValues = new Set(allergySources.map((s) => s.value.toLowerCase()));
    if (distinctAllergyValues.size > 1) {
      conflicts.push({ field: 'allergies', severity: 'critical', description: 'Allergy status disagrees across sources — confirm with patient before prescribing.', sources: allergySources });
    } else if (allergySources.length) {
      agreed.push({ field: 'allergies', value: allergySources[0].value, citations: hospitals.map((h) => ({ source: h.hospitalName, recordType: 'hospital_record', asOf: h.lastVisit })) });
    }

    if (pharmacy) {
      for (const pharmMed of pharmacy.activeMedications) {
        const hospitalMatch = hospitals.flatMap((h) => h.activeMedications.map((m) => ({ ...m, hospitalName: h.hospitalName, asOf: h.lastVisit }))).find((m) => m.name.toLowerCase() === pharmMed.name.toLowerCase());
        if (hospitalMatch && hospitalMatch.dosage !== pharmMed.dosage) {
          conflicts.push({
            field: `medication:${pharmMed.name}`,
            severity: 'warning',
            description: 'Prescribed dosage disagrees with the dosage currently being dispensed.',
            sources: [
              { source: hospitalMatch.hospitalName, value: `${pharmMed.name} ${hospitalMatch.dosage}`, asOf: hospitalMatch.asOf },
              { source: pharmacy.pharmacyName, value: `${pharmMed.name} ${pharmMed.dosage}`, asOf: pharmacy.refillHistory[0]?.date ?? 'unknown' },
            ],
          });
        } else {
          agreed.push({ field: `medication:${pharmMed.name}`, value: `${pharmMed.name} ${pharmMed.dosage}`, citations: [{ source: pharmacy.pharmacyName, recordType: 'pharmacy_record', asOf: pharmacy.refillHistory[0]?.date ?? 'unknown' }] });
        }
      }
    }

    for (const h of hospitals) {
      if (h.diagnoses.length) agreed.push({ field: 'diagnosis', value: h.diagnoses.join(', '), citations: [{ source: h.hospitalName, recordType: 'hospital_record', asOf: h.lastVisit }] });
    }

    if (lab) {
      agreed.push({ field: 'labs', value: `creatinine ${lab.creatinine}, liver enzymes ${lab.liverEnzymes}`, citations: [{ source: lab.labName, recordType: 'lab_report', asOf: lab.date }] });
      for (const flag of lab.flags) conflicts.push({ field: 'lab_flag', severity: 'warning', description: flag, sources: [{ source: lab.labName, value: flag, asOf: lab.date }] });
    }

    return { patientId, agreed, conflicts, sourcesConsulted };
  }

  // --- drug safety (allergy-based) ------------------------------------------------

  checkDrugSafety(patientId: string, drug: string): DrugCheckResult {
    const hospitals = this.findHospitalRecords(patientId);
    const drugClass = DRUG_ALLERGY_CLASS[drug.toLowerCase()] ?? null;
    const checkedSources: string[] = [];
    const conflicts: DrugCheckResult['conflicts'] = [];

    for (const record of hospitals) {
      checkedSources.push(record.hospitalName);
      for (const allergy of record.allergies) {
        const cls = allergyClassOf(allergy);
        if (drugClass && cls === drugClass) {
          conflicts.push({ source: record.hospitalName, allergyOnFile: allergy, asOf: record.lastVisit, recommendation: `Confirm with patient before prescribing ${drug} — ${record.hospitalName} (${record.lastVisit}) documents a ${allergy} reaction.` });
        }
      }
    }
    return { patientId, drug, safe: conflicts.length === 0, conflicts, checkedSources };
  }

  // --- drug-drug interaction checking ------------------------------------------

  checkMedicationInteractions(patientId: string): MedicationInteractionResult {
    const hospitals = this.findHospitalRecords(patientId);
    const pharmacy = this.findPharmacy(patientId);
    const meds = new Set<string>();
    hospitals.forEach((h) => h.activeMedications.forEach((m) => meds.add(m.name.toLowerCase())));
    pharmacy?.activeMedications.forEach((m) => meds.add(m.name.toLowerCase()));
    const medList = Array.from(meds);

    const interactions = DRUG_INTERACTIONS.filter((pair) => medList.includes(pair.a) && medList.includes(pair.b)).map((pair) => ({ drugA: pair.a, drugB: pair.b, risk: pair.risk, guidance: pair.guidance }));

    return { patientId, medicationsChecked: medList, interactions };
  }

  // --- cross-patient similarity (agentic reasoning showcase) -------------------

  findSimilarCases(patientId: string): SimilarCase[] {
    const target = this.reconcilePatientHistory(patientId);
    const targetFields = new Set(target.conflicts.map((c) => c.field));
    if (!targetFields.size) return [];

    const results: SimilarCase[] = [];
    for (const other of this.patients) {
      if (other.patientId === patientId) continue;
      let otherRecon: ReconciliationResult;
      try {
        otherRecon = this.reconcilePatientHistory(other.patientId);
      } catch {
        continue;
      }
      for (const conflict of otherRecon.conflicts) {
        if (targetFields.has(conflict.field)) {
          results.push({ patientId: other.patientId, sharedField: conflict.field, severity: conflict.severity, description: conflict.description });
        }
      }
    }
    return results;
  }

  // --- case escalation -----------------------------------------------------------

  flagCaseForReview(patientId: string, flaggedBy: string, reason: string): FlaggedCase {
    const flag: FlaggedCase = { patientId, flaggedBy, reason, flaggedAt: new Date().toISOString() };
    this.flaggedCases.push(flag);
    this.appendLog(patientId, 'access', 'medbridge_flag_case_for_review', flaggedBy, `Flagged for review: ${reason}`);
    return flag;
  }

  listFlaggedCases(): FlaggedCase[] {
    return this.flaggedCases;
  }

  // --- compliance / audit summary ------------------------------------------------

  getAuditSummary() {
    const totalAccesses = this.consentLog.filter((e) => e.action === 'access').length;
    const totalDenied = this.consentLog.filter((e) => e.action === 'access_denied').length;
    const totalGrants = this.consentLog.filter((e) => e.action === 'consent_granted').length;
    const activeConsents = this.patients.filter((p) => this.getConsentStatus(p.patientId).active).length;
    return { totalPatients: this.patients.length, totalAccesses, totalDenied, totalGrants, activeConsents, flaggedCases: this.flaggedCases.length };
  }

  // --- agentic review (mock LLM-assisted summary) ---------------------------------

  runAgentReview(patientId: string): { patientId: string; conciseSummary: string; keyRisks: string[]; recommendedActions: string[] } {
    const reconciliation = this.reconcilePatientHistory(patientId);
    // Mocked agentic reasoning: produce a concise summary and recommendations based on conflicts
    const keyRisks = reconciliation.conflicts.map((c) => `${c.field}: ${c.severity}`);
    const recommendedActions: string[] = [];
    if (reconciliation.conflicts.some((c) => c.severity === 'critical')) {
      recommendedActions.push('Urgent: confirm allergies with patient and avoid suspected drugs until clarified.');
    }
    if (reconciliation.conflicts.some((c) => c.field.startsWith('medication'))) {
      recommendedActions.push('Review current medications and reconcile dispensing vs prescribed dosages.');
    }
    if (reconciliation.conflicts.some((c) => c.field === 'lab_flag')) {
      recommendedActions.push('Review elevated lab flags and consider targeted investigations.');
    }
    if (!recommendedActions.length) recommendedActions.push('No immediate actions — standard clinical follow-up.');

    const conciseSummary = `Reconciled across ${reconciliation.sourcesConsulted.join(', ')}. Conflicts: ${reconciliation.conflicts.length}. Agreed findings: ${reconciliation.agreed.length}.`;
    return { patientId, conciseSummary, keyRisks, recommendedActions };
  }

  // --- referral export --------------------------------------------------------

  exportForReferral(patientId: string, reason: string): { patientId: string; referralMarkdown: string } {
    const patient = this.findPatient(patientId);
    if (!patient) throw new Error(`Unknown patient ${patientId}`);
    const reconciliation = this.reconcilePatientHistory(patientId);

    const lines: string[] = [];
    lines.push(`# Referral Packet — ${patient.name} (${patient.patientId})`);
    lines.push(`Reason for referral: ${reason}`);
    lines.push('');
    lines.push('## Key clinical summary');
    // Build a compact reconciliation summary locally
    lines.push(`Reconciled across ${reconciliation.sourcesConsulted.join(', ')}`);
    lines.push(reconciliation.conflicts.length ? `${reconciliation.conflicts.length} conflict(s) found` : 'No conflicts detected');
    if (reconciliation.conflicts.length) lines.push(...reconciliation.conflicts.map((c) => `- [${c.severity.toUpperCase()}] ${c.field}: ${c.description}`));
    if (reconciliation.agreed.length) {
      lines.push('Agreed findings:');
      lines.push(...reconciliation.agreed.map((a) => `- ${a.field}: ${a.value} (sources: ${a.citations.map((c) => c.source).join(', ')})`));
    }
    lines.push('');
    lines.push('## Relevant reports & citations');
    for (const a of reconciliation.agreed) {
      lines.push(`- ${a.field}: ${a.value}`);
      lines.push(`  - Citations: ${a.citations.map((c) => `${c.source} (${c.asOf})`).join('; ')}`);
    }
    lines.push('');
    lines.push('## Attachments to include:');
    lines.push('- Latest lab reports (if available)');
    lines.push('- Medication list');

    return { patientId, referralMarkdown: lines.join('\n') };
  }

  // --- reconciliation report generation + sharing ---------------------------------

  generateReport(patientId: string, doctorSessionId: string): ReconciliationReport {
    const patient = this.findPatient(patientId);
    const doctor = this.requireDoctorSession(doctorSessionId);
    if (!patient) throw new Error(`Unknown patient ${patientId}.`);

    const reconciliation = this.reconcilePatientHistory(patientId);
    const reportId = randomUUID();
    const generatedAt = new Date().toISOString();

    const lines: string[] = [];
    lines.push(`# MedBridge reconciliation report`);
    lines.push('');
    lines.push(`**Patient:** ${patient.name} (${patient.patientId}) · ABHA ${patient.abhaId}`);
    lines.push(`**Prepared for:** Dr. ${doctor.doctorName}, ${doctor.hospitalName} (reg. ${doctor.registrationId})`);
    lines.push(`**Generated:** ${generatedAt}`);
    lines.push(`**Sources consulted:** ${reconciliation.sourcesConsulted.join(', ')}`);
    lines.push('');
    lines.push(`## Conflicts (${reconciliation.conflicts.length})`);
    if (!reconciliation.conflicts.length) {
      lines.push('No conflicts detected across consulted sources.');
    } else {
      for (const c of reconciliation.conflicts) {
        lines.push(`- **[${c.severity.toUpperCase()}] ${c.field}** — ${c.description}`);
        for (const s of c.sources) lines.push(`  - ${s.source} (${s.asOf}): ${s.value}`);
      }
    }
    lines.push('');
    lines.push(`## Agreed findings (${reconciliation.agreed.length})`);
    for (const a of reconciliation.agreed) {
      lines.push(`- **${a.field}:** ${a.value} — _${a.citations.map((c) => `${c.source} (${c.asOf})`).join(', ')}_`);
    }
    lines.push('');
    lines.push('---');
    lines.push(`_This report reflects data available in MedBridge at the time of generation and is not a substitute for direct patient confirmation of critical findings._`);

    const report: ReconciliationReport = { reportId, patientId, doctorSessionId, generatedAt, markdown: lines.join('\n'), shared: false };
    this.reports.set(reportId, report);
    this.appendLog(patientId, 'report_generated', 'medbridge_generate_reconciliation_report', doctor.doctorName, `Report ${reportId} generated`);
    return report;
  }

  findReport(reportId: string): ReconciliationReport | null {
    return this.reports.get(reportId) ?? null;
  }

  listReports(patientId?: string): ReconciliationReport[] {
    const all = Array.from(this.reports.values());
    return patientId ? all.filter((r) => r.patientId === patientId) : all;
  }

  async shareReport(reportId: string, actor: string, recipientEmail?: string, message?: string): Promise<ReconciliationReport> {
    const report = this.reports.get(reportId);
    if (!report) throw new Error(`Unknown report ${reportId}. Generate one first with medbridge_generate_reconciliation_report.`);
    report.shared = true;
    this.appendLog(report.patientId, 'report_shared', 'medbridge_share_report', actor, `Report ${reportId} shared`);
    const subject = `MedBridge reconciliation report for ${report.patientId}`;
    const body = `${message ?? 'Please find the reconciliation report below.'}\n\n${report.markdown}`;
    const emailTo = recipientEmail ?? this.findPatient(report.patientId)?.email;
    if (emailTo) {
      await this.sendEmail(emailTo, subject, body.replace(/\n/g, '\r\n'));
    } else {
      // eslint-disable-next-line no-console
      console.warn(`No recipient email available for report ${reportId}; skipping email send.`);
    }
    this.reports.set(reportId, report);
    return report;
  }
}
