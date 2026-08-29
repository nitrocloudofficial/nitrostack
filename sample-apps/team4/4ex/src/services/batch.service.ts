import { Injectable } from '@nitrostack/core';
import { DataLoaderService, KnowledgeInputError } from './data-loader.service.js';
import { RemediationService } from './remediation.service.js';
import type { ProposedUpdate, AuditEntry } from '../types/index.js';

// ── Types ──────────────────────────────────────────────────────────────

const RISK_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export interface BatchApproveResult {
  approved: { proposal_id: string; update: ProposedUpdate; audit: AuditEntry }[];
  skipped: { proposal_id: string; reason: string }[];
  failed: { proposal_id: string; error: string }[];
  summary: {
    total_requested: number;
    approved_count: number;
    skipped_count: number;
    failed_count: number;
  };
}

// ── Service ────────────────────────────────────────────────────────────

/**
 * BatchService — handles batch approval and rejection of knowledge update
 * proposals with safety guards (risk ceiling).
 */
@Injectable({ deps: [DataLoaderService, RemediationService] })
export class BatchService {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly remediationService: RemediationService,
  ) {}

  /**
   * Approve multiple proposals at once with an optional risk ceiling.
   *
   * @param proposalIds  Array of proposal IDs to approve (1–50).
   * @param riskCeiling  Optional risk level ceiling. Proposals above this level
   *                     are skipped (not approved). E.g. "MEDIUM" means only
   *                     LOW and MEDIUM are approved.
   * @param reason       Optional reason applied to all approvals.
   */
  batchApprove(
    proposalIds: string[],
    riskCeiling?: string,
    reason?: string,
  ): BatchApproveResult {
    if (!proposalIds || proposalIds.length === 0) {
      throw new KnowledgeInputError('proposal_ids must contain at least one ID');
    }
    if (proposalIds.length > 50) {
      throw new KnowledgeInputError(
        `Too many proposals: ${proposalIds.length}. Maximum is 50 per batch.`,
      );
    }

    // Validate risk ceiling if provided
    if (riskCeiling && !RISK_RANK[riskCeiling]) {
      throw new KnowledgeInputError(
        `Invalid risk_ceiling "${riskCeiling}". Must be one of: LOW, MEDIUM, HIGH, CRITICAL`,
      );
    }

    const pendingUpdates = this.dataLoader.getPendingUpdates();
    const pendingMap = new Map(pendingUpdates.map((u) => [u.id, u]));

    const approved: BatchApproveResult['approved'] = [];
    const skipped: BatchApproveResult['skipped'] = [];
    const failed: BatchApproveResult['failed'] = [];

    // De-duplicate proposal IDs
    const uniqueIds = [...new Set(proposalIds)];

    for (const proposalId of uniqueIds) {
      const proposal = pendingMap.get(proposalId);

      // Check if proposal exists
      if (!proposal) {
        failed.push({
          proposal_id: proposalId,
          error: `Proposal not found: ${proposalId}`,
        });
        continue;
      }

      // Check if proposal is in the right state
      if (proposal.status !== 'AWAITING_APPROVAL') {
        skipped.push({
          proposal_id: proposalId,
          reason: `Proposal status is ${proposal.status}, not AWAITING_APPROVAL`,
        });
        continue;
      }

      // Check risk ceiling
      if (riskCeiling) {
        const proposalRank = RISK_RANK[proposal.risk_level] ?? 0;
        const ceilingRank = RISK_RANK[riskCeiling] ?? 0;
        if (proposalRank > ceilingRank) {
          skipped.push({
            proposal_id: proposalId,
            reason: `Risk level ${proposal.risk_level} exceeds ceiling of ${riskCeiling}`,
          });
          continue;
        }
      }

      // Attempt approval
      try {
        const result = this.remediationService.approveUpdate(
          proposalId,
          reason ?? `Batch approved (${uniqueIds.length} proposals)`,
        );
        approved.push({
          proposal_id: proposalId,
          update: result.update,
          audit: result.audit,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        failed.push({
          proposal_id: proposalId,
          error: message,
        });
      }
    }

    return {
      approved,
      skipped,
      failed,
      summary: {
        total_requested: uniqueIds.length,
        approved_count: approved.length,
        skipped_count: skipped.length,
        failed_count: failed.length,
      },
    };
  }
}
