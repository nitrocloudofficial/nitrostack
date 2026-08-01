/**
 * FhirService — HAPI FHIR R4 client with failover capabilities.
 * Primary URL: FHIR_BASE_URL (hapi.fhir.org/baseR4)
 * Secondary URL: FHIR_BASE_URL_FALLBACK (r4.smarthealthit.org)
 * All data is synthetic (Synthea). Outputs stamp synthetic_data: true.
 */
import { Injectable } from '@nitrostack/core';
import { HttpClientService, UpstreamError } from './http-client.service.js';
import { env } from '../config/env.js';

export interface FhirPatientSummary {
  fhir_id: string;
  name: string;
  gender: string;
  birth_date: string;
  mrn?: string;
  age?: number;
  address?: string;
  telecom?: string;
}

export interface FhirCondition {
  code: string;
  display: string;
  icd10?: string;
  onset_date?: string;
  status: string;
  recorded_date?: string;
}

export interface FhirMedication {
  name: string;
  rxcui?: string;
  dosage?: string;
  frequency?: string;
  status: string;
  authored_on?: string;
  prescriber?: string;
}

export interface FhirObservation {
  code: string;
  display: string;
  value?: string | number;
  unit?: string;
  date?: string;
  reference_range?: { low?: number; high?: number; unit?: string };
  flag?: string;
}

export interface FhirEncounter {
  type: string;
  status: string;
  period_start?: string;
  period_end?: string;
  reason?: string;
  location?: string;
}

export interface FhirAllergy {
  substance: string;
  category?: string;
  criticality?: string;
  reaction?: string;
  status: string;
}

export interface FhirImmunization {
  vaccine_name: string;
  date?: string;
  status: string;
  lot_number?: string;
}

export interface FhirAggregatedSummary {
  patient: FhirPatientSummary;
  active_conditions: FhirCondition[];
  active_medications: FhirMedication[];
  recent_vitals: FhirObservation[];
  recent_encounters: FhirEncounter[];
  allergies?: FhirAllergy[];
  immunizations?: FhirImmunization[];
  allergy_note: string;
  generated_at: string;
  synthetic_data: true;
  sections_failed: string[];
  server_used: string;
}

@Injectable({ deps: [HttpClientService] })
export class FhirService {
  constructor(private readonly http: HttpClientService) {}

  private validatePatientPath(path: string): void {
    let patientId: string | null = null;
    const directMatch = /^\/Patient\/([^/?]+)/.exec(path);
    if (directMatch) patientId = decodeURIComponent(directMatch[1]);
    else {
      patientId = new URL(path, 'https://fhir.local').searchParams.get('patient');
    }

    if (patientId !== null && !/^[A-Za-z0-9.-]{1,64}$/.test(patientId)) {
      throw new Error('VALIDATION_ERROR: FHIR patient_id must contain only letters, numbers, dots, or hyphens.');
    }
  }

  /** Failover HTTP wrapper for FHIR endpoint calls. */
  private async getFhir<T>(path: string): Promise<{ data: T; serverUsed: string }> {
    this.validatePatientPath(path);
    const primaryUrl = `${env.FHIR_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    try {
      const res = await this.http.getJson<T>({
        api: 'fhir',
        url: primaryUrl,
      });
      return { data: res.data, serverUsed: env.FHIR_BASE_URL };
    } catch (primaryErr) {
      // A resource-specific 4xx is not an upstream outage. Preserve it so
      // callers can return PATIENT_NOT_FOUND/validation semantics instead of
      // querying a different synthetic dataset for the same identifier.
      if (
        primaryErr instanceof UpstreamError &&
        primaryErr.status !== undefined &&
        primaryErr.status >= 400 &&
        primaryErr.status < 500 &&
        primaryErr.status !== 429
      ) {
        throw primaryErr;
      }
      if (env.FHIR_BASE_URL_FALLBACK) {
        const fallbackUrl = `${env.FHIR_BASE_URL_FALLBACK}${path.startsWith('/') ? '' : '/'}${path}`;
        const res = await this.http.getJson<T>({
          api: 'fhir',
          url: fallbackUrl,
        });
        return { data: res.data, serverUsed: env.FHIR_BASE_URL_FALLBACK };
      }
      throw primaryErr;
    }
  }

  private calculateAge(birthDateStr?: string): number | undefined {
    if (!birthDateStr) return undefined;
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : undefined;
  }

  /** Search synthetic patients by name, gender, or birthdate. */
  async searchPatients(params: {
    name?: string;
    gender?: 'male' | 'female';
    birthdate?: string;
    maxResults?: number;
  }): Promise<{ patients: FhirPatientSummary[]; server_used: string }> {
    const qp = new URLSearchParams();
    if (params.name) qp.set('name', params.name);
    if (params.gender) qp.set('gender', params.gender);
    if (params.birthdate) qp.set('birthdate', params.birthdate);
    qp.set('_count', String(params.maxResults ?? 10));

    const { data, serverUsed } = await this.getFhir<any>(`/Patient?${qp.toString()}`);
    const entries = data.entry ?? [];

    const patients: FhirPatientSummary[] = entries.map((e: any) => {
      const p = e.resource ?? {};
      const officialName = (p.name ?? []).find((n: any) => n.use === 'official') ?? p.name?.[0];
      const given = (officialName?.given ?? []).join(' ');
      const family = officialName?.family ?? '';
      const fullName = `${given} ${family}`.trim() || 'Anonymous';
      const mrn = (p.identifier ?? []).find((id: any) =>
        id.type?.coding?.some((c: any) => c.code === 'MR'),
      )?.value;

      return {
        fhir_id: p.id ?? '',
        name: fullName,
        gender: p.gender ?? 'unknown',
        birth_date: p.birthDate ?? '',
        mrn,
        age: this.calculateAge(p.birthDate),
      };
    });

    return { patients, server_used: serverUsed };
  }

  /** Get single patient demographics. */
  async getPatient(patientId: string): Promise<{ patient: FhirPatientSummary; server_used: string }> {
    let data: any;
    let serverUsed: string;
    try {
      const result = await this.getFhir<any>(`/Patient/${encodeURIComponent(patientId)}`);
      data = result.data;
      serverUsed = result.serverUsed;
    } catch (error) {
      if (error instanceof UpstreamError && error.status === 404) {
        throw new Error(`PATIENT_NOT_FOUND: FHIR patient '${patientId}' was not found.`);
      }
      throw error;
    }
    const p = data;

    const officialName = (p.name ?? []).find((n: any) => n.use === 'official') ?? p.name?.[0];
    const given = (officialName?.given ?? []).join(' ');
    const family = officialName?.family ?? '';
    const fullName = `${given} ${family}`.trim() || 'Anonymous';
    const mrn = (p.identifier ?? []).find((id: any) =>
      id.type?.coding?.some((c: any) => c.code === 'MR'),
    )?.value;

    const addressObj = p.address?.[0];
    const addressStr = addressObj
      ? `${(addressObj.line ?? []).join(', ')}, ${addressObj.city ?? ''}, ${addressObj.state ?? ''} ${addressObj.postalCode ?? ''}`.trim()
      : undefined;

    const telecomStr = (p.telecom ?? [])
      .map((t: any) => `${t.system ?? 'phone'}: ${t.value ?? ''}`)
      .join(', ');

    return {
      patient: {
        fhir_id: p.id ?? patientId,
        name: fullName,
        gender: p.gender ?? 'unknown',
        birth_date: p.birthDate ?? '',
        age: this.calculateAge(p.birthDate),
        mrn,
        address: addressStr,
        telecom: telecomStr || undefined,
      },
      server_used: serverUsed,
    };
  }

  /** Get patient's condition / problem list. */
  async getConditions(
    patientId: string,
    clinicalStatus: 'active' | 'resolved' | 'any' = 'active',
  ): Promise<{ conditions: FhirCondition[]; server_used: string }> {
    const qp = new URLSearchParams({ patient: patientId });
    if (clinicalStatus !== 'any') {
      qp.set('clinical-status', clinicalStatus);
    }

    const { data, serverUsed } = await this.getFhir<any>(`/Condition?${qp.toString()}`);
    const entries = data.entry ?? [];

    const conditions: FhirCondition[] = entries.map((e: any) => {
      const c = e.resource ?? {};
      const coding = c.code?.coding ?? [];
      const primaryCoding = coding[0] ?? {};
      const icd10Coding = coding.find(
        (cd: any) => cd.system?.includes('icd-10') || cd.system?.includes('icd10'),
      );

      return {
        code: primaryCoding.code ?? 'UNKNOWN',
        display: c.code?.text ?? primaryCoding.display ?? 'Unspecified Condition',
        icd10: icd10Coding?.code,
        onset_date: c.onsetDateTime ?? c.onsetPeriod?.start,
        status: c.clinicalStatus?.coding?.[0]?.code ?? clinicalStatus,
        recorded_date: c.recordedDate,
      };
    });

    return { conditions, server_used: serverUsed };
  }

  /** Get patient's medication requests. */
  async getMedications(
    patientId: string,
    status: 'active' | 'stopped' | 'any' = 'active',
  ): Promise<{ medications: FhirMedication[]; server_used: string }> {
    const qp = new URLSearchParams({ patient: patientId });
    if (status !== 'any') {
      qp.set('status', status);
    }

    const { data, serverUsed } = await this.getFhir<any>(`/MedicationRequest?${qp.toString()}`);
    const entries = data.entry ?? [];

    const medications: FhirMedication[] = entries.map((e: any) => {
      const m = e.resource ?? {};
      const medConcept = m.medicationCodeableConcept;
      const coding = medConcept?.coding ?? [];
      const rxNormCoding = coding.find((c: any) => c.system?.includes('rxnorm'));

      const dosageInstruction = m.dosageInstruction?.[0];
      const dosageText = dosageInstruction?.text ?? dosageInstruction?.patientInstruction;

      return {
        name: medConcept?.text ?? coding[0]?.display ?? 'Unspecified Medication',
        rxcui: rxNormCoding?.code,
        dosage: dosageText,
        frequency: dosageInstruction?.timing?.code?.text,
        status: m.status ?? status,
        authored_on: m.authoredOn,
        prescriber: m.requester?.display,
      };
    });

    return { medications, server_used: serverUsed };
  }

  /** Get patient's vitals & lab observations. */
  async getObservations(
    patientId: string,
    category: 'vital-signs' | 'laboratory' | 'any' = 'any',
    code?: string,
    maxResults: number = 20,
  ): Promise<{ observations: FhirObservation[]; server_used: string }> {
    const qp = new URLSearchParams({
      patient: patientId,
      _count: String(maxResults),
      _sort: '-date',
    });
    if (category !== 'any') {
      qp.set('category', category);
    }
    if (code) {
      qp.set('code', code);
    }

    const { data, serverUsed } = await this.getFhir<any>(`/Observation?${qp.toString()}`);
    const entries = data.entry ?? [];

    const observations: FhirObservation[] = entries.map((e: any) => {
      const o = e.resource ?? {};
      const valueQuantity = o.valueQuantity;
      const refRange = o.referenceRange?.[0];

      return {
        code: o.code?.coding?.[0]?.code ?? 'UNKNOWN',
        display: o.code?.text ?? o.code?.coding?.[0]?.display ?? 'Observation',
        value: valueQuantity ? valueQuantity.value : o.valueString,
        unit: valueQuantity?.unit ?? valueQuantity?.code,
        date: o.effectiveDateTime ?? o.issued,
        reference_range: refRange
          ? {
              low: refRange.low?.value,
              high: refRange.high?.value,
              unit: refRange.low?.unit ?? refRange.high?.unit,
            }
          : undefined,
        flag: o.interpretation?.[0]?.coding?.[0]?.code,
      };
    });

    return { observations, server_used: serverUsed };
  }

  /** Get patient's visit / encounter timeline. */
  async getEncounters(
    patientId: string,
    maxResults: number = 10,
  ): Promise<{ encounters: FhirEncounter[]; server_used: string }> {
    const qp = new URLSearchParams({
      patient: patientId,
      _count: String(maxResults),
      _sort: '-date',
    });

    const { data, serverUsed } = await this.getFhir<any>(`/Encounter?${qp.toString()}`);
    const entries = data.entry ?? [];

    const encounters: FhirEncounter[] = entries.map((e: any) => {
      const enc = e.resource ?? {};
      const typeObj = enc.type?.[0];

      return {
        type: typeObj?.text ?? typeObj?.coding?.[0]?.display ?? enc.class?.display ?? 'Encounter',
        status: enc.status ?? 'finished',
        period_start: enc.period?.start,
        period_end: enc.period?.end,
        reason: enc.reasonCode?.[0]?.text ?? enc.reasonCode?.[0]?.coding?.[0]?.display,
        location: enc.location?.[0]?.location?.display,
      };
    });

    return { encounters, server_used: serverUsed };
  }

  /** Get patient's allergy intolerances. */
  async getAllergies(
    patientId: string,
  ): Promise<{ allergies: FhirAllergy[]; server_used: string; upstream_error?: boolean }> {
    this.validatePatientPath(`/AllergyIntolerance?patient=${encodeURIComponent(patientId)}`);
    const qp = new URLSearchParams({ patient: patientId });

    try {
      const { data, serverUsed } = await this.getFhir<any>(`/AllergyIntolerance?${qp.toString()}`);
      const entries = data.entry ?? [];

      const allergies: FhirAllergy[] = entries.map((e: any) => {
        const a = e.resource ?? {};
        const substanceText = a.code?.text ?? a.code?.coding?.[0]?.display ?? 'Unspecified Substance';
        const category = (a.category ?? [])[0];
        const reactionText = a.reaction?.[0]?.manifestation?.[0]?.text ?? a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display;

        return {
          substance: substanceText,
          category,
          criticality: a.criticality,
          reaction: reactionText,
          status: a.clinicalStatus?.coding?.[0]?.code ?? a.verificationStatus?.coding?.[0]?.code ?? 'active',
        };
      });

      return { allergies, server_used: serverUsed };
    } catch {
      return { allergies: [], server_used: 'unavailable', upstream_error: true };
    }
  }

  /** Get patient's immunization history. */
  async getImmunizations(
    patientId: string,
  ): Promise<{ immunizations: FhirImmunization[]; server_used: string; upstream_error?: boolean }> {
    this.validatePatientPath(`/Immunization?patient=${encodeURIComponent(patientId)}`);
    const qp = new URLSearchParams({ patient: patientId });

    try {
      const { data, serverUsed } = await this.getFhir<any>(`/Immunization?${qp.toString()}`);
      const entries = data.entry ?? [];

      const immunizations: FhirImmunization[] = entries.map((e: any) => {
        const imm = e.resource ?? {};
        const vText = imm.vaccineCode?.text ?? imm.vaccineCode?.coding?.[0]?.display ?? 'Vaccine';

        return {
          vaccine_name: vText,
          date: imm.occurrenceDateTime ?? imm.occurrenceString,
          status: imm.status ?? 'completed',
          lot_number: imm.lotNumber,
        };
      });

      return { immunizations, server_used: serverUsed };
    } catch {
      return { immunizations: [], server_used: 'unavailable', upstream_error: true };
    }
  }

  /**
   * Fan-out aggregator for patient summary bundle (feeds W5 flagship widget).
   * Uses Promise.allSettled to allow partial failures gracefully.
   */
  async getPatientSummary(patientId: string): Promise<FhirAggregatedSummary> {
    const [patRes, condRes, medRes, obsRes, encRes, algRes, immRes] = await Promise.allSettled([
      this.getPatient(patientId),
      this.getConditions(patientId, 'active'),
      this.getMedications(patientId, 'active'),
      this.getObservations(patientId, 'vital-signs', undefined, 10),
      this.getEncounters(patientId, 5),
      this.getAllergies(patientId),
      this.getImmunizations(patientId),
    ]);

    const sectionsFailed: string[] = [];
    let patient: FhirPatientSummary = {
      fhir_id: patientId,
      name: 'Unknown Patient',
      gender: 'unknown',
      birth_date: '',
    };

    if (patRes.status === 'fulfilled') {
      patient = patRes.value.patient;
    } else {
      sectionsFailed.push('patient');
    }

    const active_conditions = condRes.status === 'fulfilled' ? condRes.value.conditions : [];
    if (condRes.status === 'rejected') sectionsFailed.push('conditions');

    const active_medications = medRes.status === 'fulfilled' ? medRes.value.medications : [];
    if (medRes.status === 'rejected') sectionsFailed.push('medications');

    const recent_vitals = obsRes.status === 'fulfilled' ? obsRes.value.observations : [];
    if (obsRes.status === 'rejected') sectionsFailed.push('vitals');

    const recent_encounters = encRes.status === 'fulfilled' ? encRes.value.encounters : [];
    if (encRes.status === 'rejected') sectionsFailed.push('encounters');

    const allergies = algRes.status === 'fulfilled' ? algRes.value.allergies : [];
    const immunizations = immRes.status === 'fulfilled' ? immRes.value.immunizations : [];
    if (algRes.status === 'rejected' || (algRes.status === 'fulfilled' && algRes.value.upstream_error)) {
      sectionsFailed.push('allergies');
    }
    if (immRes.status === 'rejected' || (immRes.status === 'fulfilled' && immRes.value.upstream_error)) {
      sectionsFailed.push('immunizations');
    }

    const serverCandidates: string[] = [];
    for (const result of [patRes, condRes, medRes, obsRes, encRes, algRes, immRes]) {
      if (result.status === 'fulfilled' && typeof result.value.server_used === 'string') {
        if (result.value.server_used !== 'unavailable') serverCandidates.push(result.value.server_used);
      }
    }
    const serverUsed = serverCandidates.includes(env.FHIR_BASE_URL_FALLBACK)
      ? env.FHIR_BASE_URL_FALLBACK
      : serverCandidates[0] ?? 'unavailable';

    return {
      patient,
      active_conditions,
      active_medications,
      recent_vitals,
      recent_encounters,
      allergies,
      immunizations,
      allergy_note: allergies.length > 0 ? `${allergies.length} allergies recorded.` : 'No active allergies reported in FHIR record.',
      generated_at: new Date().toISOString(),
      synthetic_data: true,
      sections_failed: sectionsFailed,
      server_used: serverUsed,
    };
  }
}
