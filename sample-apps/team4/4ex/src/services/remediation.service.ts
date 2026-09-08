import { randomUUID } from 'crypto';
import { Injectable } from '@nitrostack/core';
import type { AuditEntry, ProposedUpdate } from '../types/index.js';
import {
  DataLoaderService,
  KnowledgeInputError,
} from './data-loader.service.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
import { ValidationService } from './validation.service.js';

export interface ProposedUpdateRequest {
  documentId: string;
  claimId: string;
  suggestedText?: string;
}

@Injectable({
  deps: [DataLoaderService, AuditService, RiskService, ValidationService],
})
export class RemediationService {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly auditService: AuditService,
    private readonly riskService: RiskService,
    private readonly validationService: ValidationService,
  ) {}

  proposeUpdate(
    documentId: string,
    claimId: string,
    suggestedText?: string,
  ): ProposedUpdate {
    const proposal = this.createProposal(documentId, claimId, suggestedText);
    this.dataLoader.savePendingUpdates([
      ...this.dataLoader.getPendingUpdates(),
      proposal,
    ]);
    return proposal;
  }

  /**
   * Create several proposals as one all-or-nothing persistence operation.
   * Every request is validated before pending_updates.json is changed.
   */
  proposeUpdates(requests: ProposedUpdateRequest[]): ProposedUpdate[] {
    if (requests.length === 0) return [];

    const seenClaims = new Set<string>();
    for (const request of requests) {
      const key = `${request.documentId}:${request.claimId}`;
      if (seenClaims.has(key)) {
        throw new KnowledgeInputError(
          `Duplicate remediation request for claim: ${request.claimId}`,
        );
      }
      seenClaims.add(key);
    }

    // Build every proposal before the single write so a validation failure
    // cannot leave a partially-created investigation in persistent state.
    const proposals = requests.map((request) =>
      this.createProposal(
        request.documentId,
        request.claimId,
        request.suggestedText,
      ),
    );
    this.dataLoader.savePendingUpdates([
      ...this.dataLoader.getPendingUpdates(),
      ...proposals,
    ]);
    return proposals;
  }

  private createProposal(
    documentId: string,
    claimId: string,
    suggestedText?: string,
  ): ProposedUpdate {
    const { document, claim, dependency, authoritativeValue } =
      this.getClaimContext(documentId, claimId);
    const validation = this.validationService.validateClaim(documentId, claimId);
    if (validation.status !== 'CONFLICT') {
      throw new KnowledgeInputError(
        `Only conflicting claims can receive remediation proposals; current status is ${validation.status}`,
      );
    }

    const replacement = suggestedText?.trim() || this.generateSuggestion(
      claim.text,
      dependency.source_id,
      dependency.fact_key,
      authoritativeValue,
    );
    if (!replacement || replacement === claim.text) {
      throw new KnowledgeInputError(
        'A non-empty suggested_text different from the current claim is required',
      );
    }

    const risk = this.riskService.assessRisk(documentId, claimId);
    const proposal: ProposedUpdate = {
      id: randomUUID(),
      document_id: document.id,
      document_title: document.title,
      claim_id: claim.id,
      current_text: claim.text,
      suggested_text: replacement,
      authoritative_source: dependency.source_id,
      authoritative_fact: dependency.fact_key,
      authoritative_value: authoritativeValue,
      risk_level: risk.risk_level,
      status: 'AWAITING_APPROVAL',
      proposed_at: new Date().toISOString(),
    };

    return proposal;
  }

  approveUpdate(
    proposalId: string,
    reason?: string,
  ): { update: ProposedUpdate; audit: AuditEntry } {
    const updates = this.dataLoader.getPendingUpdates();
    const proposal = updates.find((item) => item.id === proposalId);
    if (!proposal) throw new KnowledgeInputError(`Unknown proposal: ${proposalId}`);
    if (proposal.status !== 'AWAITING_APPROVAL') {
      throw new KnowledgeInputError(
        `Proposal ${proposalId} cannot be approved from status ${proposal.status}`,
      );
    }

    const { claim } = this.getClaimContext(proposal.document_id, proposal.claim_id);
    if (claim.text !== proposal.current_text) {
      throw new KnowledgeInputError(
        `Proposal ${proposalId} is stale because the claim has changed since it was proposed`,
      );
    }
    if (!proposal.suggested_text.trim() || proposal.suggested_text === claim.text) {
      throw new KnowledgeInputError(`Proposal ${proposalId} has an invalid replacement text`);
    }

    const approved: ProposedUpdate = { ...proposal, status: 'APPROVED' };
    const approvedUpdates = updates.map((item) =>
      item.id === proposalId ? approved : item,
    );
    this.dataLoader.savePendingUpdates(approvedUpdates);

    try {
      this.dataLoader.updateDocument(
        proposal.document_id,
        proposal.claim_id,
        proposal.suggested_text,
      );
      const applied: ProposedUpdate = { ...approved, status: 'APPLIED' };
      this.dataLoader.savePendingUpdates(
        approvedUpdates.map((item) => (item.id === proposalId ? applied : item)),
      );
      const audit = this.auditService.recordEntry({
        action: 'UPDATE_APPLIED',
        document_id: proposal.document_id,
        document_title: proposal.document_title,
        claim_id: proposal.claim_id,
        old_value: proposal.current_text,
        new_value: proposal.suggested_text,
        authoritative_source: proposal.authoritative_source,
        reason: reason?.trim() || 'Knowledge update approved and applied',
        risk_level: proposal.risk_level,
      });
      return { update: applied, audit };
    } catch (error) {
      // Best-effort rollback keeps the JSON stores aligned if a later write fails.
      try {
        this.dataLoader.updateDocument(
          proposal.document_id,
          proposal.claim_id,
          proposal.current_text,
        );
        this.dataLoader.savePendingUpdates(updates);
      } catch (rollbackError) {
        throw new Error(
          `Approval failed and rollback also failed: ${String(rollbackError)}`,
        );
      }
      throw error;
    }
  }

  rejectUpdate(proposalId: string, reason?: string): ProposedUpdate {
    const updates = this.dataLoader.getPendingUpdates();
    const proposal = updates.find((item) => item.id === proposalId);
    if (!proposal) throw new KnowledgeInputError(`Unknown proposal: ${proposalId}`);
    if (proposal.status !== 'AWAITING_APPROVAL') {
      throw new KnowledgeInputError(
        `Proposal ${proposalId} cannot be rejected from status ${proposal.status}`,
      );
    }

    const rejected: ProposedUpdate = { ...proposal, status: 'REJECTED' };
    this.dataLoader.savePendingUpdates(
      updates.map((item) => (item.id === proposalId ? rejected : item)),
    );
    this.auditService.recordEntry({
      action: 'UPDATE_REJECTED',
      document_id: proposal.document_id,
      document_title: proposal.document_title,
      claim_id: proposal.claim_id,
      old_value: proposal.current_text,
      new_value: proposal.suggested_text,
      authoritative_source: proposal.authoritative_source,
      reason: reason?.trim() || 'Knowledge update rejected',
      risk_level: proposal.risk_level,
    });
    return rejected;
  }

  getPendingUpdates(): ProposedUpdate[] {
    return this.dataLoader.getPendingUpdates();
  }

  private getClaimContext(documentId: string, claimId: string) {
    const document = this.dataLoader.getDocumentById(documentId);
    if (!document) throw new KnowledgeInputError(`Unknown document: ${documentId}`);
    const claim = document.claims.find((item) => item.id === claimId);
    if (!claim) {
      throw new KnowledgeInputError(`Unknown claim ${claimId} in document ${documentId}`);
    }
    const dependency = this.dataLoader.getDependencyForClaim(documentId, claimId);
    if (!dependency) {
      throw new KnowledgeInputError(`Claim has no authoritative dependency: ${claimId}`);
    }
    const source = this.dataLoader.getSourceById(dependency.source_id);
    const authoritativeValue = source?.facts[dependency.fact_key];
    if (!source || authoritativeValue === undefined) {
      throw new KnowledgeInputError(
        `Unknown authoritative fact: ${dependency.source_id}.${dependency.fact_key}`,
      );
    }
    return { document, claim, dependency, authoritativeValue };
  }

  private generateSuggestion(
    currentText: string,
    sourceId: string,
    factKey: string,
    authoritativeValue: string,
  ): string {
    const previous = this.dataLoader.getPreviousSourceById(sourceId)?.facts[factKey];
    if (previous && previous !== authoritativeValue) {
      const escaped = previous.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const replaced = currentText.replace(new RegExp(escaped, 'gi'), authoritativeValue);
      if (replaced !== currentText) return replaced;
    }
    throw new KnowledgeInputError(
      'Unable to infer a safe replacement; provide suggested_text explicitly',
    );
  }
}
