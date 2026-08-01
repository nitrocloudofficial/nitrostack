import getDb from '../database.js';

export interface PatientEntity {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  bloodGroup?: string;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  insurance?: string;
  primaryDoctor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class PatientRepository {
  static getAll(): PatientEntity[] {
    const db = getDb();
    return db.getTable<PatientEntity>('patients').sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }

  static getById(id: string): PatientEntity | null {
    const db = getDb();
    const list = db.getTable<PatientEntity>('patients');
    return list.find((p) => p.id === id) || null;
  }

  static getByMrn(mrn: string): PatientEntity | null {
    const db = getDb();
    const list = db.getTable<PatientEntity>('patients');
    return list.find((p) => p.mrn.toLowerCase() === mrn.toLowerCase()) || null;
  }

  static search(query: string): PatientEntity[] {
    const db = getDb();
    const q = query.toLowerCase();
    return db.getTable<PatientEntity>('patients').filter((p) =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.primaryDoctor && p.primaryDoctor.toLowerCase().includes(q))
    );
  }

  static create(patient: PatientEntity): PatientEntity {
    const db = getDb();
    const now = new Date().toISOString();
    const record: PatientEntity = {
      ...patient,
      createdAt: patient.createdAt || now,
      updatedAt: patient.updatedAt || now
    };
    return db.insert('patients', record);
  }

  static update(id: string, updates: Partial<PatientEntity>): PatientEntity | null {
    const db = getDb();
    return db.update<PatientEntity>('patients', id, updates);
  }

  static delete(id: string): boolean {
    const db = getDb();
    return db.delete('patients', id);
  }
}
