import { Injectable } from '@nitrostack/core';
import type { ConflictReport } from '../types/index.js';
import { DependencyService } from './dependency.service.js';
import { ValidationService } from './validation.service.js';
import { DataLoaderService } from './data-loader.service.js';

@Injectable({
  deps: [DataLoaderService, DependencyService, ValidationService],
})
export class ConflictService {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly dependencyService: DependencyService,
    private readonly validationService: ValidationService,
  ) {}

  detectConflicts(sourceId: string, factKey: string): ConflictReport {
    const affected = this.dependencyService.findAffectedKnowledge(
      sourceId,
      factKey,
    );
    const validations = this.validationService.validateAllClaimsForFact(
      sourceId,
      factKey,
    );
    const documents = new Map(
      this.dataLoader.getDocuments().map((document) => [document.id, document]),
    );

    const results = validations.map((validation) => ({
      document_id: validation.document_id,
      document_title:
        documents.get(validation.document_id)?.title ?? validation.document_title,
      claim_id: validation.claim_id,
      claim_text: validation.claim_text,
      status: validation.status,
      explanation: validation.explanation,
    }));

    return {
      source_id: sourceId,
      fact_key: factKey,
      authoritative_value: affected.current_value,
      total_claims_checked: results.length,
      conflicts: results.filter((result) => result.status === 'CONFLICT').length,
      valid: results.filter((result) => result.status === 'VALID').length,
      ambiguous: results.filter((result) => result.status === 'AMBIGUOUS').length,
      results,
    };
  }
}
