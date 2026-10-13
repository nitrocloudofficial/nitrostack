// src/modules/verification/offline-verification.service.ts

/**
 * ============================================================
 * VeriCite — Offline Verification (fixture-backed)
 * ------------------------------------------------------------
 * Produces engine-shaped results without touching the network, for
 * tests, CI, air-gapped runs, and demos on unreliable connections.
 *
 * Selected only when VERICITE_OFFLINE=true. It is a FALLBACK, never
 * the default — the live three-provider engine is the production
 * path, per the standing instruction to prefer real implementations
 * and keep fixtures only where external APIs may fail.
 *
 * Honesty guarantees, unchanged from Phase 2:
 *   • every record reports provider "Fixture", which reaches the
 *     report and the widget's source chip
 *   • `AuditReport.offlineMode` flags the whole run
 *   • a citation matching no fixture resolves to NOT_FOUND exactly
 *     as a live miss would; fixtures never invent a match
 * ============================================================
 */

import { Injectable } from '@nitrostack/core';

import type { Citation, Claim } from '../../shared/contracts.js';
import { ContradictionAnalyzer } from '../audit/contradiction.analyzer.js';
import { EVIDENCE_FIXTURES, type FixtureRecord } from '../audit/evidence-fixtures.js';
import type { EngineVerificationResult } from './types.js';

@Injectable()
export class OfflineVerificationService {

    async verifyCitation(
        claim: Claim,
        citation: Citation,
    ): Promise<EngineVerificationResult> {
        const fixture = this.match(citation);

        if (!fixture) {
            return {
                claimId: claim.id,
                citationId: citation.id,
                existence: 'NOT_FOUND',
                status: 'NOT_ENOUGH_EVIDENCE',
                confidence: 0,
                reason:
                    'Offline mode: the cited reference matched no record in the local '
                    + 'fixture corpus, so its existence could not be confirmed.',
                verifiedSources: [],
                retracted: false,
                metadata: {},
            };
        }

        const assessment = ContradictionAnalyzer.analyze(claim, {
            title: fixture.title,
            abstract: fixture.abstract,
            retracted: fixture.retracted,
        });

        const status = fixture.retracted
            ? 'CONTRADICTED'
            : assessment.stance === 'CONTRADICTING'
                ? 'CONTRADICTED'
                : assessment.stance === 'SUPPORTING'
                    ? 'SUPPORTED'
                    : 'NOT_ENOUGH_EVIDENCE';

        return {
            claimId: claim.id,
            citationId: citation.id,
            existence: 'FOUND',
            status,
            confidence: assessment.relevance,
            reason: fixture.retracted
                ? `The cited work has been RETRACTED by its publisher. ${assessment.reason}`
                : assessment.reason,
            evidence: fixture.abstract,
            verifiedSources: ['Fixture'],
            retracted: fixture.retracted,
            metadata: {
                doi: fixture.doi,
                paperTitle: fixture.title,
                authors: [...fixture.authors],
                journal: fixture.journal,
                year: fixture.year,
                citationCount: fixture.citationCount,
                source: 'Fixture',
            },
        };
    }

    /* ==========================================================
     * Fixture matching — DOI first, then title keywords
     * ========================================================== */

    private match(citation: Citation): FixtureRecord | undefined {
        if (citation.doi) {
            const byDoi = EVIDENCE_FIXTURES.find(
                (f) => f.doi.toLowerCase() === citation.doi?.toLowerCase(),
            );
            if (byDoi) return byDoi;
        }

        const haystack = `${citation.title ?? ''} ${citation.raw}`.toLowerCase();
        const terms = new Set(
            haystack.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 3),
        );

        return EVIDENCE_FIXTURES.find((f) => f.keywords.some((k) => terms.has(k)));
    }
}
