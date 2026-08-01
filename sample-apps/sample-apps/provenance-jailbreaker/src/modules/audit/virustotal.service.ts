import { Injectable } from '@nitrostack/core';

const IP_PATTERN   = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
const HASH_PATTERN = /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/;

export interface VtResult {
  checked:         boolean;
  indicator_type?: 'ip' | 'domain' | 'hash';
  verdict?:        'malicious' | 'suspicious' | 'harmless';
  stats?:          { malicious: number; suspicious: number; harmless: number; undetected: number };
  vt_link?:        string;
  error?:          string;
}

/**
 * VirusTotalService — optional threat-intel enrichment.
 *
 * Checks IPs, domains, and file hashes against VirusTotal.
 * Gracefully returns { checked: false } when VIRUSTOTAL_API_KEY is not set
 * — the pipeline continues without blocking.
 *
 * NOTE: URL checking is intentionally excluded (VT's URL endpoint requires
 * prior submission and returns 404 for unseen URLs, not harmless verdicts).
 */
@Injectable()
export class VirusTotalService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.virustotal.com/api/v3';

  constructor() {
    this.apiKey = process.env.VIRUSTOTAL_API_KEY ?? '';
  }

  async checkValue(value: unknown): Promise<VtResult> {
    if (!this.apiKey) return { checked: false, error: 'VIRUSTOTAL_API_KEY not set — skipping VT check' };
    if (typeof value !== 'string') return { checked: false };

    if (IP_PATTERN.test(value))                                 return this.checkIp(value);
    if (HASH_PATTERN.test(value))                               return this.checkHash(value);
    if (DOMAIN_PATTERN.test(value) && value.includes('.'))      return this.checkDomain(value);

    return { checked: false };
  }

  private async vtGet(endpoint: string) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { 'x-apikey': this.apiKey },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`VT API ${res.status}`);
      return res.json() as Promise<{ data?: { attributes?: { last_analysis_stats?: Record<string, number> } } }>;
    } catch { return null; }
  }

  private parseStats(data: Awaited<ReturnType<typeof this.vtGet>>): VtResult['stats'] {
    const s = data?.data?.attributes?.last_analysis_stats ?? {};
    return {
      malicious:  Number(s['malicious']  ?? 0),
      suspicious: Number(s['suspicious'] ?? 0),
      harmless:   Number(s['harmless']   ?? 0),
      undetected: Number(s['undetected'] ?? 0),
    };
  }

  private verdict(stats: VtResult['stats']): VtResult['verdict'] {
    if (!stats) return 'harmless';
    if (stats.malicious  > 0) return 'malicious';
    if (stats.suspicious > 0) return 'suspicious';
    return 'harmless';
  }

  private async checkIp(ip: string): Promise<VtResult> {
    const data  = await this.vtGet(`/ip_addresses/${ip}`);
    const stats = this.parseStats(data);
    return { checked: true, indicator_type: 'ip', verdict: this.verdict(stats), stats, vt_link: `https://www.virustotal.com/gui/ip-address/${ip}` };
  }

  private async checkDomain(domain: string): Promise<VtResult> {
    const data  = await this.vtGet(`/domains/${domain}`);
    const stats = this.parseStats(data);
    return { checked: true, indicator_type: 'domain', verdict: this.verdict(stats), stats, vt_link: `https://www.virustotal.com/gui/domain/${domain}` };
  }

  private async checkHash(hash: string): Promise<VtResult> {
    const data  = await this.vtGet(`/files/${hash}`);
    const stats = this.parseStats(data);
    return { checked: true, indicator_type: 'hash', verdict: this.verdict(stats), stats, vt_link: `https://www.virustotal.com/gui/file/${hash}` };
  }
}
