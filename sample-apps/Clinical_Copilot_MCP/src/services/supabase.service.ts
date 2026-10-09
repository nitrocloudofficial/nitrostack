import { Injectable, OnModuleInit } from '@nitrostack/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envConfig } from '../config/env.config.js';

/**
 * Clinical Copilot MCP Server - Supabase Storage & Auth Service
 *
 * Manages interaction with Supabase Storage buckets (e.g. 'medical-reports')
 * and Supabase Authentication.
 * Uses SUPABASE_SERVICE_ROLE_KEY for server-side administrative access (bypassing RLS).
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient | null = null;
  private bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'medical-reports';

  async onModuleInit(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL || envConfig.database.supabaseUrl;
    // Prefer SUPABASE_SERVICE_ROLE_KEY for server-side operations, fall back to SUPABASE_KEY / ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.database.supabaseServiceRoleKey;
    const anonKey = process.env.SUPABASE_KEY || envConfig.database.supabaseAnonKey;
    const activeKey = serviceRoleKey && !serviceRoleKey.includes('placeholder') ? serviceRoleKey : anonKey;

    if (supabaseUrl && activeKey && !supabaseUrl.includes('placeholder') && !activeKey.includes('placeholder')) {
      try {
        const isServiceRole = activeKey === serviceRoleKey;
        this.client = createClient(supabaseUrl, activeKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        console.error(`[SupabaseService] Successfully initialized Supabase client (${isServiceRole ? 'Service Role Key (RLS Bypass)' : 'Anon Key'}).`);
      } catch (error: any) {
        console.error(`[SupabaseService] Warning initializing Supabase client: ${error.message}`);
      }
    } else {
      console.error('[SupabaseService] Running with fallback mock URL generator (SUPABASE_URL or Service Role Key not configured).');
    }
  }

  /**
   * Uploads a file buffer to a specified Supabase Storage bucket.
   */
  async uploadFile(
    bucket: string,
    path: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<{ path: string; publicUrl: string }> {
    const activeBucket = bucket || this.bucketName;
    if (this.client) {
      try {
        let { data, error } = await this.client.storage
          .from(activeBucket)
          .upload(path, fileBuffer, {
            contentType,
            upsert: true,
          });

        if (error && activeBucket !== this.bucketName) {
          console.warn(`[SupabaseService] Storage upload to bucket '${activeBucket}' failed (${error.message}). Retrying upload to main bucket '${this.bucketName}'...`);
          const fallbackPath = `${activeBucket}/${path}`;
          const retryRes = await this.client.storage
            .from(this.bucketName)
            .upload(fallbackPath, fileBuffer, {
              contentType,
              upsert: true,
            });

          if (!retryRes.error && retryRes.data) {
            const { data: publicUrlData } = this.client.storage.from(this.bucketName).getPublicUrl(retryRes.data.path);
            return {
              path: retryRes.data.path,
              publicUrl: publicUrlData.publicUrl,
            };
          }
        }

        if (error) {
          console.error(`[SupabaseService] Storage upload error: ${error.message}`);
          const mockBaseUrl = process.env.SUPABASE_URL || 'https://cryrowvvnaiwplndhffd.supabase.co';
          return {
            path,
            publicUrl: `${mockBaseUrl}/storage/v1/object/public/${this.bucketName}/${path}`,
          };
        }

        const { data: publicUrlData } = this.client.storage.from(activeBucket).getPublicUrl(data!.path);
        return {
          path: data!.path,
          publicUrl: publicUrlData.publicUrl,
        };
      } catch (err: any) {
        console.error(`[SupabaseService] Network/TLS error uploading file: ${err.message}`);
        const mockBaseUrl = process.env.SUPABASE_URL || 'https://cryrowvvnaiwplndhffd.supabase.co';
        return {
          path,
          publicUrl: `${mockBaseUrl}/storage/v1/object/public/${this.bucketName}/${path}`,
        };
      }
    } else {
      // Fallback mock public URL when Supabase credentials are not yet configured
      const mockBaseUrl = process.env.SUPABASE_URL || 'https://cryrowvvnaiwplndhffd.supabase.co';
      const mockPublicUrl = `${mockBaseUrl}/storage/v1/object/public/${this.bucketName}/${path}`;
      return {
        path,
        publicUrl: mockPublicUrl,
      };
    }
  }

  /**
   * Retrieves the public URL for a file in Supabase Storage.
   */
  getPublicUrl(bucket: string, path: string): string {
    if (this.client) {
      const { data } = this.client.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    const mockBaseUrl = process.env.SUPABASE_URL || 'https://cryrowvvnaiwplndhffd.supabase.co';
    return `${mockBaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }

  /**
   * Exposes raw SupabaseClient for administrative operations (Auth, RLS bypass queries).
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }
}
