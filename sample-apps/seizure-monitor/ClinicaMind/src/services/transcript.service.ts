import { TranscriptRepository, TranscriptEntity } from '../db/repositories/transcript.repository.js';
import { AuditRepository } from '../db/repositories/audit.repository.js';

export class TranscriptService {
  static getTranscriptsByVisit(visitId: string) {
    return TranscriptRepository.getByVisitId(visitId);
  }

  static addTranscriptTurn(data: {
    visitId: string;
    speaker: 'Doctor' | 'Patient' | 'System';
    text: string;
    confidence?: number;
    isFinal?: boolean;
  }) {
    const id = 'tr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const added = TranscriptRepository.addTurn({
      id,
      visitId: data.visitId,
      speaker: data.speaker,
      text: data.text,
      confidence: data.confidence || 0.95,
      isFinal: data.isFinal !== undefined ? (data.isFinal ? 1 : 0) : 1
    });

    AuditRepository.log('TRANSCRIPT_RECEIVED', 'Visit', data.visitId, { speaker: data.speaker, snippet: data.text.substring(0, 50) });
    return added;
  }
}
