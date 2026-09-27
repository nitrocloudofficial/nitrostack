/**
 * ClinicalTablesService — NLM Clinical Table Search Service client.
 * Primary terminology service for ICD-10-CM lookup and symptom-to-code search.
 */
import { Injectable } from '@nitrostack/core';
import { HttpClientService } from './http-client.service.js';
import { env } from '../config/env.js';

export interface Icd10SearchResult {
  icd10_code: string;
  name: string;
  synonyms: string[];
}

@Injectable({ deps: [HttpClientService] })
export class ClinicalTablesService {
  constructor(private readonly http: HttpClientService) {}

  /** Search ICD-10-CM codes by term or condition name. */
  async searchIcd10(query: string, maxResults: number = 10): Promise<Icd10SearchResult[]> {
    const params = new URLSearchParams({
      terms: query,
      maxList: String(maxResults),
      sf: 'code,name',
      df: 'code,name',
    });

    const url = `${env.CLINTABLES_BASE_URL}/icd10cm/v3/search?${params.toString()}`;

    const res = await this.http.getJson<[number, string[], null, Array<[string, string]>]>({
      api: 'clinicaltables',
      url,
    });

    const data = res.data;
    if (!Array.isArray(data) || !Array.isArray(data[3])) {
      return [];
    }

    const rows = data[3];
    return rows.map(([code, name]) => ({
      icd10_code: code ?? '',
      name: name ?? '',
      synonyms: [],
    }));
  }
}
