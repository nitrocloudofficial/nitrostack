/**
 * Safety-critical: DDI severity heuristic + evidence
 * extraction must be 100% branch-covered.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyInteractionSeverity,
  findInteractionEvidence,
  DrugsService,
} from '../../src/modules/drugs/drugs.service.js';

describe('classifyInteractionSeverity', () => {
  it('flags "contraindicated" text as contraindicated', () => {
    expect(
      classifyInteractionSeverity('Coadministration is contraindicated in patients...'),
    ).toBe('contraindicated');
  });

  it('flags "avoid combining" language as major', () => {
    expect(classifyInteractionSeverity('Avoid concomitant use of aspirin.')).toBe('major');
    expect(classifyInteractionSeverity('Do not coadminister these agents.')).toBe('major');
    expect(classifyInteractionSeverity('Serious bleeding may occur.')).toBe('major');
    expect(classifyInteractionSeverity('Risk of severe hypoglycemia.')).toBe('major');
    expect(classifyInteractionSeverity('Potentially life-threatening arrhythmia.')).toBe('major');
  });

  it('flags bleeding-risk elevation language as major', () => {
    expect(
      classifyInteractionSeverity('Antiplatelet agents increase the risk of bleeding.'),
    ).toBe('major');
    expect(
      classifyInteractionSeverity('Drugs that can increase the risk of hemorrhage include...'),
    ).toBe('major');
  });

  it('flags "monitor / may increase" language as moderate', () => {
    expect(classifyInteractionSeverity('Monitor INR closely when starting.')).toBe('moderate');
    expect(classifyInteractionSeverity('May increase serum concentrations.')).toBe('moderate');
    expect(classifyInteractionSeverity('Use with caution in elderly patients.')).toBe('moderate');
    expect(classifyInteractionSeverity('Dose adjustment may be needed.')).toBe('moderate');
  });

  it('flags neutral mention text as minor', () => {
    expect(classifyInteractionSeverity('Aspirin is metabolized hepatically.')).toBe('minor');
  });
});

describe('findInteractionEvidence', () => {
  const labelText = [
    'Warfarin sodium may interact with many drugs. Aspirin may increase the anticoagulant effect. ' +
    'NSAIDs increase bleeding risk. Patients should report unusual bleeding.',
  ];

  it('extracts sentences mentioning the alias', () => {
    const evidence = findInteractionEvidence(labelText, ['aspirin']);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence[0]).toMatch(/aspirin/i);
  });

  it('returns empty when no alias matches', () => {
    expect(findInteractionEvidence(labelText, ['acetaminophen'])).toEqual([]);
  });

  it('matches any of multiple aliases', () => {
    const evidence = findInteractionEvidence(labelText, ['tylenol', 'nsaids']);
    expect(evidence.some((e) => /nsaids/i.test(e))).toBe(true);
  });

  it('ignores aliases shorter than 3 chars', () => {
    expect(findInteractionEvidence(labelText, ['ab'])).toEqual([]);
  });

  it('caps excerpts at maxExcerpts and 300 chars', () => {
    const long = Array.from({ length: 10 }, (_, i) => `Aspirin fact number ${i}.`).join(' ');
    const evidence = findInteractionEvidence([long], ['aspirin'], 3);
    expect(evidence.length).toBeLessThanOrEqual(3);
    for (const e of evidence) expect(e.length).toBeLessThanOrEqual(300);
  });

  it('ranks keyword-bearing excerpts above neutral mentions', () => {
    const text = [
      'Aspirin is listed in table 3 among antiplatelet agents. ' +
        'Aspirin may increase the anticoagulant effect; avoid concomitant use when possible. ' +
        'Aspirin appears again in a footnote.',
    ];
    const evidence = findInteractionEvidence(text, ['aspirin'], 3);
    expect(evidence.length).toBeGreaterThan(1);
    // Strongest language first
    expect(classifyInteractionSeverity(evidence[0])).toBe('major');
    expect(evidence[0]).toMatch(/avoid concomitant use/i);
  });
});

describe('DrugsService.checkInteractions (mocked integrations)', () => {
  function makeService(overrides: {
    labels?: Record<string, unknown>;
    rxcuis?: Record<string, string>;
  }) {
    const rxnorm = {
      resolveName: (name: string) => Promise.resolve(overrides.rxcuis?.[name] ?? null),
      getProperties: () => Promise.resolve(null),
    };
    const openfda = {
      getLabel: (name: string) => Promise.resolve(overrides.labels?.[name] ?? null),
    };
    return new DrugsService(rxnorm as never, openfda as never);
  }

  it('finds a major interaction between warfarin and aspirin via label cross-scan', async () => {
    const service = makeService({
      labels: {
        warfarin: {
          openfda: { generic_name: ['warfarin sodium'] },
          drug_interactions: [
            'Aspirin may increase the anticoagulant effect of warfarin; avoid concomitant use when possible.',
          ],
        },
        aspirin: { openfda: { generic_name: ['aspirin'] }, drug_interactions: [] },
      },
    });

    const result = await service.checkInteractions(['warfarin', 'aspirin']);

    expect(result.interactions).toHaveLength(1);
    expect(result.interactions[0].pair).toEqual(['warfarin', 'aspirin']);
    expect(result.interactions[0].severity_band).toBe('major');
    expect(result.interactions[0].evidence_excerpt).toMatch(/aspirin/i);
    expect(result.drugs_without_labels).toEqual([]);
    expect(result.methodology_note).toMatch(/not proof of safety/i);
  });

  it('lists drugs whose labels are missing instead of failing', async () => {
    const service = makeService({
      labels: {
        warfarin: {
          drug_interactions: ['Monitor when combined with any analgesic.'],
        },
        // 'unknowndrug' has no label
      },
    });

    const result = await service.checkInteractions(['warfarin', 'unknowndrug']);

    expect(result.drugs_without_labels).toEqual(['unknowndrug']);
    expect(result.interactions).toEqual([]);
  });

  it('scans OTC label warnings sections when drug_interactions is absent', async () => {
    const service = makeService({
      labels: {
        warfarin: {
          drug_interactions: [
            'Table 3: Drugs that Can Increase the Risk of Bleeding — Antiplatelet agents: aspirin, cilostazol, clopidogrel.',
          ],
        },
        // OTC-style aspirin label: no drug_interactions, content in warnings
        aspirin: {
          warnings: [
            'Ask a doctor before use if you are taking warfarin or another anticoagulant.',
          ],
        },
      },
    });

    const result = await service.checkInteractions(['warfarin', 'aspirin']);

    expect(result.interactions).toHaveLength(1);
    expect(['major', 'moderate']).toContain(result.interactions[0].severity_band);
    expect(result.interactions[0].evidence_excerpt.length).toBeGreaterThan(10);
  });

  it('returns no interactions when labels have no cross-mentions', async () => {
    const service = makeService({
      labels: {
        metformin: { drug_interactions: ['Cationic drugs may affect elimination.'] },
        lisinopril: { drug_interactions: ['Potassium-sparing diuretics may increase potassium.'] },
      },
    });

    const result = await service.checkInteractions(['metformin', 'lisinopril']);
    expect(result.interactions).toEqual([]);
    expect(result.drugs_without_labels).toEqual([]);
  });
});
