import { Injectable } from '@nitrostack/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

/**
 * Supabase Service
 * 
 * Lazy-loads the Supabase client with WebSocket polyfill for Node.js compatibility.
 * Handles missing credentials gracefully.
 */
@Injectable()
export class SupabaseService {
  private static instance: SupabaseClient | null = null;
  private static initialized = false;

  /**
   * Get or create the Supabase client
   * Uses lazy initialization to avoid WebSocket errors at startup
   */
  static getClient(): SupabaseClient | null {
    if (this.initialized) {
      return this.instance;
    }

    this.initialized = true;

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return null;
    }

    if (!process.env.SUPABASE_URL.startsWith('http')) {
      return null;
    }

    try {
      if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket === 'undefined') {
        // Node 20+ does not expose a native WebSocket implementation.
        (globalThis as any).WebSocket = WebSocket;
      }

      const clientOptions: any = {
        realtime: {
          transport: 'websockets',
        },
        global: {
          WebSocket: globalThis.WebSocket,
        },
      };

      this.instance = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        clientOptions
      );

      return this.instance;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the Supabase client or throw an error if unavailable.
   */
  static getClientOrThrow(): SupabaseClient {
    const client = this.getClient();
    if (!client) {
      throw new Error('Supabase client unavailable. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
    }
    return client;
  }

  /**
   * Check if Supabase is available
   */
  static isAvailable(): boolean {
    return this.getClient() !== null;
  }
}
