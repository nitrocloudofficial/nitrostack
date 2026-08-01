/**
 * Thin wrapper around the Supabase client, injected everywhere data
 * access is needed. Schema lives in database/schema.sql — run that
 * against your Supabase project before calling any of these.
 */
import { Injectable } from '@nitrostack/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      // Fail loud in dev rather than silently no-op'ing every query.
      console.warn(
        '[DatabaseService] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — ' +
          'queries will fail until .env is filled in (see .env.example).'
      );
    }

    this.client = createClient(url ?? '', key ?? '');
  }

  table(name: 'users' | 'meetings' | 'meeting_participants' | 'tasks') {
    return this.client.from(name);
  }

  get raw(): SupabaseClient {
    return this.client;
  }
}
