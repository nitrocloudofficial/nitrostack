import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import type { ToolResult, Evidence } from '../../shared-types.js';

const AddressCheckerSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name'),
    claimedAddress: z.string().describe('Address claimed by the business on their application'),
    registryAddress: z.string().optional().describe('Address from the business registry (if already retrieved) for cross-checking'),
    utilityBillAddress: z.string().optional().describe('Address from utility bill (if extracted) for cross-checking'),
});

@Injectable({ deps: [CaseStoreService] })
export class AddressTools {
    constructor(private readonly caseStore: CaseStoreService) { }

    @Tool({
        name: 'verifyAddress',
        description: 'Verify a claimed business address against live OpenStreetMap data (Nominatim API). Checks for valid geocoding coordinates, compares it against registry and utility bill addresses, and returns a match/mismatch with reliability weight.',
        inputSchema: AddressCheckerSchema,
    })
    async verifyAddress(args: z.infer<typeof AddressCheckerSchema>) {
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const now = new Date().toISOString();

        // 1. Live Geocoding via Nominatim API
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(args.claimedAddress)}&format=json&addressdetails=1&limit=1`;
        
        let geocodeData: any = null;
        let addressFound = false;
        let lat: number | null = null;
        let lng: number | null = null;
        let apiZone: string | null = null;
        const flags: string[] = [];
        let confidence = 0.4;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'GeoTrust-AI-Agent/1.0',
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                const results = await response.json() as any[];
                if (results && results.length > 0) {
                    geocodeData = results[0];
                    addressFound = true;
                    lat = parseFloat(geocodeData.lat);
                    lng = parseFloat(geocodeData.lon);
                    apiZone = geocodeData.display_name || null;
                    confidence = 0.85; // Base high confidence for a live match
                } else {
                    flags.push(`Address "${args.claimedAddress}" could not be geocoded by OpenStreetMap Nominatim`);
                    confidence = 0.35;
                }
            } else {
                flags.push(`Geocoding API error: HTTP ${response.status}`);
                confidence = 0.4;
            }
        } catch (err: any) {
            flags.push(`Failed to reach geocoding API: ${err.message}`);
            confidence = 0.4;
        }

        // Normalise string for cross-checking
        const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
        const claimedTokens = normalise(args.claimedAddress);

        // Cross-check registry address
        let registryAddressMatch: boolean | null = null;
        if (args.registryAddress) {
            const regTokens = normalise(args.registryAddress);
            const overlap = claimedTokens.filter(t => regTokens.includes(t)).length;
            registryAddressMatch = overlap >= 2;
            if (!registryAddressMatch) {
                flags.push(`Claimed address doesn't match registry: claimed "${args.claimedAddress}", registry has "${args.registryAddress}"`);
                confidence -= 0.2;
            }
        }

        // Cross-check utility bill address
        let utilityBillAddressMatch: boolean | null = null;
        if (args.utilityBillAddress) {
            const utilTokens = normalise(args.utilityBillAddress);
            const overlap = claimedTokens.filter(t => utilTokens.includes(t)).length;
            utilityBillAddressMatch = overlap >= 2;
            if (!utilityBillAddressMatch) {
                flags.push(`Utility bill address doesn't match claimed address: utility shows "${args.utilityBillAddress}", claimed "${args.claimedAddress}"`);
                confidence -= 0.2;
            }
        }

        confidence = Math.max(0, Math.min(1, confidence));

        const result: ToolResult<{
            addressFound: boolean;
            zone: string | null;
            isCommercialZone: boolean;
            lat: number | null;
            lng: number | null;
            registryAddressMatch: boolean | null;
            utilityBillAddressMatch: boolean | null;
            flags: string[];
        }> = {
            status: 'success',
            ok: addressFound,
            source: 'Address Verification Service (OpenStreetMap Nominatim)',
            data: {
                addressFound,
                zone: apiZone,
                isCommercialZone: false, // Defaulting for Nominatim response
                lat,
                lng,
                registryAddressMatch,
                utilityBillAddressMatch,
                flags,
            },
            confidence,
            retrievedAt: now,
        };

        this.caseStore.addToolResult(args.caseId, result as ToolResult);
        // Update location claims
        const currentClaims = state.claims;
        const addrEvidence: Evidence = {
            id: `ev-addr-${Date.now()}`,
            source: 'OpenStreetMap Geocoding',
            snippet: addressFound
                ? `Geocoded to ${lat?.toFixed(4)}, ${lng?.toFixed(4)}. Display name: ${apiZone}. ${flags.length ? 'Issues: ' + flags.join('; ') : 'No issues.'}`
                : `Address "${args.claimedAddress}" not found by Nominatim API.`,
            retrievedAt: now,
            reliability: confidence,
            relation: addressFound && flags.length === 0 ? 'supports' : flags.length > 0 ? 'contradicts' : 'missing',
        };

        const updated = currentClaims.map(c => {
            if (c.dimension === 'location') {
                return { ...c, status: (addressFound && registryAddressMatch !== false && utilityBillAddressMatch !== false ? 'verified' : 'contradicted') as typeof c.status, evidence: [...c.evidence, addrEvidence] };
            }
            return c;
        });

        if (!updated.some(c => c.dimension === 'location')) {
            updated.push({
                id: `${args.caseId}-addr-verified`,
                dimension: 'location',
                label: 'Registered Address',
                value: args.claimedAddress,
                status: addressFound && registryAddressMatch !== false && utilityBillAddressMatch !== false ? 'verified' : 'contradicted',
                evidence: [addrEvidence],
            });
        }

        this.caseStore.updateClaims(args.caseId, updated);
        return result;
    }
}
