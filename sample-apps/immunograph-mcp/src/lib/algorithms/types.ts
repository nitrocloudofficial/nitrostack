export type CandidateType = 'MHCI' | 'MHCII' | 'BCELL';
export type ScoreDirection = 'LOWER_BETTER' | 'HIGHER_BETTER';

export function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

export function assertUnitInterval(value: number, name: string): void {
  assertFiniteNumber(value, name);
  if (value < 0 || value > 1) throw new RangeError(`${name} must be between 0 and 1`);
}
