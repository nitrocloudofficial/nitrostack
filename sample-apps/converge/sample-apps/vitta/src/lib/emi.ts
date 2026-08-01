/**
 * emi.ts — reducing-balance EMI + APR math (SPEC.md). Pure, deterministic.
 */

/** Reducing-balance EMI, rounded to nearest rupee. */
export function computeEmi(principal: number, annualRatePct: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return Math.round(principal / tenureMonths);
  const pow = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * pow) / (pow - 1);
  return Math.round(emi);
}

/** Max principal serviceable by a given EMI (inverse of computeEmi). */
export function principalForEmi(emi: number, annualRatePct: number, tenureMonths: number): number {
  const r = annualRatePct / 12 / 100;
  if (r === 0) return Math.round(emi * tenureMonths);
  const pow = Math.pow(1 + r, tenureMonths);
  return Math.round((emi * (pow - 1)) / (r * pow));
}

/**
 * APR including one-time processing fee, approximated as the flat-fee uplift on
 * the reducing-balance rate over the tenure. Good enough for offer display.
 */
export function computeApr(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  processingFeePct: number,
): number {
  const emi = computeEmi(principal, annualRatePct, tenureMonths);
  const totalInterest = emi * tenureMonths - principal;
  const fee = (processingFeePct / 100) * principal;
  const totalCost = totalInterest + fee;
  // annualised cost over average outstanding (~principal/2), expressed as %
  const years = tenureMonths / 12;
  const apr = (totalCost / (principal / 2)) / years * 100;
  return Math.round(apr * 100) / 100;
}

export function totalCost(emi: number, tenureMonths: number, principal: number, processingFeePct: number): number {
  const fee = Math.round((processingFeePct / 100) * principal);
  return emi * tenureMonths + fee;
}
