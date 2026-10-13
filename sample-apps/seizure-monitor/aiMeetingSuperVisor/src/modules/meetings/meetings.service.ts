import { Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';

export interface CreateMeetingInput {
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  organizer_id?: string;
  participant_ids?: string[];
}

@Injectable()
export class MeetingsService {
  constructor(private db: DatabaseService) {}

  async list(status?: string) {
    let query = this.db.table('meetings').select('*').order('scheduled_start', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getById(id: string) {
    const { data, error } = await this.db.table('meetings').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(input: CreateMeetingInput) {
    const { data, error } = await this.db
      .table('meetings')
      .insert({
        title: input.title,
        scheduled_start: input.scheduled_start,
        scheduled_end: input.scheduled_end,
        organizer_id: input.organizer_id,
        status: 'scheduled'
      })
      .select()
      .single();
    if (error) throw error;

    if (input.participant_ids?.length) {
      await this.db
        .table('meeting_participants')
        .insert(input.participant_ids.map((user_id) => ({ meeting_id: data.id, user_id })));
    }

    return data;
  }

  /**
   * Marks a meeting complete and hands it to the Summarizer Agent
   * pipeline (transcription -> keynote extraction -> embed into the
   * Brain). See modules/agents and modules/brain — this just flips
   * status until that pipeline is wired in.
   */
  async complete(id: string, transcript?: string) {
    const { data, error } = await this.db
      .table('meetings')
      .update({ status: 'completed', transcript: transcript ?? null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async markMissed(id: string) {
    const { data, error } = await this.db
      .table('meetings')
      .update({ status: 'missed' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
