import { VisitRepository, VisitEntity } from '../db/repositories/visit.repository.js';
import { TranscriptRepository } from '../db/repositories/transcript.repository.js';
import { AiExecutionRepository } from '../db/repositories/ai-execution.repository.js';
import { AuditRepository } from '../db/repositories/audit.repository.js';

export class VisitService {
  static getVisits(patientId?: string) {
    return VisitRepository.getAll(patientId);
  }

  static getVisitDetails(id: string) {
    const visit = VisitRepository.getById(id);
    if (!visit) return null;

    const transcripts = TranscriptRepository.getByVisitId(id);
    const aiExecutions = AiExecutionRepository.getExecutionsByVisit(id);

    return {
      ...visit,
      transcripts,
      aiExecutions
    };
  }

  static startVisit(patientId: string, chiefComplaint?: string, doctorId?: string) {
    const id = 'v-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const created = VisitRepository.create({
      id,
      patientId,
      doctorId,
      visitStatus: 'IN_PROGRESS',
      chiefComplaint,
      startedAt: new Date().toISOString()
    });

    AuditRepository.log('VISIT_STARTED', 'Visit', id, { patientId, chiefComplaint });
    return created;
  }

  static updateVisit(id: string, updates: Partial<VisitEntity>) {
    const updated = VisitRepository.update(id, updates);
    if (updated) {
      AuditRepository.log('VISIT_UPDATED', 'Visit', id, updates);
    }
    return updated;
  }
}
