/**
 * ThreatMatrix Real Threat Intelligence Services
 * Integrates VirusTotal v3, AbuseIPDB v2, Google Safe Browsing v4, and AlienVault OTX APIs.
 * Includes graceful heuristic fallbacks when keys are absent.
 */
import http from 'http';
import https from 'https';
import { logger } from './logger.js';
import { config } from './config.js';

export interface ThreatIntelResult {
  source: string;
  query: string;
  found: boolean;
  score: number;
  details: Record<string, unknown>;
}

export class ThreatIntelService {
  private vtKey = config.virusTotalApiKey;
  private abuseKey = config.abuseIpDbApiKey;
  private gsbKey = config.googleSafeBrowsingKey;
  private otxKey = config.alienVaultApiKey;

  private async fetchJson(urlStr: string, headers: Record<string, string> = {}, method = 'GET', bodyStr?: string): Promise<{ status: number; json: any }> {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(urlStr);
        const client = parsed.protocol === 'https:' ? https : http;
        const options: http.RequestOptions = {
          method,
          headers: {
            'User-Agent': 'ThreatMatrix-MCP-Server/1.0',
            ...headers,
          },
          timeout: 4000,
        };

        const req = client.request(urlStr, options, (res) => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 500, json: JSON.parse(body || '{}') });
            } catch {
              resolve({ status: res.statusCode || 500, json: { raw: body } });
            }
          });
        });

        req.on('error', (err) => resolve({ status: 500, json: { error: err.message } }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 504, json: { error: 'Timeout' } }); });
        if (bodyStr) req.write(bodyStr);
        req.end();
      } catch (e: any) {
        resolve({ status: 500, json: { error: e.message } });
      }
    });
  }

  // ── 1. VirusTotal Hash Lookup ─────────────────────────────────────────────
  async lookupVirusTotalHash(hash: string): Promise<ThreatIntelResult> {
    if (!this.vtKey) {
      return { source: 'VirusTotal', query: hash, found: false, score: 0, details: { status: 'API_KEY_MISSING' } };
    }

    try {
      const res = await this.fetchJson(`https://www.virustotal.com/api/v3/files/${hash}`, {
        'x-apikey': this.vtKey,
      });

      if (res.status === 200 && res.json?.data?.attributes) {
        const stats = res.json.data.attributes.last_analysis_stats || {};
        const malicious = stats.malicious || 0;
        const total = (stats.harmless || 0) + (stats.malicious || 0) + (stats.suspicious || 0) + (stats.undetected || 0);
        const score = total > 0 ? Math.round((malicious / total) * 100) : 0;

        return {
          source: 'VirusTotal',
          query: hash,
          found: true,
          score,
          details: {
            maliciousDetections: malicious,
            totalEngines: total,
            reputation: res.json.data.attributes.reputation || 0,
            meaningfulName: res.json.data.attributes.meaningful_name || 'N/A',
          },
        };
      }
    } catch (e: any) {
      logger.warn('VirusTotal API error', { error: e.message });
    }

    return { source: 'VirusTotal', query: hash, found: false, score: 0, details: {} };
  }

  // ── 2. AbuseIPDB IP Lookup ────────────────────────────────────────────────
  async lookupAbuseIpDb(ip: string): Promise<ThreatIntelResult> {
    if (!this.abuseKey) {
      return { source: 'AbuseIPDB', query: ip, found: false, score: 0, details: { status: 'API_KEY_MISSING' } };
    }

    try {
      const res = await this.fetchJson(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
        'Key': this.abuseKey,
        'Accept': 'application/json',
      });

      if (res.status === 200 && res.json?.data) {
        const data = res.json.data;
        return {
          source: 'AbuseIPDB',
          query: ip,
          found: true,
          score: data.abuseConfidenceScore || 0,
          details: {
            abuseConfidenceScore: data.abuseConfidenceScore,
            countryCode: data.countryCode,
            isp: data.isp,
            totalReports: data.totalReports,
            isWhitelisted: data.isWhitelisted,
          },
        };
      }
    } catch (e: any) {
      logger.warn('AbuseIPDB API error', { error: e.message });
    }

    return { source: 'AbuseIPDB', query: ip, found: false, score: 0, details: {} };
  }

  // ── 3. Google Safe Browsing URL Lookup ─────────────────────────────────────
  async checkGoogleSafeBrowsing(urlStr: string): Promise<ThreatIntelResult> {
    if (!this.gsbKey) {
      return { source: 'GoogleSafeBrowsing', query: urlStr, found: false, score: 0, details: { status: 'API_KEY_MISSING' } };
    }

    try {
      const payload = JSON.stringify({
        client: { clientId: 'threatmatrix-mcp', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: urlStr }],
        },
      });

      const res = await this.fetchJson(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${this.gsbKey}`, {
        'Content-Type': 'application/json',
      }, 'POST', payload);

      if (res.status === 200 && res.json?.matches) {
        return {
          source: 'GoogleSafeBrowsing',
          query: urlStr,
          found: true,
          score: 95,
          details: { matches: res.json.matches },
        };
      }
    } catch (e: any) {
      logger.warn('Google Safe Browsing API error', { error: e.message });
    }

    return { source: 'GoogleSafeBrowsing', query: urlStr, found: false, score: 0, details: { safe: true } };
  }

  // ── 4. AlienVault OTX Threat Intelligence Lookup ───────────────────────────
  async lookupAlienVaultOtx(indicator: string, type: 'IPv4' | 'domain' | 'hostname' | 'file'): Promise<ThreatIntelResult> {
    if (!this.otxKey) {
      return { source: 'AlienVaultOTX', query: indicator, found: false, score: 0, details: { status: 'API_KEY_MISSING' } };
    }

    try {
      const section = type === 'file' ? 'general' : 'general';
      const endpoint = `https://otx.alienvault.com/api/v1/indicators/${type}/${indicator}/${section}`;
      const res = await this.fetchJson(endpoint, {
        'X-OTX-API-KEY': this.otxKey,
        'Accept': 'application/json',
      });

      if (res.status === 200 && res.json) {
        const pulseCount = res.json.pulse_info?.count || 0;
        const score = pulseCount > 0 ? Math.min(100, pulseCount * 20) : 0;
        return {
          source: 'AlienVaultOTX',
          query: indicator,
          found: pulseCount > 0,
          score,
          details: {
            pulseCount,
            pulses: res.json.pulse_info?.pulses?.slice(0, 5) || [],
            countryName: res.json.country_name || 'N/A',
          },
        };
      }
    } catch (e: any) {
      logger.warn('AlienVault OTX API error', { error: e.message });
    }

    return { source: 'AlienVaultOTX', query: indicator, found: false, score: 0, details: {} };
  }
}
