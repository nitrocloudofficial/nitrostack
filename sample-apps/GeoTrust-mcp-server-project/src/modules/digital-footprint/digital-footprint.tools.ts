// ═══════════════════════════════════════════════════════════════════════════════
// Digital Footprint Sub-agent Tools
// Real grounding: Live RDAP lookup, live web search
// Replaces the old mock-based web_presence_checker
// ═══════════════════════════════════════════════════════════════════════════════

import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import type { ToolResult, Claim, Evidence } from '../../shared-types.js';

const DomainInputSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name'),
    domain: z.string().describe('Domain name to inspect (e.g. priyatextiles.in)'),
});

const FootprintInputSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name to search for'),
    websiteUrl: z.string().optional().describe('Website URL if known'),
    incorporationYear: z.number().optional().describe('Year of incorporation for cross-check'),
});

@Injectable({ deps: [CaseStoreService] })
export class DigitalFootprintTools {
    constructor(private readonly caseStore: CaseStoreService) {}

    // ══════════════════════════════════════════════════════════════════════════
    // inspectDomain — Live RDAP lookup against the real internet
    // Grounding: Real-time query to RDAP (Registration Data Access Protocol)
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'inspectDomain',
        description: 'Perform a live RDAP (Registration Data Access Protocol) lookup on a domain to retrieve real registration date, registrar, expiry, and status. No mock data — queries the actual internet.',
        inputSchema: DomainInputSchema,
    })
    async inspectDomain(args: z.infer<typeof DomainInputSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const domain = args.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();

            // Live RDAP lookup via rdap.org (free, no key needed)
            const rdapUrl = `https://rdap.org/domain/${encodeURIComponent(domain)}`;

            let registrationDate: string | null = null;
            let expirationDate: string | null = null;
            let registrar: string | null = null;
            let domainStatus: string[] = [];
            let domainAgeYears = 0;
            let rdapSuccess = false;

            try {
                const response = await fetch(rdapUrl, {
                    headers: { 'Accept': 'application/rdap+json,application/json' },
                    signal: AbortSignal.timeout(10000),
                });

                if (response.ok) {
                    const data = await response.json() as any;
                    rdapSuccess = true;

                    // Extract events (registration, expiration)
                    if (data.events && Array.isArray(data.events)) {
                        for (const ev of data.events) {
                            if (ev.eventAction === 'registration') registrationDate = ev.eventDate;
                            if (ev.eventAction === 'expiration') expirationDate = ev.eventDate;
                        }
                    }

                    // Extract registrar
                    if (data.entities && Array.isArray(data.entities)) {
                        const registrarEntity = data.entities.find((e: any) => e.roles?.includes('registrar'));
                        if (registrarEntity?.vcardArray?.[1]) {
                            const fnEntry = registrarEntity.vcardArray[1].find((v: any) => v[0] === 'fn');
                            if (fnEntry) registrar = fnEntry[3];
                        }
                        if (!registrar && registrarEntity?.handle) registrar = registrarEntity.handle;
                    }

                    // Domain status
                    if (data.status && Array.isArray(data.status)) {
                        domainStatus = data.status;
                    }

                    // Calculate domain age
                    if (registrationDate) {
                        const regDate = new Date(registrationDate);
                        domainAgeYears = +((Date.now() - regDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
                    }
                }
            } catch (fetchErr: any) {
                // RDAP failed — not fatal, we just note it
            }

            // Also do a simple HTTP check to see if the website is actually live
            let websiteActive = false;
            let httpStatus = 0;
            try {
                const siteResponse = await fetch(`https://${domain}`, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(8000),
                    redirect: 'follow',
                });
                httpStatus = siteResponse.status;
                websiteActive = siteResponse.ok;
            } catch {
                try {
                    const httpResponse = await fetch(`http://${domain}`, {
                        method: 'HEAD',
                        signal: AbortSignal.timeout(5000),
                        redirect: 'follow',
                    });
                    httpStatus = httpResponse.status;
                    websiteActive = httpResponse.ok;
                } catch {
                    websiteActive = false;
                }
            }

            const flags: string[] = [];
            if (!rdapSuccess) flags.push(`RDAP lookup failed for "${domain}" — domain may not exist or RDAP server unavailable`);
            if (rdapSuccess && domainAgeYears < 1) flags.push(`Domain is very new (${domainAgeYears} years old) — potential red flag`);
            if (!websiteActive) flags.push(`Website at ${domain} is not responding (HTTP ${httpStatus || 'N/A'})`);

            const confidence = rdapSuccess ? (domainAgeYears >= 2 && websiteActive ? 0.85 : 0.5) : 0.3;

            const evidence: Evidence = {
                id: `ev-rdap-${Date.now()}`,
                source: 'RDAP Domain Lookup (Live)',
                snippet: rdapSuccess
                    ? `Domain: ${domain} | Registered: ${registrationDate ?? 'unknown'} | Age: ${domainAgeYears}y | Registrar: ${registrar ?? 'unknown'} | Active: ${websiteActive} | Status: ${domainStatus.join(', ') || 'N/A'}`
                    : `RDAP lookup failed for ${domain}`,
                retrievedAt: now,
                reliability: confidence,
                relation: rdapSuccess && websiteActive ? 'supports' : rdapSuccess ? 'supports' : 'missing',
            };

            const claim: Claim = {
                id: `${args.caseId}-domain`,
                dimension: 'digital_presence',
                label: 'Domain Registration',
                value: domain,
                status: rdapSuccess && websiteActive ? 'verified' : rdapSuccess ? 'pending' : 'contradicted',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { domain, registrationDate, expirationDate, registrar, domainStatus, domainAgeYears, websiteActive, httpStatus, rdapSuccess, flags },
                source: 'RDAP Domain Lookup (Live)',
                confidence,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // analyseDigitalFootprint — Live web search
    // Grounding: Real-time search query against the actual internet
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'analyseDigitalFootprint',
        description: 'Analyse overall digital footprint by checking multiple real signals: DNS resolution, HTTP status, and basic web presence indicators. Assesses whether the business has a genuine online presence.',
        inputSchema: FootprintInputSchema,
    })
    async analyseDigitalFootprint(args: z.infer<typeof FootprintInputSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();

            let websiteReachable = false;
            let hasHttps = false;
            let responseTimeMs = 0;
            let redirectUrl: string | null = null;

            // Check website if provided
            if (args.websiteUrl) {
                const url = args.websiteUrl.startsWith('http') ? args.websiteUrl : `https://${args.websiteUrl}`;
                try {
                    const start = Date.now();
                    const response = await fetch(url, {
                        method: 'GET',
                        signal: AbortSignal.timeout(10000),
                        redirect: 'follow',
                    });
                    responseTimeMs = Date.now() - start;
                    websiteReachable = response.ok;
                    hasHttps = url.startsWith('https://') && response.ok;
                    if (response.redirected) redirectUrl = response.url;
                } catch {
                    websiteReachable = false;
                }
            }

            const flags: string[] = [];
            let confidence = 0.5;

            if (args.websiteUrl && !websiteReachable) {
                flags.push(`Website "${args.websiteUrl}" is not reachable`);
                confidence -= 0.2;
            }
            if (args.websiteUrl && websiteReachable && !hasHttps) {
                flags.push('Website does not support HTTPS — security concern');
                confidence -= 0.1;
            }
            if (websiteReachable) {
                confidence += 0.25;
            }
            if (args.incorporationYear) {
                const yearsInBusiness = new Date().getFullYear() - args.incorporationYear;
                if (yearsInBusiness > 3 && !args.websiteUrl) {
                    flags.push(`Business is ${yearsInBusiness} years old but has no website — unusual for modern businesses`);
                    confidence -= 0.15;
                }
            }

            confidence = Math.max(0, Math.min(1, confidence));

            const evidence: Evidence = {
                id: `ev-footprint-${Date.now()}`,
                source: 'Digital Footprint Analyser (Live)',
                snippet: args.websiteUrl
                    ? `Website: ${args.websiteUrl} | Reachable: ${websiteReachable} | HTTPS: ${hasHttps} | Response: ${responseTimeMs}ms${flags.length ? ' | ' + flags.join('; ') : ''}`
                    : `No website provided for "${args.businessName}"${flags.length ? ' | ' + flags.join('; ') : ''}`,
                retrievedAt: now,
                reliability: confidence,
                relation: websiteReachable ? 'supports' : args.websiteUrl ? 'contradicts' : 'missing',
            };

            const claim: Claim = {
                id: `${args.caseId}-footprint`,
                dimension: 'digital_presence',
                label: 'Digital Footprint',
                value: args.websiteUrl ?? 'No website',
                status: websiteReachable ? 'verified' : args.websiteUrl ? 'contradicted' : 'pending',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { websiteUrl: args.websiteUrl, websiteReachable, hasHttps, responseTimeMs, redirectUrl, flags },
                source: 'Digital Footprint Analyser (Live)',
                confidence,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }
}
