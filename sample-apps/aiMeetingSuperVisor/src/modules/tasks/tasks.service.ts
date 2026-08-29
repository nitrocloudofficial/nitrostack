import { Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';

export interface CreateTaskInput {
  meeting_id?: string;
  title: string;
  description?: string;
  assigned_to?: string;
  assigned_by?: string;
  due_date?: string;
  effort_estimate?: string;
  clarity_score?: number;
}

@Injectable()
export class TasksService {
  constructor(private db: DatabaseService) {}

  async list(assignedTo?: string, status?: string) {
    let query = this.db.table('tasks').select('*').order('created_at', { ascending: false });
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async create(input: CreateTaskInput) {
    const { data, error } = await this.db
      .table('tasks')
      .insert({ ...input, status: 'proposed' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async decide(taskId: string, status: 'accepted' | 'denied', denialReason?: string) {
    const { data, error } = await this.db
      .table('tasks')
      .update({ status, denial_reason: denialReason ?? null, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async setAnalysis(taskId: string, effortEstimate: string, clarityScore: number) {
    const { data, error } = await this.db
      .table('tasks')
      .update({ effort_estimate: effortEstimate, clarity_score: clarityScore })
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async markDone(taskId: string) {
    const { data, error } = await this.db
      .table('tasks')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
