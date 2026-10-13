import getDb from '../database.js';

export interface TranscriptEntity {
  id: string;
  visitId: string;
  speaker: 'Doctor' | 'Patient' | 'System';
  text: string;
  confidence: number;
  isFinal: number; // 0 or 1
  timestamp?: string;
}

export class TranscriptRepository {
  static getByVisitId(visitId: string): TranscriptEntity[] {
    const db = getDb();
    const list = db.getTable<TranscriptEntity>('transcripts');
    return list.filter((t) => t.visitId === visitId).sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  }

  static addTurn(transcript: TranscriptEntity): TranscriptEntity {
    const db = getDb();
    const now = transcript.timestamp || new Date().toISOString();
    const record: TranscriptEntity = {
      ...transcript,
      timestamp: now
    };
    return db.insert('transcripts', record);
  }
}
