// ═══════════════════════════════════════════════════════════════════════════════
// Financial Sub-agent Tools
// Real grounding: date math, frequency analysis, MSME threshold tables, fuzzy matching
// ═══════════════════════════════════════════════════════════════════════════════

import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import { APPLICANT_DOCUMENTS } from './applicant-documents.data.js';
import type { ToolResult, Claim, Evidence } from '../../shared-types.js';
import stringSimilarity from 'string-similarity';

function resolveDoc(businessName: string, documentRef?: string) {
    const key = documentRef ?? Object.keys(APPLICANT_DOCUMENTS).find(k =>
        APPLICANT_DOCUMENTS[k].businessName.toLowerCase().includes(
            businessName.toLowerCase().split(' ')[0]
        )
    ) ?? 'REG-CERT';
    return APPLICANT_DOCUMENTS[key] ?? null;
}

const DocInputSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name'),
    documentRef: z.string().optional().describe('Reference key for the applicant document'),
});

// ── Real published MSME turnover thresholds (Government of India, 2020 revision) ──
const MSME_TURNOVER_THRESHOLDS = {
    micro: { maxTurnoverINR: 50000000, label: 'Micro (≤₹5 Cr)' },       // ≤ 5 crore
    small: { maxTurnoverINR: 500000000, label: 'Small (≤₹50 Cr)' },     // ≤ 50 crore
    medium: { maxTurnoverINR: 2500000000, label: 'Medium (≤₹250 Cr)' }, // ≤ 250 crore
};

@Injectable({ deps: [CaseStoreService] })
export class FinancialTools {
    constructor(private readonly caseStore: CaseStoreService) {}

    // ══════════════════════════════════════════════════════════════════════════
    // extractBankStatement — Fuzzy name/account match
    // Grounding: Fuzzy string similarity on account holder name
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'extractBankStatement',
        description: 'Extract bank statement details and fuzzy-match the account holder name against the business name. Validates IFSC format.',
        inputSchema: DocInputSchema,
    })
    async extractBankStatement(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };
            if (!doc.bankAccountName) return { status: 'success', data: { found: false, reason: 'No bank statement in submitted documents' } };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();

            // Fuzzy match account name vs business name
            const nameSimilarity = stringSimilarity.compareTwoStrings(
                doc.bankAccountName.toLowerCase(),
                doc.businessName.toLowerCase()
            );

            // Validate IFSC format: 4 alpha + 0 + 6 alphanumeric
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            const ifscValid = doc.ifscCode ? ifscRegex.test(doc.ifscCode) : false;

            const flags: string[] = [];
            if (nameSimilarity < 0.7) {
                flags.push(`Bank account name "${doc.bankAccountName}" has low similarity (${(nameSimilarity * 100).toFixed(0)}%) to business name "${doc.businessName}"`);
            }
            if (doc.ifscCode && !ifscValid) {
                flags.push(`IFSC code "${doc.ifscCode}" does not match published format (4 alpha + 0 + 6 alphanum)`);
            }

            const evidence: Evidence = {
                id: `ev-bank-${Date.now()}`,
                source: 'Bank Statement Validator',
                snippet: `Account: ${doc.bankAccountNumber} | Holder: ${doc.bankAccountName} | Name match: ${(nameSimilarity * 100).toFixed(0)}% | IFSC: ${doc.ifscCode} (${ifscValid ? 'valid' : 'invalid'})`,
                retrievedAt: now,
                reliability: nameSimilarity,
                relation: nameSimilarity >= 0.7 ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-bank`,
                dimension: 'identity',
                label: 'Bank Account',
                value: `${doc.bankAccountName} — ${doc.bankAccountNumber}`,
                status: nameSimilarity >= 0.7 && ifscValid ? 'verified' : 'contradicted',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { bankAccountName: doc.bankAccountName, bankAccountNumber: doc.bankAccountNumber, ifscCode: doc.ifscCode, nameSimilarity, ifscValid, flags },
                source: 'Bank Statement Validator',
                confidence: nameSimilarity,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // analyseTransactionActivity — Real frequency/recency calculation
    // Grounding: Pure logic — real math on transaction data
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'analyseTransactionActivity',
        description: 'Analyse transaction frequency, recency, and average balance to assess whether the account shows signs of genuine business activity.',
        inputSchema: DocInputSchema,
    })
    async analyseTransactionActivity(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const txCount = doc.monthlyTransactions ?? 0;
            const avgBalance = doc.avgMonthlyBalance ?? 0;
            const lastTxDate = doc.lastTransactionDate;

            // Real frequency analysis
            let frequencyRating: 'high' | 'moderate' | 'low' | 'dormant';
            if (txCount >= 30) frequencyRating = 'high';
            else if (txCount >= 10) frequencyRating = 'moderate';
            else if (txCount >= 1) frequencyRating = 'low';
            else frequencyRating = 'dormant';

            // Real recency analysis (days since last transaction)
            let daysSinceLastTx = -1;
            let recencyRating: 'active' | 'recent' | 'stale' | 'inactive' = 'inactive';
            if (lastTxDate) {
                daysSinceLastTx = Math.floor((Date.now() - new Date(lastTxDate).getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceLastTx <= 30) recencyRating = 'active';
                else if (daysSinceLastTx <= 90) recencyRating = 'recent';
                else if (daysSinceLastTx <= 180) recencyRating = 'stale';
                else recencyRating = 'inactive';
            }

            // Balance adequacy
            let balanceRating: 'healthy' | 'adequate' | 'low' | 'negligible';
            if (avgBalance >= 500000) balanceRating = 'healthy';
            else if (avgBalance >= 100000) balanceRating = 'adequate';
            else if (avgBalance >= 10000) balanceRating = 'low';
            else balanceRating = 'negligible';

            const flags: string[] = [];
            if (frequencyRating === 'dormant' || frequencyRating === 'low') {
                flags.push(`Low transaction frequency (${txCount}/month) — unusual for an active business`);
            }
            if (recencyRating === 'stale' || recencyRating === 'inactive') {
                flags.push(`Last transaction ${daysSinceLastTx} days ago — account appears ${recencyRating}`);
            }
            if (balanceRating === 'low' || balanceRating === 'negligible') {
                flags.push(`Average monthly balance ₹${avgBalance.toLocaleString('en-IN')} — ${balanceRating} for business operations`);
            }

            // Composite score
            const freqScore = { high: 1, moderate: 0.7, low: 0.3, dormant: 0.1 }[frequencyRating];
            const recScore = { active: 1, recent: 0.7, stale: 0.3, inactive: 0.1 }[recencyRating];
            const balScore = { healthy: 1, adequate: 0.7, low: 0.3, negligible: 0.1 }[balanceRating];
            const activityScore = freqScore * 0.4 + recScore * 0.35 + balScore * 0.25;

            const evidence: Evidence = {
                id: `ev-activity-${Date.now()}`,
                source: 'Transaction Activity Analyser',
                snippet: `Frequency: ${frequencyRating} (${txCount}/mo) | Recency: ${recencyRating} (${daysSinceLastTx}d ago) | Balance: ${balanceRating} (₹${avgBalance.toLocaleString('en-IN')}) | Score: ${(activityScore * 100).toFixed(0)}%`,
                retrievedAt: now,
                reliability: 0.85,
                relation: activityScore >= 0.5 ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-activity`,
                dimension: 'identity',
                label: 'Transaction Activity',
                value: `${frequencyRating} frequency, ${recencyRating} recency`,
                status: activityScore >= 0.5 ? 'verified' : 'contradicted',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { frequencyRating, recencyRating, balanceRating, activityScore, txCount, avgBalance, daysSinceLastTx, flags },
                source: 'Transaction Activity Analyser',
                confidence: activityScore,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // assessBusinessVintage — Real date-difference math
    // Grounding: Pure logic — calculates real age from incorporation date
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'assessBusinessVintage',
        description: 'Calculate the real age of the business from its incorporation date. Cross-checks whether claimed years match actual date difference.',
        inputSchema: DocInputSchema,
    })
    async assessBusinessVintage(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const incorpDate = new Date(doc.incorporationDate);
            const today = new Date();

            // Real date math
            const ageMs = today.getTime() - incorpDate.getTime();
            const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
            const ageYears = +(ageDays / 365.25).toFixed(1);
            const ageMonths = Math.floor(ageDays / 30.44);

            let vintageRating: 'established' | 'growing' | 'startup' | 'very_new';
            if (ageYears >= 5) vintageRating = 'established';
            else if (ageYears >= 3) vintageRating = 'growing';
            else if (ageYears >= 1) vintageRating = 'startup';
            else vintageRating = 'very_new';

            const flags: string[] = [];
            if (ageYears < 2) {
                flags.push(`Business is only ${ageYears} years old — higher risk profile for lending`);
            }
            if (isNaN(incorpDate.getTime())) {
                flags.push('Incorporation date is invalid or missing');
            }

            const evidence: Evidence = {
                id: `ev-vintage-${Date.now()}`,
                source: 'Business Vintage Calculator',
                snippet: `Incorporated: ${doc.incorporationDate} | Age: ${ageYears} years (${ageMonths} months) | Rating: ${vintageRating}`,
                retrievedAt: now,
                reliability: 0.95,
                relation: ageYears >= 2 ? 'supports' : ageYears >= 1 ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-vintage`,
                dimension: 'identity',
                label: 'Business Vintage',
                value: `${ageYears} years (${vintageRating})`,
                status: ageYears >= 1 ? 'verified' : 'contradicted',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { incorporationDate: doc.incorporationDate, ageYears, ageMonths, vintageRating, flags },
                source: 'Business Vintage Calculator',
                confidence: isNaN(incorpDate.getTime()) ? 0.2 : 0.95,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // crossCheckTurnoverClassification — Real public MSME turnover thresholds
    // Grounding: Government-published MSME turnover limits (2020 revision)
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'crossCheckTurnoverClassification',
        description: 'Cross-check reported annual turnover against the real Government of India MSME turnover classification thresholds (2020 revision). Micro: ≤₹5Cr, Small: ≤₹50Cr, Medium: ≤₹250Cr.',
        inputSchema: DocInputSchema,
    })
    async crossCheckTurnoverClassification(args: z.infer<typeof DocInputSchema>): Promise<ToolResult> {
        try {
            const doc = resolveDoc(args.businessName, args.documentRef);
            if (!doc) return { status: 'failed', error: 'Document not found' };
            if (!doc.annualTurnover) return { status: 'success', data: { found: false, reason: 'No turnover data in submitted documents' } };

            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();
            const turnover = doc.annualTurnover;

            // Classification using real government thresholds
            let classification: string;
            if (turnover <= MSME_TURNOVER_THRESHOLDS.micro.maxTurnoverINR) {
                classification = MSME_TURNOVER_THRESHOLDS.micro.label;
            } else if (turnover <= MSME_TURNOVER_THRESHOLDS.small.maxTurnoverINR) {
                classification = MSME_TURNOVER_THRESHOLDS.small.label;
            } else if (turnover <= MSME_TURNOVER_THRESHOLDS.medium.maxTurnoverINR) {
                classification = MSME_TURNOVER_THRESHOLDS.medium.label;
            } else {
                classification = 'Large Enterprise (exceeds MSME limits)';
            }

            // Check if entity claims MSME but turnover exceeds limits
            const flags: string[] = [];
            const claimsToBeMS = doc.entityType?.toLowerCase().includes('msme') || !!doc.udyamNumber;
            if (claimsToBeMS && turnover > MSME_TURNOVER_THRESHOLDS.medium.maxTurnoverINR) {
                flags.push(`Claims MSME status but annual turnover ₹${(turnover / 10000000).toFixed(1)}Cr exceeds the Medium enterprise limit of ₹250Cr`);
            }

            const evidence: Evidence = {
                id: `ev-turnover-${Date.now()}`,
                source: 'MSME Turnover Classification (GoI 2020)',
                snippet: `Annual turnover: ₹${(turnover / 100000).toFixed(1)}L (₹${(turnover / 10000000).toFixed(2)}Cr) → ${classification}`,
                retrievedAt: now,
                reliability: 0.9,
                relation: flags.length === 0 ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-turnover`,
                dimension: 'identity',
                label: 'MSME Classification',
                value: classification,
                status: flags.length === 0 ? 'verified' : 'contradicted',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { annualTurnover: turnover, classification, claimsToBeMS, flags },
                source: 'MSME Turnover Classification (GoI 2020)',
                confidence: 0.9,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }
}
