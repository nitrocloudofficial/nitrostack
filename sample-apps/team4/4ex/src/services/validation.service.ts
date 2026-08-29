import { Injectable } from '@nitrostack/core';
import type { ClaimValidation, ValidationStatus } from '../types/index.js';
import {
  DataLoaderService,
  KnowledgeInputError,
} from './data-loader.service.js';

const GENERIC_POLICY_LANGUAGE = /\b(?:current\s+policy|as\s+per\s+(?:the\s+)?policy)\b/i;

/**
 * Deterministic claim validation. This intentionally performs only explicit
 * value matching; semantic interpretation remains the responsibility of the
 * MCP client/LLM as specified by Phase 5.
 */
@Injectable({ deps: [DataLoaderService] })
export class ValidationService {
  constructor(private readonly dataLoader: DataLoaderService) {}

  validateClaim(documentId: string, claimId: string): ClaimValidation {
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

    const dependency = this.dataLoader.getDependencyForClaim(documentId, claimId);

    if (!dependency) {
      return {
        document_id: document.id,
        document_title: document.title,
        claim_id: claim.id,
        claim_text: claim.text,
        depends_on: claim.depends_on ?? null,
        authoritative_value: 'unknown',
        status: 'AMBIGUOUS',
        explanation: 'Claim has no authoritative dependency to validate against',
      };
    }

    const source = this.dataLoader.getSourceById(dependency.source_id);
    if (!source) {
      throw new KnowledgeInputError(
        `Unknown authoritative source: ${dependency.source_id}`,
      );
    }
    const authoritativeValue = source.facts[dependency.fact_key];
    if (authoritativeValue === undefined) {
      throw new KnowledgeInputError(
        `Unknown fact for ${dependency.source_id}: ${dependency.fact_key}`,
      );
    }

    const { status, explanation } = determineStatus(
      claim.text,
      authoritativeValue,
    );

    return {
      document_id: document.id,
      document_title: document.title,
      claim_id: claim.id,
      claim_text: claim.text,
      depends_on: `${dependency.source_id}.${dependency.fact_key}`,
      authoritative_value: authoritativeValue,
      status,
      explanation,
    };
  }

  validateAllClaimsForFact(
    sourceId: string,
    factKey: string,
  ): ClaimValidation[] {
    const source = this.dataLoader.getSourceById(sourceId);
    if (!source) {
      throw new KnowledgeInputError(`Unknown authoritative source: ${sourceId}`);
    }
    if (!(factKey in source.facts)) {
      throw new KnowledgeInputError(`Unknown fact for ${sourceId}: ${factKey}`);
    }

    return this.dataLoader
      .getDependencies()
      .filter(
        (item) => item.source_id === sourceId && item.fact_key === factKey,
      )
      .filter((item, index, items) =>
        items.findIndex(
          (candidate) =>
            candidate.dependent_document_id === item.dependent_document_id &&
            candidate.dependent_claim_id === item.dependent_claim_id,
        ) === index,
      )
      .map((item) =>
        this.validateClaim(item.dependent_document_id, item.dependent_claim_id),
      );
  }
}

export function determineStatus(
  claimText: string,
  authoritativeValue: string,
): { status: ValidationStatus; explanation: string } {
  if (GENERIC_POLICY_LANGUAGE.test(claimText)) {
    return {
      status: 'AMBIGUOUS',
      explanation: 'Claim references policy generically without specifying a value',
    };
  }

  const normalizedClaim = normalizeValue(claimText);
  const normalizedAuthoritative = normalizeValue(authoritativeValue);

  if (containsValue(normalizedClaim, normalizedAuthoritative)) {
    return {
      status: 'VALID',
      explanation: `Claim matches authoritative value of ${authoritativeValue}`,
    };
  }

  const explicitValues = extractExplicitValues(normalizedClaim);
  if (explicitValues.length === 0) {
    return {
      status: 'AMBIGUOUS',
      explanation: 'Claim does not specify an explicit value to compare',
    };
  }

  return {
    status: 'CONFLICT',
    explanation: `Claim states ${explicitValues.join(', ')} but authoritative value is ${authoritativeValue}`,
  };
}

function normalizeValue(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function containsValue(claim: string, value: string): boolean {
  if (!value) return false;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(
    claim,
  );
}

function extractExplicitValues(claim: string): string[] {
  const matches = claim.match(
    /\$\s?\d[\d,]*(?:\.\d+)?(?:\s*\/\s*[a-z]+)?|\b\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?\s*(?:years?|months?|weeks?|days?|hours?|am|pm|levels?)\b|\b(?:true|false|daily|weekly|monthly|yearly|economy|business|first[- ]class)\b/gi,
  );
  const values = matches ? matches.map(normalizeValue) : [];
  const namedValue = claim.match(
    /\b(?:rests with|authority\s+(?:is|rests with)|approved by)\s+(?:the\s+)?([a-z][a-z -]{2,40}?)(?=\s+for\b|[.!?,]|$)/i,
  );
  if (namedValue?.[1]) values.push(normalizeValue(namedValue[1]));
  return [...new Set(values)];
}
