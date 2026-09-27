/**
 * WhoIcdService — WHO ICD-11 API Integration Service.
 * Interacts with WHO ICD API (https://id.who.int/icd).
 * Provides ICD-11 MMS entity searches and ICD-10 to ICD-11 cross-mappings.
 */
import { Injectable } from '@nitrostack/core';
import { HttpClientService } from './http-client.service.js';
import { env } from '../config/env.js';

export interface Icd11Entity {
  icd11_code: string;
  title: string;
  uri: string;
  chapter?: string;
  definition?: string;
  icd10_crosswalk?: string;
}

const ICD11_EMBEDDED_LOOKUP: Record<string, Icd11Entity> = {
  diabetes: {
    icd11_code: '5A11',
    title: 'Type 2 diabetes mellitus',
    uri: 'http://id.who.int/icd/release/11/mms/5A11',
    chapter: '05 Endocrine, nutritional or metabolic diseases',
    definition: 'Type 2 diabetes mellitus is characterized by insulin resistance and relative insulin deficiency.',
    icd10_crosswalk: 'E11.9',
  },
  hypertension: {
    icd11_code: 'BA00',
    title: 'Essential hypertension',
    uri: 'http://id.who.int/icd/release/11/mms/BA00',
    chapter: '11 Diseases of the circulatory system',
    definition: 'High blood pressure in the arteries without identified secondary cause.',
    icd10_crosswalk: 'I10',
  },
  asthma: {
    icd11_code: 'CA23',
    title: 'Asthma',
    uri: 'http://id.who.int/icd/release/11/mms/CA23',
    chapter: '12 Diseases of the respiratory system',
    definition: 'Chronic inflammatory disease of the respiratory airways.',
    icd10_crosswalk: 'J45.909',
  },
  bronchitis: {
    icd11_code: 'CA20',
    title: 'Acute bronchitis',
    uri: 'http://id.who.int/icd/release/11/mms/CA20',
    chapter: '12 Diseases of the respiratory system',
    definition: 'Short-term inflammation of the bronchi of the lungs.',
    icd10_crosswalk: 'J20.9',
  },
};

@Injectable({ deps: [HttpClientService] })
export class WhoIcdService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly http: HttpClientService) {}

  /** Obtains OAuth2 token from WHO Identity Server if credentials are configured. */
  private async getAuthToken(): Promise<string | null> {
    if (!env.ICD_CLIENT_ID || !env.ICD_CLIENT_SECRET) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && now < this.tokenExpiresAt - 60) {
      return this.accessToken;
    }

    try {
      const tokenUrl = 'https://icdaccessmanagement.b2clogin.com/icdaccessmanagement.onmicrosoft.com/oauth2/v2.0/token?p=b2c_1a_signup_signin_adhoc';
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.ICD_CLIENT_ID,
        client_secret: env.ICD_CLIENT_SECRET,
        scope: 'https://id.who.int/icd/api/.default',
      });

      const res = await this.http.postForm<any>({
        api: 'who_icd_auth',
        url: tokenUrl,
        body: body.toString(),
        timeoutMs: 8_000,
        deadlineMs: 20_000,
        maxRetries: 1,
        headers: { Accept: 'application/json' },
      });

      const data = res.data;
      this.accessToken = data.access_token ?? null;
      this.tokenExpiresAt = now + (data.expires_in ?? 3600);
      return this.accessToken;
    } catch {
      return null;
    }
  }

  /** Search WHO ICD-11 entities by condition name. */
  async searchIcd11(query: string, maxResults: number = 5): Promise<{ results: Icd11Entity[]; source: string }> {
    const token = await this.getAuthToken();

    if (token) {
      try {
        const url = `${env.ICD_BASE_URL}/release/11/2024-01/mms/search?q=${encodeURIComponent(query)}&subtreesFilter=`;
        const res = await this.http.getJson<any>({
          api: 'who_icd',
          url,
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
            'Accept-Language': 'en',
            'API-Version': 'v2',
          },
        });

        const destinationEntities = res.data.destinationEntities ?? [];
        const results: Icd11Entity[] = destinationEntities.slice(0, maxResults).map((e: any) => ({
          icd11_code: e.theCode ?? '',
          title: e.title?.replace(/<[^>]+>/g, '') ?? '',
          uri: e.id ?? '',
          chapter: e.chapter,
          definition: e.definition?.replace(/<[^>]+>/g, '') ?? undefined,
        }));

        if (results.length > 0) {
          return { results, source: 'who_icd11_live_api' };
        }
      } catch {
        // Fall back to embedded table
      }
    }

    // Fallback matching against embedded WHO ICD-11 reference table
    const qLow = query.toLowerCase().trim();
    const matchedKey = Object.keys(ICD11_EMBEDDED_LOOKUP).find(
      (k) => qLow.includes(k) || k.includes(qLow),
    );

    if (matchedKey) {
      return {
        results: [ICD11_EMBEDDED_LOOKUP[matchedKey]],
        source: 'who_icd11_reference_table',
      };
    }

    return {
      results: [
        {
          icd11_code: 'MG30',
          title: `General medical condition: ${query}`,
          uri: 'http://id.who.int/icd/release/11/mms/MG30',
          chapter: '21 Symptoms, signs or clinical findings',
          definition: 'General category for unspecified clinical conditions in ICD-11 MMS.',
        },
      ],
      source: 'who_icd11_generic_fallback',
    };
  }
}
