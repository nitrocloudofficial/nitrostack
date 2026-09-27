import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateEligibility } from '../src/modules/eligibility/eligibility.engine.ts';
import type { CheckSchemeEligibilityInput, Scheme } from '../src/shared/contracts.ts';
import { Scheme as SchemeSchema } from '../src/shared/contracts.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Importing the zod schemas pulls in @nitrostack/core, whose DI container keeps
// the event loop alive (it targets a long-running server, not a one-off test
// process). Force exit once this file finishes so `npm test` doesn't hang.
// Same approach as src/modules/growth/growth.service.test.ts.
after(() => {
  setTimeout(() => process.exit(process.exitCode ?? 0), 100);
});

function loadRealSchemes(): Scheme[] {
  const file = path.join(__dirname, '..', 'data', 'schemes.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function baseInput(overrides: Partial<CheckSchemeEligibilityInput> = {}): CheckSchemeEligibilityInput {
  return {
    age: 30,
    monthlyIncome: 20000,
    gender: 'male',
    occupation: 'salaried',
    hasBankAccount: true,
    isTaxPayer: false,
    ...overrides
  };
}

test('evaluates all 7 schemes on every call', () => {
  const result = evaluateEligibility(loadRealSchemes(), baseInput());
  assert.equal(result.eligible.length + result.ineligible.length, 7);
});

test('output always carries educational_only and a risk_note', () => {
  const result = evaluateEligibility(loadRealSchemes(), baseInput());
  assert.equal(result.educational_only, true);
  assert.ok(result.risk_note.length > 0);
});

test('an 18-year-old sits exactly at the PMJDY/APY minimum age and qualifies', () => {
  const result = evaluateEligibility(loadRealSchemes(), baseInput({ age: 18 }));
  const eligibleIds = result.eligible.map((e) => e.schemeId);
  assert.ok(eligibleIds.includes('PMJDY'));
  assert.ok(eligibleIds.includes('APY'));
});

test('a 17-year-old fails the age-18 boundary with a named reason', () => {
  const result = evaluateEligibility(loadRealSchemes(), baseInput({ age: 17 }));
  const pmjdy = result.ineligible.find((i) => i.schemeId === 'PMJDY');
  assert.ok(pmjdy);
  assert.match(pmjdy!.failedCondition, /below the minimum age/);
});

test('a 10-year-old girl child sits exactly at the SSY maximum age and qualifies', () => {
  const result = evaluateEligibility(loadRealSchemes(), baseInput({ age: 10, gender: 'female' }));
  const ssy = result.eligible.find((e) => e.schemeId === 'SSY');
  assert.ok(ssy, 'expected SSY to be eligible for a 10-year-old girl');
});

test('an 11-year-old girl fails SSY just past the age boundary', () => {
  const result = evaluateEligibility(loadRealSchemes(), baseInput({ age: 11, gender: 'female' }));
  const ssy = result.ineligible.find((i) => i.schemeId === 'SSY');
  assert.ok(ssy);
  assert.match(ssy!.failedCondition, /exceeds the maximum age/);
});

test('a boy fails SSY on gender regardless of age', () => {
  const result = evaluateEligibility(loadRealSchemes(), baseInput({ age: 5, gender: 'male' }));
  const ssy = result.ineligible.find((i) => i.schemeId === 'SSY');
  assert.ok(ssy);
  assert.match(ssy!.failedCondition, /restricted to female/);
});

test('income sitting exactly at the ceiling qualifies; one rupee over does not', () => {
  // schemes.json has no real income ceilings authored yet (Jayaram's data, all null) —
  // this uses a synthetic in-memory scheme to pin down the boundary behavior.
  const syntheticScheme: Scheme = {
    schemeId: 'NPS',
    schemeName: 'Synthetic Income-Capped Scheme',
    ageMin: 18,
    ageMax: 65,
    incomeCeiling: 25000,
    gender: null,
    requiresExistingBankAccount: false,
    taxPayerStatus: 'not_applicable',
    benefits: [],
    documents: [],
    applyLink: 'https://example.gov.in/synthetic'
  };

  const atCeiling = evaluateEligibility([syntheticScheme], baseInput({ monthlyIncome: 25000 }));
  assert.equal(atCeiling.eligible.length, 1);

  const overCeiling = evaluateEligibility([syntheticScheme], baseInput({ monthlyIncome: 25001 }));
  assert.equal(overCeiling.ineligible.length, 1);
  assert.match(overCeiling.ineligible[0].failedCondition, /exceeds the income ceiling/);
});

// --- occupation enforcement (added +4h) ---------------------------------
// Regression guard: `occupation` was accepted by the tool and silently ignored
// by the engine. These fail if that ever comes back.

function schemeWithOccupations(occupations: Scheme['occupations']): Scheme[] {
  const [first] = loadRealSchemes();
  return [{ ...first, ageMin: 0, ageMax: null, gender: null, requiresExistingBankAccount: false, taxPayerStatus: 'not_applicable', occupations }];
}

test('occupation restriction rejects a non-matching applicant with a named reason', () => {
  const result = evaluateEligibility(schemeWithOccupations(['retired']), baseInput({ occupation: 'salaried' }));
  assert.equal(result.eligible.length, 0);
  assert.match(result.ineligible[0].failedCondition, /restricted to retired/);
});

test('occupation restriction admits a matching applicant', () => {
  const result = evaluateEligibility(schemeWithOccupations(['retired']), baseInput({ occupation: 'retired' }));
  assert.equal(result.eligible.length, 1);
  assert.match(result.eligible[0].reason, /occupation retired is eligible/);
});

test('an empty occupations array means no occupation restriction', () => {
  for (const occupation of ['salaried', 'self_employed', 'student', 'homemaker', 'retired', 'unemployed'] as const) {
    const result = evaluateEligibility(schemeWithOccupations([]), baseInput({ occupation }));
    assert.equal(result.eligible.length, 1, `${occupation} should not be blocked`);
  }
});

test('every scheme in the real rulebook satisfies the frozen Scheme contract', () => {
  for (const scheme of loadRealSchemes()) {
    const parsed = SchemeSchema.safeParse(scheme);
    assert.ok(parsed.success, `${scheme.schemeId} does not match the contract`);
  }
});
