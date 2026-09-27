import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RiskInterpreterService } from './risk-interpreter.service.js';
import { FilterEvidenceResult } from '../../types.js';

describe('RiskInterpreterService', () => {
  let service: RiskInterpreterService;

  beforeEach(() => {
    service = new RiskInterpreterService();
  });

  test('should interpret Person 2 sample payload seamlessly', () => {
    const person2Payload = {
      disease: 'type2_diabetes' as const,
      filterResult: {
        total: 3,
        includedCount: 1,
        excludedCount: 2,
        allDecisions: [
          {
            rsid: 'rs7903146',
            riskAllele: 'T',
            decision: 'included' as const,
            effectSize: 1.33,
            effectType: 'OR' as const,
            pvalue: 1.5e-25,
            pvalueFormatted: '1.5 × 10^-25',
            totalSampleSize: 116981,
            ancestralGroups: ['European'],
            studyAccession: 'GCST000028',
            pubmedId: '17293876',
            traitName: 'Type 2 diabetes',
            reason: 'included: genome-wide significant',
          },
          {
            rsid: 'rs5219',
            riskAllele: 'T',
            decision: 'excluded' as const,
            effectSize: 0,
            effectType: 'unknown' as const,
            pvalue: 8e-53,
            studyAccession: 'EXAMPLE',
            pubmedId: 'EXAMPLE',
            traitName: 'HbA1c measurement',
            reason: 'excluded: phenotype mismatch',
          },
        ],
      },
      prsResult: {
        totalScore: 0.5704,
        variantsIncluded: 1,
        genotypeAssumed: false,
        contributions: [
          {
            rsid: 'rs7903146',
            riskAllele: 'T',
            genotypeAlleleCount: 2,
            weight: 0.2852,
            effectType: 'OR_log' as const,
            contribution: 0.5704,
            studyAccession: 'GCST000028',
            pubmedId: '17293876',
          },
        ],
      },
    };

    const result = service.interpret(
      person2Payload.prsResult as any,
      person2Payload.filterResult as any,
      person2Payload.disease
    );

    assert.strictEqual(result.disease, 'type2_diabetes');
    assert.strictEqual(result.prsScore, 0.5704);
    assert.strictEqual(result.tier, 'low');
    assert.strictEqual(result.confidenceLevel, 'low'); // only 1 variant included out of 3 total filtered
    assert.strictEqual(typeof result.zScore, 'number');
    assert.strictEqual(typeof result.percentileApprox, 'number');
  });

  test('should interpret a moderate risk score correctly', () => {
    const prsResult: any = {
      disease: 'type2_diabetes',
      totalScore: 0.80,
      contributions: [],
      variantsIncluded: 5,
      genotypeAssumed: false,
    };
    const filterResult: FilterEvidenceResult = {
      disease: 'type2_diabetes',
      total: 5,
      includedCount: 5,
      excludedCount: 0,
      ancestryNote: '',
      allDecisions: [],
    };

    const result = service.interpret(prsResult, filterResult);

    assert.strictEqual(result.disease, 'type2_diabetes');
    assert.strictEqual(result.tier, 'moderate');
    assert.strictEqual(result.zScore, 0);
    assert.strictEqual(result.percentileApprox, 50);
    assert.strictEqual(result.confidenceLevel, 'high');
  });

  test('should classify high risk scores with zScore > 0.5', () => {
    const prsResult: any = {
      disease: 'type2_diabetes',
      totalScore: 1.20,
      contributions: [],
      variantsIncluded: 5,
      genotypeAssumed: false,
    };
    const result = service.interpret(prsResult);
    assert.strictEqual(result.tier, 'high');
    assert.strictEqual(result.zScore > 0.5, true);
  });
});
