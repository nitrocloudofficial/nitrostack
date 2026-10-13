import getDb from '../database.js';

export interface AuditLogEntity {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string; // JSON
  createdAt?: string;
}

export class AuditRepository {
  static getAll(limit: number = 100): AuditLogEntity[] {
    const db = getDb();
    const list = db.getTable<AuditLogEntity>('audit_logs');
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit);
  }

  static log(action: string, entityType: string, entityId?: string, details?: any, userId?: string): AuditLogEntity {
    const db = getDb();
    const id = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : undefined;

    const record: AuditLogEntity = {
      id,
      userId,
      action,
      entityType,
      entityId,
      details: detailsStr,
      createdAt: now
    };

    return db.insert('audit_logs', record);
  }
}
