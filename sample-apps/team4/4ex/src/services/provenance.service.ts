import { Injectable } from '@nitrostack/core';
import type { ProvenanceChain } from '../types/index.js';
import {
  DataLoaderService,
  KnowledgeInputError,
} from './data-loader.service.js';
import { ValidationService } from './validation.service.js';

@Injectable({ deps: [DataLoaderService, ValidationService] })
export class ProvenanceService {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly validationService: ValidationService,
  ) {}

  traceClaim(documentId: string, claimId: string): ProvenanceChain {
    const document = this.dataLoader.getDocumentById(documentId);
    if (!document) {
      throw new KnowledgeInputError(`Unknown document: ${documentId}`);
    }

    const claim = document.claims.find((item) => item.id === claimId);
    if (!claim) {
      throw new KnowledgeInputError(
        `Unknown claim ${claimId} in document ${documentId}`,
      );
    }

    const dependency = this.dataLoader
      .getDependencies()
      .find(
        (item) =>
          item.dependent_document_id === documentId &&
          item.dependent_claim_id === claimId,
      );
    if (!dependency) {
      throw new KnowledgeInputError(
        `Claim has no authoritative dependency: ${claimId}`,
      );
    }

    const currentSource = this.dataLoader.getSourceById(dependency.source_id);
    if (!currentSource) {
      throw new KnowledgeInputError(
        `Unknown authoritative source: ${dependency.source_id}`,
      );
    }
    const currentValue = currentSource.facts[dependency.fact_key];
    if (currentValue === undefined) {
      throw new KnowledgeInputError(
        `Unknown fact for ${dependency.source_id}: ${dependency.fact_key}`,
      );
    }

    const previousSource = this.dataLoader.getPreviousSourceById(
      dependency.source_id,
    );
    const history = [];
    const previousValue = previousSource?.facts[dependency.fact_key];
    if (previousSource && previousValue !== undefined) {
      history.push({
        source_id: previousSource.id,
        source_title: previousSource.title,
        version: previousSource.version,
        value: previousValue,
        status: 'superseded' as const,
      });
    }
    history.push({
      source_id: currentSource.id,
      source_title: currentSource.title,
      version: currentSource.version,
      value: currentValue,
      status: 'current' as const,
    });

    const validation = this.validationService.validateClaim(
      documentId,
      claimId,
    );
    const isCurrent = validation.status === 'VALID';

    return {
      claim: {
        document_id: document.id,
        document_title: document.title,
        claim_id: claim.id,
        claim_text: claim.text,
      },
      depends_on_fact: `${dependency.source_id}.${dependency.fact_key}`,
      source_history: history,
      is_current: isCurrent,
      conclusion: buildConclusion(
        validation.status,
        previousValue,
        currentValue,
        currentSource.version,
      ),
    };
  }
}

function buildConclusion(
  status: 'VALID' | 'CONFLICT' | 'AMBIGUOUS',
  previousValue: string | undefined,
  currentValue: string,
  currentVersion: string,
): string {
  if (status === 'VALID') {
    return `This claim matches the current authoritative value of ${currentValue} from version ${currentVersion}.`;
  }
  if (status === 'CONFLICT') {
    if (previousValue !== undefined) {
      return `This claim references a value inconsistent with the current authoritative value of ${currentValue} from version ${currentVersion}; the previous version recorded ${previousValue}.`;
    }
    return `This claim conflicts with the current authoritative value of ${currentValue} from version ${currentVersion}.`;
  }
  return `This claim cannot be confirmed against the current authoritative value of ${currentValue} from version ${currentVersion}.`;
}
