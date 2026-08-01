import getDb from '../database.js';

export interface VisitEntity {
  id: string;
  patientId: string;
  doctorId?: string;
  visitStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  chiefComplaint?: string;
  startedAt: string;
  endedAt?: string;
  symptoms?: string; // JSON
  diagnosis?: string; // JSON
  medicationsOrdered?: string; // JSON
  testsOrdered?: string; // JSON
  researchFindings?: string; // JSON
  riskAssessment?: string; // JSON
  aiSummary?: string;
  clinicalNotes?: string;
  followUpPlan?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class VisitRepository {
  static getAll(patientId?: string): VisitEntity[] {
    const db = getDb();
    const list = db.getTable<VisitEntity>('visits');
    if (patientId) {
      return list.filter((v) => v.patientId === patientId).sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
    }
    return list.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  }

  static getById(id: string): VisitEntity | null {
    const db = getDb();
    const list = db.getTable<VisitEntity>('visits');
    return list.find((v) => v.id === id) || null;
  }

  static create(visit: VisitEntity): VisitEntity {
    const db = getDb();
    const now = new Date().toISOString();
    const record: VisitEntity = {
      ...visit,
      startedAt: visit.startedAt || now,
      createdAt: visit.createdAt || now,
      updatedAt: visit.updatedAt || now
    };
    return db.insert('visits', record);
  }

  static update(id: string, updates: Partial<VisitEntity>): VisitEntity | null {
    const db = getDb();
    return db.update<VisitEntity>('visits', id, updates);
  }

  static delete(id: string): boolean {
    const db = getDb();
    return db.delete('visits', id);
  }
}
