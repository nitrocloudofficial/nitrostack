/**
 * HealthBridgeService
 * ===================
 * Singleton injectable service — loads all JSON fixtures on construction and
 * exposes typed accessors used by the MCP tools.
 *
 * State is in-memory (intentional for demo/NitroCloud ephemeral deployments).
 */

import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Medicine {
  name: string;
  dosage: string;
}

export interface Visit {
  visitId: string;
  hospitalId: string;
  hospitalName: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  prescribedMedicines: Medicine[];
  testsOrdered: string[];
  allergiesNoted: string[];
  notes?: string;
}

export interface Patient {
  patientId: string;
  name: string;
  dateOfBirth: string;
  knownAllergies: string[];
  visits: Visit[];
}

export interface DrugInteraction {
  drugs: [string, string];
  severity: 'high' | 'caution';
  detail: string;
}

export interface AllergyMapping {
  contraindicated: string[];
  detail: string;
}

export interface FacilityStock {
  hospitalId: string;
  hospitalName: string;
  stock: Record<string, number>;
}

// ── v2.0 Persistence store types ─────────────────────────────────────────────

export interface ScheduledFollowup {
  patientId: string;
  patientName: string;
  urgencyTier: string;
  followupDate: string;
  recommendedFollowupDays: number;
  diagnosis: string;
  severity: string;
  doctorNotified: boolean;
  escalatedBy: string[];
  scheduledAt: string;
}

export interface Notification {
  id: string;
  timestamp: string;
  type: 'reroute' | 'replenishment' | 'safety_alert';
  hospitalId: string;
  hospitalName: string;
  medicine?: string;
  patientId?: string;
  detail: string;
  resolved: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  tool: string;
  patientId?: string;
  hospitalId?: string;
  inputSummary: string;
  outputSummary: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class HealthBridgeService {
  // Core in-memory stores
  private readonly patients: Map<string, Patient> = new Map();
  private readonly drugInteractions: Map<string, DrugInteraction> = new Map();
  private readonly allergyMappings: Map<string, AllergyMapping> = new Map();
  private readonly facilityStock: Map<string, FacilityStock> = new Map();
  private readonly sessionRiskLevels: Map<string, 'none' | 'caution' | 'high'> = new Map();

  // v2.0 persistence stores
  private readonly scheduledFollowups: Map<string, ScheduledFollowup> = new Map();
  private readonly notifications: Notification[] = [];
  private readonly auditLog: AuditEvent[] = [];

  private readonly DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    const rawPatients: Patient[] = JSON.parse(
      fs.readFileSync(path.join(this.DATA_DIR, 'patients.json'), 'utf-8'),
    );
    rawPatients.forEach((p) => this.patients.set(p.patientId, p));

    const diRaw: {
      drugInteractions: Array<{ drug1: string; drug2: string; severity: string; detail: string }>;
      allergyDrugMappings: Array<{ allergy: string; contraindicated: string[]; detail: string }>;
    } = JSON.parse(
      fs.readFileSync(path.join(this.DATA_DIR, 'drug_interactions.json'), 'utf-8'),
    );
    diRaw.drugInteractions.forEach((di) => {
      const key = this.drugPairKey(di.drug1, di.drug2);
      this.drugInteractions.set(key, { drugs: [di.drug1, di.drug2], severity: di.severity as 'high' | 'caution', detail: di.detail });
    });
    diRaw.allergyDrugMappings.forEach((am) => {
      this.allergyMappings.set(am.allergy.toLowerCase().trim(), { contraindicated: am.contraindicated, detail: am.detail });
    });

    const stockRaw: { facilities: FacilityStock[] } = JSON.parse(
      fs.readFileSync(path.join(this.DATA_DIR, 'facility_stock.json'), 'utf-8'),
    );
    stockRaw.facilities.forEach((f) => this.facilityStock.set(f.hospitalId, f));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  drugPairKey(a: string, b: string): string {
    return [a.toLowerCase().trim(), b.toLowerCase().trim()].sort().join('|');
  }

  nowIso(): string { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }
  today(): string { return new Date().toISOString().slice(0, 10); }
  addDays(n: number): string { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  shortId(): string { return Math.random().toString(36).slice(2, 10).toUpperCase(); }

  // ── Patient accessors ─────────────────────────────────────────────────────────

  hasPatient(id: string): boolean { return this.patients.has(id); }
  getPatient(id: string): Patient | undefined { return this.patients.get(id); }
  getAllPatients(): Patient[] { return Array.from(this.patients.values()); }
  getPatientCount(): number { return this.patients.size; }

  getPatientSummaries() {
    return Array.from(this.patients.values()).map((p) => ({
      patientId: p.patientId, name: p.name, dateOfBirth: p.dateOfBirth,
      knownAllergies: p.knownAllergies, visitCount: p.visits.length,
    }));
  }

  upsertPatient(patient: Patient): void { this.patients.set(patient.patientId, patient); }

  // ── Drug interaction accessors ────────────────────────────────────────────────

  getDrugInteraction(drugA: string, drugB: string): DrugInteraction | undefined {
    return this.drugInteractions.get(this.drugPairKey(drugA, drugB));
  }
  getDrugInteractionCount(): number { return this.drugInteractions.size; }

  // ── Allergy accessors ─────────────────────────────────────────────────────────

  getAllergyMapping(allergy: string): AllergyMapping | undefined {
    return this.allergyMappings.get(allergy.toLowerCase().trim());
  }
  getAllergyMappingCount(): number { return this.allergyMappings.size; }

  // ── Facility stock accessors ──────────────────────────────────────────────────

  hasFacility(id: string): boolean { return this.facilityStock.has(id); }
  getFacility(id: string): FacilityStock | undefined { return this.facilityStock.get(id); }
  getAllFacilities(): FacilityStock[] { return Array.from(this.facilityStock.values()); }

  decrementStock(hospitalId: string, medicine: string, qty: number): void {
    const fac = this.facilityStock.get(hospitalId);
    if (!fac) return;
    const med = medicine.toLowerCase().trim();
    fac.stock[med] = (fac.stock[med] ?? 0) - qty;
  }

  // ── Session risk cache ────────────────────────────────────────────────────────

  setSessionRisk(patientId: string, level: 'none' | 'caution' | 'high'): void {
    this.sessionRiskLevels.set(patientId, level);
  }
  getSessionRisk(patientId: string): 'none' | 'caution' | 'high' {
    return this.sessionRiskLevels.get(patientId) ?? 'none';
  }

  // ── Scheduled follow-ups (v2.0) ───────────────────────────────────────────────

  saveFollowup(fu: ScheduledFollowup): void { this.scheduledFollowups.set(fu.patientId, fu); }
  getFollowup(patientId: string): ScheduledFollowup | undefined { return this.scheduledFollowups.get(patientId); }
  deleteFollowup(patientId: string): ScheduledFollowup | undefined {
    const existing = this.scheduledFollowups.get(patientId);
    this.scheduledFollowups.delete(patientId);
    return existing;
  }
  getAllFollowups(): ScheduledFollowup[] { return Array.from(this.scheduledFollowups.values()); }

  // ── Notification log (v2.0) ───────────────────────────────────────────────────

  addNotification(n: Omit<Notification, 'id' | 'timestamp' | 'resolved'>): void {
    this.notifications.push({ id: this.shortId(), timestamp: this.nowIso(), resolved: false, ...n });
  }
  getNotifications(): Notification[] { return [...this.notifications]; }

  // ── Audit log (v2.0) ──────────────────────────────────────────────────────────

  addAudit(e: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    this.auditLog.push({ id: this.shortId(), timestamp: this.nowIso(), ...e });
  }
  getAuditLog(): AuditEvent[] { return [...this.auditLog]; }
}