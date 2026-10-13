import { Injectable } from '@nitrostack/core';

export interface MfApiNavPoint {
  /** DD-MM-YYYY, as returned by mfapi.in */
  date: string;
  /** mfapi.in returns NAV as a string — parse before use */
  nav: string;
}

export interface MfApiSchemeMeta {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
}

export interface MfApiSchemeResponse {
  meta: MfApiSchemeMeta;
  data: MfApiNavPoint[];
}

export class MfApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'MfApiError';
  }
}

const MFAPI_BASE_URL = 'https://api.mfapi.in/mf';
const REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class MfApiClient {
  async getSchemeHistory(schemeCode: string): Promise<MfApiSchemeResponse> {
    return this.fetchJson(`${MFAPI_BASE_URL}/${schemeCode}`);
  }

  async getLatestNav(schemeCode: string): Promise<{ date: string; nav: number; schemeName: string }> {
    const response = await this.fetchJson(`${MFAPI_BASE_URL}/${schemeCode}/latest`);
    const point = response.data[0];
    if (!point) {
      throw new MfApiError(`mfapi.in returned no NAV data for scheme ${schemeCode}`);
    }
    return { date: point.date, nav: parseFloat(point.nav), schemeName: response.meta.scheme_name };
  }

  private async fetchJson(url: string): Promise<MfApiSchemeResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new MfApiError(`mfapi.in responded with HTTP ${res.status} for ${url}`);
      }
      const body = (await res.json()) as MfApiSchemeResponse;
      if (!Array.isArray(body.data) || body.data.length === 0) {
        throw new MfApiError(`mfapi.in returned no data array for ${url}`);
      }
      return body;
    } catch (err) {
      if (err instanceof MfApiError) throw err;
      throw new MfApiError(`Failed to reach mfapi.in at ${url}`, err);
    } finally {
      clearTimeout(timeout);
    }
  }
}
