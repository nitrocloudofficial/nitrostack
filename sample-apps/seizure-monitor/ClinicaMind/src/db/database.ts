import fs from 'fs';
import path from 'path';

export interface DatabaseStore {
  users: any[];
  patients: any[];
  patient_documents: any[];
  medical_history: any[];
  family_history: any[];
  lifestyle: any[];
  allergies: any[];
  current_medications: any[];
  past_medications: any[];
  vaccinations: any[];
  lab_reports: any[];
  imaging: any[];
  vitals: any[];
  visits: any[];
  transcripts: any[];
  supervisor_executions: any[];
  agent_executions: any[];
  agent_outputs: any[];
  reports: any[];
  audit_logs: any[];
  intake_packages: any[];
  intake_attachments: any[];
}

const DEFAULT_STORE: DatabaseStore = {
  users: [],
  patients: [],
  patient_documents: [],
  medical_history: [],
  family_history: [],
  lifestyle: [],
  allergies: [],
  current_medications: [],
  past_medications: [],
  vaccinations: [],
  lab_reports: [],
  imaging: [],
  vitals: [],
  visits: [],
  transcripts: [],
  supervisor_executions: [],
  agent_executions: [],
  agent_outputs: [],
  reports: [],
  audit_logs: [],
  intake_packages: [],
  intake_attachments: []
};

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'clinicamind.json');

export class RelationalDatabase {
  private data: DatabaseStore;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseStore {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      this.save(DEFAULT_STORE);
      return { ...DEFAULT_STORE };
    }
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return { ...DEFAULT_STORE, ...JSON.parse(content) };
    } catch {
      return { ...DEFAULT_STORE };
    }
  }

  private save(store?: DatabaseStore) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store || this.data, null, 2), 'utf-8');
  }

  public getTable<T = any>(table: keyof DatabaseStore): T[] {
    this.data = this.load();
    return (this.data[table] || []) as T[];
  }

  public insert<T = any>(table: keyof DatabaseStore, record: T): T {
    this.data = this.load();
    if (!this.data[table]) {
      this.data[table] = [];
    }
    // Remove existing if duplicate id
    const recAny = record as any;
    if (recAny.id) {
      this.data[table] = this.data[table].filter((item: any) => item.id !== recAny.id);
    }
    this.data[table].push(record);
    this.save();
    return record;
  }

  public update<T = any>(table: keyof DatabaseStore, id: string, updates: Partial<T>): T | null {
    this.data = this.load();
    const list = this.data[table] || [];
    const index = list.findIndex((item: any) => item.id === id);
    if (index === -1) return null;

    const updated = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
    this.data[table][index] = updated;
    this.save();
    return updated as T;
  }

  public delete(table: keyof DatabaseStore, id: string): boolean {
    this.data = this.load();
    const initialLen = (this.data[table] || []).length;
    this.data[table] = (this.data[table] || []).filter((item: any) => item.id !== id);
    const deleted = this.data[table].length < initialLen;
    if (deleted) this.save();
    return deleted;
  }

  public close() {}
}

let dbInstance: RelationalDatabase | null = null;

export function getDb(): RelationalDatabase {
  if (!dbInstance) {
    dbInstance = new RelationalDatabase();
  }
  return dbInstance;
}

export function initDb(): RelationalDatabase {
  return getDb();
}

export default getDb;
