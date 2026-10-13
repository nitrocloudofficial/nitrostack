import getDb from '../database.js';

export interface ReportEntity {
  id: string;
  visitId: string;
  patientId: string;
  reportType: 'DISCHARGE_SUMMARY' | 'SOAP_NOTE' | 'REFERRAL' | 'PRESCRIPTION' | 'CLINICAL_SUMMARY';
  title: string;
  content: string;
  status: 'DRAFT' | 'FINALIZED' | 'SIGNED';
  generatedAt?: string;
  signedAt?: string;
}

export class ReportRepository {
  static getAll(patientId?: string): ReportEntity[] {
    const db = getDb();
    const list = db.getTable<ReportEntity>('reports');
    if (patientId) {
      return list.filter((r) => r.patientId === patientId).sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''));
    }
    return list.sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''));
  }

  static getById(id: string): ReportEntity | null {
    const db = getDb();
    const list = db.getTable<ReportEntity>('reports');
    return list.find((r) => r.id === id) || null;
  }

  static create(report: ReportEntity): ReportEntity {
    const db = getDb();
    const now = report.generatedAt || new Date().toISOString();
    return db.insert('reports', { ...report, generatedAt: now });
  }

  static update(id: string, updates: Partial<ReportEntity>): ReportEntity | null {
    const db = getDb();
    return db.update<ReportEntity>('reports', id, updates);
  }
}
