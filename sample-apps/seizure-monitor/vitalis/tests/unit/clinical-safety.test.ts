import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { env } from '../../src/config/env.js';
import {
  EmergencyDetectionGuard,
  detectEmergencyTerms,
  getEmergencyTerms,
} from '../../src/gateway/emergency-detection.guard.js';
import { ClinicalSafetyInterceptor } from '../../src/gateway/clinical-safety.interceptor.js';
import { TriageService } from '../../src/modules/triage/triage.service.js';

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function context(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'safety-test-request',
    toolName: 'triage_assess_symptoms',
    metadata: {},
    logger,
    ...overrides,
  } as any;
}

describe('EmergencyDetectionGuard', () => {
  it('ships the required approximately 30-rule triage ruleset', () => {
    const data = JSON.parse(
      readFileSync(new URL('../../src/data/red-flag-rules.json', import.meta.url), 'utf8'),
    );
    expect(data.rules.length).toBeGreaterThanOrEqual(30);
    expect(new Set(data.rules.map((rule: { id: string }) => rule.id)).size).toBe(data.rules.length);
  });

  it('loads the complete emergency term list and detects every term individually', () => {
    const terms = getEmergencyTerms();
    expect(terms.length).toBeGreaterThanOrEqual(23);

    for (const term of terms) {
      expect(detectEmergencyTerms({ symptoms: [term] })).toContain(term);
    }
  });

  it('scans nested clinical text and respects word boundaries', () => {
    expect(
      detectEmergencyTerms({
        nested: { reason: 'Patient reports CHEST PAIN and cannot breathe.' },
        notes: ['family noticed blue lips'],
      }),
    ).toEqual(expect.arrayContaining(['chest pain', 'cannot breathe', 'blue lips']));

    expect(detectEmergencyTerms('chest painfulness')).not.toContain('chest pain');
  });

  it('annotates emergency context but never blocks the request', async () => {
    const requestContext = context({ input: { reason: '  chest pain  ' } });
    await expect(new EmergencyDetectionGuard().canActivate(requestContext)).resolves.toBe(true);
    expect(requestContext.emergency).toEqual({
      ruleset_available: true,
      matched_terms: ['chest pain'],
    });
  });
});

describe('ClinicalSafetyInterceptor', () => {
  it('adds the safety envelope, escalates urgency, rewrites output, and stamps synthetic care data', async () => {
    const requestContext = context({
      toolName: 'care_generate_handoff',
      input: { reason: 'Patient has chest pain.' },
      metadata: { 'x-vitalis-lang': 'es' },
      emergency: { ruleset_available: true, matched_terms: [] },
    });

    const result = await new ClinicalSafetyInterceptor().intercept(requestContext, async () => ({
      guidance: 'You have hypertension.',
      nested: { message: 'This is definitely a diagnosis.' },
      count: 2,
      _safety: {
        disclaimer: '',
        urgency_tier: 'routine',
        red_flags_detected: ['existing flag'],
        synthetic_data: false,
      },
    }));

    expect(result._safety).toMatchObject({
      disclaimer_lang: 'es',
      urgency_tier: 'emergency',
      synthetic_data: true,
    });
    expect(result._safety.disclaimer).toContain('Solo para fines informativos');
    expect(result._safety.red_flags_detected).toEqual(
      expect.arrayContaining(['existing flag', 'chest pain']),
    );
    expect(result.guidance).toContain('EMERGENCY GUIDANCE');
    expect(result.guidance).toContain('your symptoms may be associated with hypertension');
    expect(result.nested.message).not.toContain('definitely');
    expect(result.count).toBe(2);
  });

  it('forces synthetic_data on FHIR and keeps research urgency non-applicable', async () => {
    const fhirContext = context({
      toolName: 'fhir_get_patient',
      input: { patient_id: 'synthetic-1' },
    });
    const fhirResult = await new ClinicalSafetyInterceptor().intercept(fhirContext, async () => ({
      patient_id: 'synthetic-1',
      _safety: { urgency_tier: 'not_applicable', synthetic_data: false },
    }));
    expect(fhirResult._safety.synthetic_data).toBe(true);

    const researchContext = context({
      toolName: 'research_search_pubmed',
      input: { query: 'evidence' },
    });
    const researchResult = await new ClinicalSafetyInterceptor().intercept(
      researchContext,
      async () => ({ results: [{ title: 'Evidence' }] }),
    );
    expect(researchResult._safety.urgency_tier).toBe('not_applicable');
    expect(researchResult._safety.synthetic_data).toBe(false);
  });

  it('wraps primitive results so every clinical response has a safety envelope', async () => {
    const result = await new ClinicalSafetyInterceptor().intercept(
      context(),
      async () => 'plain result',
    );

    expect(result.data).toBe('plain result');
    expect(result._safety).toMatchObject({
      urgency_tier: 'not_applicable',
      disclaimer_lang: 'en',
    });
  });

  it('marks the test-only safety toggle and leaves raw output available for comparison', async () => {
    const previousLayer = env.VITALIS_SAFETY_LAYER;
    const previousNodeEnv = env.NODE_ENV;
    (env as any).VITALIS_SAFETY_LAYER = 'off';
    (env as any).NODE_ENV = 'test';

    try {
      const result = await new ClinicalSafetyInterceptor().intercept(context(), async () => ({
        guidance: 'You have hypertension.',
      }));
      expect(result.guidance).toBe('You have hypertension.');
      expect(result._safety).toMatchObject({
        safety_layer: 'disabled',
        safety_layer_disabled: true,
      });
    } finally {
      (env as any).VITALIS_SAFETY_LAYER = previousLayer;
      (env as any).NODE_ENV = previousNodeEnv;
    }
  });

  it('ignores the safety-off toggle outside tests and logs loudly', async () => {
    const previousLayer = env.VITALIS_SAFETY_LAYER;
    const previousNodeEnv = env.NODE_ENV;
    (env as any).VITALIS_SAFETY_LAYER = 'off';
    (env as any).NODE_ENV = 'development';
    logger.error.mockClear();

    try {
      const result = await new ClinicalSafetyInterceptor().intercept(context(), async () => ({
        guidance: 'You have hypertension.',
      }));
      expect(result.guidance).not.toContain('You have hypertension');
      expect(result._safety.safety_layer_disabled).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('test-only'),
      );
    } finally {
      (env as any).VITALIS_SAFETY_LAYER = previousLayer;
      (env as any).NODE_ENV = previousNodeEnv;
    }
  });
});

describe('Triage safety fallbacks and infant schema', () => {
  it('fails red-flag screening toward emergency when the engine throws', () => {
    const result = new TriageService().checkRedFlags(null as any);
    expect(result.is_emergency).toBe(true);
    expect(result.recommended_action).toContain('emergency');
  });

  it('supports precise infant age through age_months', () => {
    const result = new TriageService().assessSymptoms({
      symptoms: ['fever'],
      age: 0,
      age_months: 2,
      sex: 'female',
    });
    expect(result.urgency_tier).toBe('emergency');
    expect(result.red_flags.some((flag) => flag.flag.includes('Infant Fever'))).toBe(true);
  });
});
