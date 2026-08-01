import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { ClaimInput } from '../../shared/trust-context.interface.js';

@Injectable()
export class IdentityService {
  
  @Tool({
    name: 'domainReputationalCheck',
    description: 'Check domain reputation and detect suspicious URLs or typo-squatting',
    inputSchema: z.object({
      url: z.string().describe('The external URL to check')
    })
  })
  async domainReputationalCheck(input: { url: string }, _ctx?: ExecutionContext): Promise<ClaimInput[]> {
    let domain = '';
    try {
      domain = new URL(input.url).hostname;
    } catch (e) {
      domain = input.url; // Fallback if not a proper URL
    }

    const isTypoSquatting = this.detectTypoSquatting(domain);
    const domainInfo = await this.getDomainInfo(domain);
    
    const claims: ClaimInput[] = [];

    if (isTypoSquatting) {
      claims.push({
        source: 'identity.domainReputationCheck',
        type: 'TYPO_SQUATTING',
        fact: 'domain_suspicious',
        value: domain,
        description: `Domain '${domain}' is attempting to impersonate a known safe domain.`,
        severity: 'CRITICAL'
      });
    }

    if (domainInfo.ageDays < 30) {
      claims.push({
        source: 'identity.domainReputationCheck',
        type: 'NEW_DOMAIN',
        fact: 'domain_newly_registered',
        value: `${domainInfo.ageDays} days`,
        description: `Domain '${domain}' is very new (${domainInfo.ageDays} days old).`,
        severity: 'HIGH'
      });
    }

    if (!domainInfo.sslValid) {
      claims.push({
        source: 'identity.domainReputationCheck',
        type: 'INVALID_SSL',
        fact: 'ssl_valid',
        value: false,
        description: `Domain '${domain}' lacks valid SSL.`,
        severity: 'MEDIUM'
      });
    }

    return claims;
  }

  private detectTypoSquatting(domain: string): boolean {
    const knownSafeDomains = ['olx.in', 'facebook.com', 'whatsapp.com'];
    
    for (const safe of knownSafeDomains) {
      if (domain === safe) continue;

      // Substring embedding (e.g., olx-payment-secure.xyz)
      if (domain.includes(safe.replace('.in', '').replace('.com', ''))) {
        return true;
      }

      // Levenshtein distance for close typos (e.g., oix.in)
      const distance = this.getLevenshteinDistance(domain, safe);
      if (distance <= 2) {
        return true;
      }
    }
    return false;
  }

  private getLevenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  private async getDomainInfo(domain: string): Promise<{ ageDays: number; sslValid: boolean; suspicionScore: number }> {
    const cleanDomain = domain.toLowerCase().trim();
    
    // Known static entries for fallback
    const staticRegistry: Record<string, any> = {
      'olx-payment-secure.xyz': { ageDays: 3, sslValid: false, suspicionScore: 0.95 },
      'olx.in': { ageDays: 5000, sslValid: true, suspicionScore: 0.05 },
      'paymentverify.com': { ageDays: 15, sslValid: true, suspicionScore: 0.72 }
    };

    if (staticRegistry[cleanDomain]) {
      return staticRegistry[cleanDomain];
    }

    try {
      // Query free public RDAP WHOIS REST API (no API key required)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      
      const res = await fetch(`https://rdap.org/domain/${cleanDomain}`, {
        headers: { 'Accept': 'application/rdap+json, application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        // Look for registration or creation event date in RDAP response
        const events: any[] = data.events || [];
        const regEvent = events.find((e: any) => e.eventAction === 'registration' || e.eventAction === 'transfer');
        if (regEvent && regEvent.eventDate) {
          const regDate = new Date(regEvent.eventDate).getTime();
          const ageDays = Math.max(1, Math.floor((Date.now() - regDate) / (1000 * 60 * 60 * 24)));
          console.log(`[IdentityService] Real RDAP WHOIS: ${cleanDomain} is ${ageDays} days old.`);
          return { ageDays, sslValid: true, suspicionScore: ageDays < 30 ? 0.8 : 0.1 };
        }
      }
    } catch (e: any) {
      console.log(`[IdentityService] RDAP WHOIS lookup for ${cleanDomain} timed out/failed. Using age heuristic.`);
    }

    // Heuristic fallback for unknown domains: suspicious TLDs get low age
    const suspiciousTlds = ['.xyz', '.top', '.site', '.click', '.tk', '.ml', '.ga', '.cf', '.gq', '.icu', '.monster'];
    const isSuspiciousTld = suspiciousTlds.some(tld => cleanDomain.endsWith(tld));
    const estimatedAge = isSuspiciousTld ? 5 : 365;

    return { ageDays: estimatedAge, sslValid: !isSuspiciousTld, suspicionScore: isSuspiciousTld ? 0.85 : 0.2 };
  }
}
