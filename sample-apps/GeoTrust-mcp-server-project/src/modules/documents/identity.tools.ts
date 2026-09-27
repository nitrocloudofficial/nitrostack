// ═══════════════════════════════════════════════════════════════════════════════
// Identity Sub-agent Tools
// Real grounding: PAN regex, GSTIN checksum, Udyam format, fuzzy matching
// ═══════════════════════════════════════════════════════════════════════════════

import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import { APPLICANT_DOCUMENTS } from './applicant-documents.data.js';
import type { ToolResult, Claim, Evidence } from '../../shared-types.js';
import stringSimilarity from 'string-similarity';

// ── Helper: resolve mock document ────────────────────────────────────────────
function resolveDoc(businessName: string, documentRef?: string) {
    const key = documentRef ?? Object.keys(APPLICANT_DOCUMENTS).find(k =>
        APPLICANT_DOCUMENTS[k].businessName.toLowerCase().includes(
            businessName.toLowerCase().split(' ')[0]
        )
    ) ?? 'REG-CERT';
    return APPLICANT_DOCUMENTS[key] ?? null;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────
const DocInputSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name to investigate'),
    documentRef: z.string().optional().describe('Reference key for the applicant document'),
});

@Injectable({ deps: [CaseStoreService] })
export class IdentityTools {
    constructor(private readonly caseStore: CaseStoreService) {}

    // ══════════════════════════════════════════════════════════════════════════
    // extractPAN — Real PAN format validation (published regex + entity-type check)
    // Grounding: Real published PAN format rule
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'extractPAN',
        description: 'Extract PAN from submitted document and validate against the real published PAN format: AAAAA0000A where 4th char encodes entity type (C=Company, P=Person, H=HUF, F=Firm, A=AOP, T=Trust, B=BOI, L=Local Authority, J=AJP, G=Government).',
        inputSchema: DocInputSchema,
    })
    async extractPAN(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const pan = doc.pan ?? 'NOT_FOUND';

            // ── Real grounding: Published PAN format ──────────────────────
            // PAN format: AAAAA0000A
            // Positions 1-3: Alphabetic series (AAA-ZZZ)
            // Position 4: Entity type code
            // Position 5: First char of surname/name
            // Positions 6-9: Sequential digits (0001-9999)
            // Position 10: Alphabetic check digit
            const panRegex = /^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$/;
            const isFormatValid = panRegex.test(pan);

            // Entity type from 4th character
            const entityTypeMap: Record<string, string> = {
                'A': 'Association of Persons (AOP)',
                'B': 'Body of Individuals (BOI)',
                'C': 'Company',
                'F': 'Firm/LLP',
                'G': 'Government',
                'H': 'Hindu Undivided Family',
                'J': 'Artificial Juridical Person',
                'L': 'Local Authority',
                'P': 'Individual/Person',
                'T': 'Trust',
            };
            const panEntityChar = pan.length >= 4 ? pan[3] : '';
            const panEntityType = entityTypeMap[panEntityChar] ?? 'Unknown';

            // Cross-check: does the PAN entity type match claimed entity type?
            const claimedEntity = doc.entityType?.toLowerCase() ?? '';
            let entityMismatch = false;
            if (isFormatValid) {
                if (panEntityChar === 'C' && !claimedEntity.includes('pvt') && !claimedEntity.includes('ltd') && !claimedEntity.includes('company')) {
                    entityMismatch = true;
                }
                if (panEntityChar === 'P' && (claimedEntity.includes('pvt') || claimedEntity.includes('ltd') || claimedEntity.includes('llp'))) {
                    entityMismatch = true;
                }
                if (panEntityChar === 'F' && !claimedEntity.includes('llp') && !claimedEntity.includes('firm')) {
                    entityMismatch = true;
                }
            }

            const flags: string[] = [];
            if (!isFormatValid) flags.push(`PAN "${pan}" does not match the published format AAAAA0000A`);
            if (entityMismatch) flags.push(`PAN 4th char "${panEntityChar}" indicates ${panEntityType}, but applicant claims entity type "${doc.entityType}"`);

            const claimStatus = isFormatValid && !entityMismatch ? 'verified' : 'contradicted';

            const evidence: Evidence = {
                id: `ev-pan-${Date.now()}`,
                source: 'PAN Format Validator (Published Rules)',
                snippet: `PAN: ${pan} | Format valid: ${isFormatValid} | Entity type from PAN: ${panEntityType} | Entity mismatch: ${entityMismatch}${flags.length ? ' | Flags: ' + flags.join('; ') : ''}`,
                retrievedAt: now,
                reliability: isFormatValid ? 0.95 : 0.3,
                relation: claimStatus === 'verified' ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-pan`,
                dimension: 'identity',
                label: 'PAN',
                value: pan,
                status: claimStatus,
                evidence: [evidence],
            };

            // Merge into state
            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { pan, isFormatValid, panEntityType, entityMismatch, flags },
                source: 'PAN Format Validator (Published Rules)',
                confidence: isFormatValid ? 0.95 : 0.3,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // extractGSTCertificate — Real GSTIN checksum algorithm
    // Grounding: Published GSTIN checksum-digit formula
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'extractGSTCertificate',
        description: 'Extract GSTIN from submitted document and validate using the real published GSTIN checksum algorithm. GSTIN format: 2-digit state code + 10-char PAN + 1 entity number + Z + check digit.',
        inputSchema: DocInputSchema,
    })
    async extractGSTCertificate(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const gstin = doc.gstNumber ?? 'NOT_FOUND';

            // ── Real grounding: Published GSTIN checksum algorithm ────────
            // GSTIN format: SS PPPPPPPPPP E Z C
            // SS = State code (01-37)
            // PPPPPPPPPP = PAN (10 chars)
            // E = Entity number (1-9 or A-Z)
            // Z = Default 'Z'
            // C = Check digit (computed via Luhn mod 36)

            const gstinRegex = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
            const isFormatValid = gstinRegex.test(gstin);

            // Luhn mod 36 check digit verification
            let checksumValid = false;
            if (isFormatValid) {
                checksumValid = this.verifyGSTINChecksum(gstin);
            }

            // Extract embedded PAN and cross-check with submitted PAN
            let embeddedPAN = '';
            let panMatchesGSTIN = false;
            if (gstin.length >= 12) {
                embeddedPAN = gstin.substring(2, 12);
                if (doc.pan) {
                    panMatchesGSTIN = embeddedPAN === doc.pan;
                }
            }

            // Validate state code
            const stateCode = gstin.length >= 2 ? parseInt(gstin.substring(0, 2), 10) : -1;
            const validStateCodes = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37];
            const stateCodeValid = validStateCodes.includes(stateCode);

            const flags: string[] = [];
            if (!isFormatValid) flags.push(`GSTIN "${gstin}" does not match published format`);
            if (isFormatValid && !checksumValid) flags.push(`GSTIN checksum digit is invalid — possible fabricated number`);
            if (!stateCodeValid) flags.push(`State code ${stateCode} is not a valid Indian state code`);
            if (doc.pan && !panMatchesGSTIN && embeddedPAN) {
                flags.push(`PAN embedded in GSTIN ("${embeddedPAN}") does not match submitted PAN ("${doc.pan}")`);
            }

            const claimStatus = isFormatValid && checksumValid && stateCodeValid
                ? 'verified'
                : !isFormatValid || !stateCodeValid || (doc.pan && !panMatchesGSTIN && embeddedPAN)
                    ? 'contradicted'  // Hard failure: format invalid, bad state code, or PAN mismatch
                    : 'pending';       // Checksum-only failure: needs manual verification

            const evidence: Evidence = {
                id: `ev-gst-${Date.now()}`,
                source: 'GSTIN Checksum Validator (Published Algorithm)',
                snippet: `GSTIN: ${gstin} | Format: ${isFormatValid ? 'Valid' : 'Invalid'} | Checksum: ${checksumValid ? 'Pass' : 'Fail'} | State code: ${stateCode} (${stateCodeValid ? 'valid' : 'invalid'}) | Embedded PAN: ${embeddedPAN}${flags.length ? ' | ' + flags.join('; ') : ''}`,
                retrievedAt: now,
                reliability: checksumValid ? 0.95 : 0.2,
                relation: claimStatus === 'verified' ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-gst`,
                dimension: 'identity',
                label: 'GSTIN',
                value: gstin,
                status: claimStatus,
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { gstin, isFormatValid, checksumValid, stateCodeValid, embeddedPAN, panMatchesGSTIN, flags },
                source: 'GSTIN Checksum Validator (Published Algorithm)',
                confidence: checksumValid ? 0.95 : 0.2,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    /** Real GSTIN Luhn mod-36 checksum verification */
    private verifyGSTINChecksum(gstin: string): boolean {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const n = chars.length; // 36
        let sum = 0;
        for (let i = 0; i < gstin.length - 1; i++) {
            const idx = chars.indexOf(gstin[i]);
            if (idx === -1) return false;
            let value = ((i % 2 === 0 ? idx : idx * 2) % n) + Math.floor((i % 2 === 0 ? idx : idx * 2) / n);
            sum += value;
        }
        const checkDigitIdx = (n - (sum % n)) % n;
        return chars[checkDigitIdx] === gstin[gstin.length - 1];
    }

    // ══════════════════════════════════════════════════════════════════════════
    // extractUdyamCertificate — Real Udyam number format validation
    // Grounding: Published Udyam Registration Number format
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'extractUdyamCertificate',
        description: 'Extract Udyam/MSME certificate number and validate against the real published format: UDYAM-XX-00-0000000 (state code, district code, 7-digit serial).',
        inputSchema: DocInputSchema,
    })
    async extractUdyamCertificate(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const udyam = doc.udyamNumber ?? 'NOT_FOUND';

            // ── Real grounding: Published Udyam format ────────────────────
            // Format: UDYAM-XX-00-0000000
            // UDYAM = Literal prefix
            // XX = 2-letter state code (e.g., TN, KA, MH)
            // 00 = 2-digit district code
            // 0000000 = 7-digit sequential number
            const udyamRegex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
            const isFormatValid = udyamRegex.test(udyam);

            // Valid Indian state codes
            const validStates = ['AN','AP','AR','AS','BR','CG','CH','DD','DL','DN','GA','GJ','HP','HR','JH','JK','KA','KL','LA','LD','MH','ML','MN','MP','MZ','NL','OD','PB','PY','RJ','SK','TG','TN','TR','UK','UP','WB'];
            let stateCode = '';
            let stateValid = false;
            if (udyam.length >= 8) {
                stateCode = udyam.substring(6, 8);
                stateValid = validStates.includes(stateCode);
            }

            const flags: string[] = [];
            if (udyam === 'NOT_FOUND') {
                flags.push('No Udyam/MSME certificate number found in submitted documents');
            } else if (!isFormatValid) {
                flags.push(`Udyam number "${udyam}" does not match published format UDYAM-XX-00-0000000`);
            }
            if (isFormatValid && !stateValid) {
                flags.push(`State code "${stateCode}" in Udyam number is not a valid Indian state code`);
            }

            const claimStatus = isFormatValid && stateValid ? 'verified' : (udyam === 'NOT_FOUND' ? 'pending' : 'contradicted');

            const evidence: Evidence = {
                id: `ev-udyam-${Date.now()}`,
                source: 'Udyam Format Validator (Published Rules)',
                snippet: `Udyam: ${udyam} | Format: ${isFormatValid ? 'Valid' : 'Invalid'}${stateCode ? ` | State: ${stateCode} (${stateValid ? 'valid' : 'invalid'})` : ''}${flags.length ? ' | ' + flags.join('; ') : ''}`,
                retrievedAt: now,
                reliability: isFormatValid ? 0.9 : 0.3,
                relation: claimStatus === 'verified' ? 'supports' : claimStatus === 'contradicted' ? 'contradicts' : 'missing',
            };

            const claim: Claim = {
                id: `${args.caseId}-udyam`,
                dimension: 'identity',
                label: 'Udyam Number',
                value: udyam,
                status: claimStatus,
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { udyamNumber: udyam, isFormatValid, stateCode, stateValid, flags },
                source: 'Udyam Format Validator (Published Rules)',
                confidence: isFormatValid ? 0.9 : 0.3,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // extractRegistrationCertificate — Structured field extraction
    // Grounding: Extraction only (no comparison), fields go to CaseState
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'extractRegistrationCertificate',
        description: 'Extract structured claims from a registration certificate: business name, registration number, address, incorporation date, director name. Returns claims with status "pending" for cross-checking by other tools.',
        inputSchema: DocInputSchema,
    })
    async extractRegistrationCertificate(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const quality = doc.documentQuality;
            const sourceLabel = 'Document OCR — Registration Certificate';

            const extractedClaims: Claim[] = [
                {
                    id: `${args.caseId}-doc-name`,
                    dimension: 'identity',
                    label: 'Business Name',
                    value: doc.businessName,
                    status: 'pending',
                    evidence: [{
                        id: `ev-doc-name-${Date.now()}`,
                        source: sourceLabel,
                        snippet: `Name extracted: "${doc.businessName}" (quality: ${(quality * 100).toFixed(0)}%)`,
                        retrievedAt: now,
                        reliability: quality,
                        relation: 'supports',
                    }],
                },
                {
                    id: `${args.caseId}-doc-regnum`,
                    dimension: 'identity',
                    label: 'Registration Number',
                    value: doc.registrationNumber,
                    status: 'pending',
                    evidence: [{
                        id: `ev-doc-regnum-${Date.now()}`,
                        source: sourceLabel,
                        snippet: `Registration number: ${doc.registrationNumber}`,
                        retrievedAt: now,
                        reliability: quality,
                        relation: 'supports',
                    }],
                },
                {
                    id: `${args.caseId}-doc-address`,
                    dimension: 'location',
                    label: 'Registered Address',
                    value: doc.address,
                    status: 'pending',
                    evidence: [{
                        id: `ev-doc-addr-${Date.now()}`,
                        source: sourceLabel,
                        snippet: `Address on certificate: "${doc.address}"`,
                        retrievedAt: now,
                        reliability: quality,
                        relation: 'supports',
                    }],
                },
                {
                    id: `${args.caseId}-doc-director`,
                    dimension: 'identity',
                    label: 'Director Name',
                    value: doc.directorName,
                    status: 'pending',
                    evidence: [{
                        id: `ev-doc-dir-${Date.now()}`,
                        source: sourceLabel,
                        snippet: `Director: ${doc.directorName}`,
                        retrievedAt: now,
                        reliability: quality,
                        relation: 'supports',
                    }],
                },
                {
                    id: `${args.caseId}-doc-incorp`,
                    dimension: 'identity',
                    label: 'Incorporation Date',
                    value: doc.incorporationDate,
                    status: 'pending',
                    evidence: [{
                        id: `ev-doc-incorp-${Date.now()}`,
                        source: sourceLabel,
                        snippet: `Incorporation date: ${doc.incorporationDate}`,
                        retrievedAt: now,
                        reliability: quality,
                        relation: 'supports',
                    }],
                },
            ];

            // Merge into state
            const existing = state.claims;
            for (const ec of extractedClaims) {
                const idx = existing.findIndex(c => c.id === ec.id);
                if (idx === -1) existing.push(ec);
                else existing[idx] = ec;
            }
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { extractedClaims, documentQuality: quality },
                source: sourceLabel,
                confidence: quality,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // extractTradeLicense — Fuzzy name/address match vs Registration Cert
    // Grounding: Fuzzy string similarity (not bare equality)
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'extractTradeLicense',
        description: 'Extract trade license details and fuzzy-match the name and address against the registration certificate claims already in the case.',
        inputSchema: DocInputSchema,
    })
    async extractTradeLicense(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };
            if (!doc.tradeLicenseNumber) return { status: 'success', data: { found: false, reason: 'No trade license in submitted documents' } };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();

            // Fuzzy match trade license business name against registration cert name
            const regCertNameClaim = state.claims.find(c => c.id === `${args.caseId}-doc-name`);
            const regCertAddrClaim = state.claims.find(c => c.id === `${args.caseId}-doc-address`);

            const nameSimilarity = regCertNameClaim
                ? stringSimilarity.compareTwoStrings(doc.businessName.toLowerCase(), regCertNameClaim.value.toLowerCase())
                : 0;
            const addressSimilarity = regCertAddrClaim
                ? stringSimilarity.compareTwoStrings(doc.address.toLowerCase(), regCertAddrClaim.value.toLowerCase())
                : 0;

            const flags: string[] = [];
            if (nameSimilarity < 0.7) flags.push(`Trade license name similarity to reg cert: ${(nameSimilarity * 100).toFixed(0)}% — low match`);
            if (addressSimilarity < 0.7) flags.push(`Trade license address similarity to reg cert: ${(addressSimilarity * 100).toFixed(0)}% — low match`);

            const claimStatus = nameSimilarity >= 0.7 && addressSimilarity >= 0.7 ? 'verified' : 'contradicted';

            const evidence: Evidence = {
                id: `ev-trade-${Date.now()}`,
                source: 'Trade License Fuzzy Matcher',
                snippet: `License: ${doc.tradeLicenseNumber} | Name similarity: ${(nameSimilarity * 100).toFixed(0)}% | Address similarity: ${(addressSimilarity * 100).toFixed(0)}%${flags.length ? ' | ' + flags.join('; ') : ''}`,
                retrievedAt: now,
                reliability: Math.min(nameSimilarity, addressSimilarity),
                relation: claimStatus === 'verified' ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-trade`,
                dimension: 'identity',
                label: 'Trade License',
                value: doc.tradeLicenseNumber,
                status: claimStatus,
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { tradeLicenseNumber: doc.tradeLicenseNumber, nameSimilarity, addressSimilarity, flags },
                source: 'Trade License Fuzzy Matcher',
                confidence: Math.min(nameSimilarity, addressSimilarity),
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // extractEntityDocument — Fuzzy name/entity-type match
    // Grounding: Fuzzy similarity, conditional on entity type
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'extractEntityDocument',
        description: 'Extract entity-specific document (Certificate of Incorporation for Pvt Ltd, LLP Agreement for LLP, Udyam for MSME). Fuzzy-matches name and entity type against registration certificate.',
        inputSchema: DocInputSchema,
    })
    async extractEntityDocument(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const entityType = doc.entityType ?? 'Unknown';

            // Determine expected document type based on entity
            let expectedDocType = 'Unknown';
            if (['Pvt Ltd', 'Ltd', 'Company'].some(t => entityType.includes(t))) {
                expectedDocType = 'Certificate of Incorporation (MCA)';
            } else if (entityType.includes('LLP')) {
                expectedDocType = 'LLP Agreement + Certificate of Incorporation';
            } else if (entityType.includes('MSME') || entityType.includes('Proprietorship')) {
                expectedDocType = 'Udyam Registration / Shop & Establishment License';
            }

            // Fuzzy match business name
            const nameSimilarity = stringSimilarity.compareTwoStrings(
                doc.businessName.toLowerCase(),
                args.businessName.toLowerCase()
            );

            const flags: string[] = [];
            if (nameSimilarity < 0.8) flags.push(`Entity document name similarity: ${(nameSimilarity * 100).toFixed(0)}% — potential mismatch`);

            const evidence: Evidence = {
                id: `ev-entity-${Date.now()}`,
                source: 'Entity Document Validator',
                snippet: `Entity type: ${entityType} | Expected doc: ${expectedDocType} | Name similarity: ${(nameSimilarity * 100).toFixed(0)}%`,
                retrievedAt: now,
                reliability: nameSimilarity,
                relation: nameSimilarity >= 0.8 ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-entity-doc`,
                dimension: 'identity',
                label: 'Entity Document',
                value: `${entityType} — ${expectedDocType}`,
                status: nameSimilarity >= 0.8 ? 'verified' : 'contradicted',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { entityType, expectedDocType, nameSimilarity, flags },
                source: 'Entity Document Validator',
                confidence: nameSimilarity,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }
}
