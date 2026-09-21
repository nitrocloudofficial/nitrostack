import type { CheckSchemeEligibilityInput, EligibilityResult, Scheme } from '../../shared/contracts.js';

export function evaluateEligibility(schemes: Scheme[], input: CheckSchemeEligibilityInput): EligibilityResult {
  const eligible: EligibilityResult['eligible'] = [];
  const ineligible: EligibilityResult['ineligible'] = [];

  for (const scheme of schemes) {
    const failedCondition = findFailedCondition(scheme, input);
    if (failedCondition) {
      ineligible.push({ schemeId: scheme.schemeId, schemeName: scheme.schemeName, failedCondition });
    } else {
      eligible.push({ schemeId: scheme.schemeId, schemeName: scheme.schemeName, reason: buildEligibleReason(scheme, input) });
    }
  }

  return {
    eligible,
    ineligible,
    risk_note: 'This is an educational eligibility check based on scheme rules; verify with official sources before applying.',
    educational_only: true
  };
}

function findFailedCondition(scheme: Scheme, input: CheckSchemeEligibilityInput): string | null {
  if (input.age < scheme.ageMin) {
    return `Age ${input.age} is below the minimum age of ${scheme.ageMin}`;
  }
  if (scheme.ageMax != null && input.age > scheme.ageMax) {
    return `Age ${input.age} exceeds the maximum age of ${scheme.ageMax}`;
  }
  if (scheme.incomeCeiling != null && input.monthlyIncome > scheme.incomeCeiling) {
    return `Monthly income ${input.monthlyIncome} exceeds the income ceiling of ${scheme.incomeCeiling}`;
  }
  if (scheme.gender && input.gender !== scheme.gender) {
    return `Scheme is restricted to ${scheme.gender} applicants`;
  }
  if (scheme.requiresExistingBankAccount && !input.hasBankAccount) {
    return 'Requires an existing bank account';
  }
  if (scheme.taxPayerStatus === 'required' && !input.isTaxPayer) {
    return 'Requires tax-payer status';
  }
  if (scheme.taxPayerStatus === 'excluded' && input.isTaxPayer) {
    return 'Income-tax payers are excluded from this scheme';
  }
  if (scheme.occupations && scheme.occupations.length > 0 && !scheme.occupations.includes(input.occupation)) {
    return `Scheme is restricted to ${scheme.occupations.join(', ')} applicants (applicant is ${input.occupation})`;
  }
  return null;
}

function buildEligibleReason(scheme: Scheme, input: CheckSchemeEligibilityInput): string {
  const parts = [scheme.ageMax != null ? `age ${input.age} is within ${scheme.ageMin}-${scheme.ageMax}` : `age ${input.age} meets the minimum of ${scheme.ageMin}`];
  if (scheme.incomeCeiling != null) {
    parts.push(`income is within the ceiling of ${scheme.incomeCeiling}`);
  }
  if (scheme.gender) {
    parts.push(`gender matches the ${scheme.gender}-only requirement`);
  }
  if (scheme.requiresExistingBankAccount) {
    parts.push('has the required bank account');
  }
  if (scheme.taxPayerStatus === 'required') {
    parts.push('meets the tax-payer requirement');
  }
  if (scheme.taxPayerStatus === 'excluded') {
    parts.push('is not an income-tax payer');
  }
  if (scheme.occupations && scheme.occupations.length > 0) {
    parts.push(`occupation ${input.occupation} is eligible`);
  }
  return `Meets all criteria: ${parts.join(', ')}`;
}
