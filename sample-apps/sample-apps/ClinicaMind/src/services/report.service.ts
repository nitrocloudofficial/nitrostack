import { ReportRepository, ReportEntity } from '../db/repositories/report.repository.js';
import { AuditRepository } from '../db/repositories/audit.repository.js';

export class ReportService {
  static getReports(patientId?: string) {
    return ReportRepository.getAll(patientId);
  }

  static getReportById(id: string) {
    return ReportRepository.getById(id);
  }

  static createReport(data: Omit<ReportEntity, 'id'> & { id?: string }) {
    const id = data.id || 'rep-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const created = ReportRepository.create({
      ...data,
      id
    });

    AuditRepository.log('REPORT_GENERATED', 'Report', id, { title: data.title, reportType: data.reportType });
    return created;
  }

  static updateReport(id: string, updates: Partial<ReportEntity>) {
    const updated = ReportRepository.update(id, updates);
    if (updated) {
      AuditRepository.log('REPORT_UPDATED', 'Report', id, updates);
    }
    return updated;
  }
}
