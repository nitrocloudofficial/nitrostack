import { assertFiniteNumber } from './types.js';
import type { ScoreDirection } from './types.js';

export type NormalizationProfile =
  | { kind: 'IDENTITY'; min: 0; max: 1; direction: 'HIGHER_BETTER' }
  | { kind: 'INVERSE_PERCENTILE'; cap: number }
  | { kind: 'FIXED_MIN_MAX'; min: number; max: number; direction: ScoreDirection }
  | { kind: 'LOGISTIC'; midpoint: number; slope: number; direction: ScoreDirection };

export function clamp01(value: number): number {
  assertFiniteNumber(value, 'value');
  return Math.min(1, Math.max(0, value));
}

function orient(base: number, direction: ScoreDirection): number {
  return direction === 'HIGHER_BETTER' ? base : 1 - base;
}

export function normalizeScore(raw: number, profile: NormalizationProfile): number {
  assertFiniteNumber(raw, 'raw score');
  switch (profile.kind) {
    case 'IDENTITY':
      return clamp01(raw);
    case 'INVERSE_PERCENTILE':
      assertFiniteNumber(profile.cap, 'percentile cap');
      if (profile.cap <= 0) throw new RangeError('percentile cap must be greater than zero');
      return 1 - clamp01(raw / profile.cap);
    case 'FIXED_MIN_MAX': {
      assertFiniteNumber(profile.min, 'minimum');
      assertFiniteNumber(profile.max, 'maximum');
      if (profile.max <= profile.min) throw new RangeError('maximum must exceed minimum');
      return orient(clamp01((raw - profile.min) / (profile.max - profile.min)), profile.direction);
    }
    case 'LOGISTIC': {
      assertFiniteNumber(profile.midpoint, 'midpoint');
      assertFiniteNumber(profile.slope, 'slope');
      if (profile.slope <= 0) throw new RangeError('logistic slope must be greater than zero');
      const base = 1 / (1 + Math.exp(-profile.slope * (raw - profile.midpoint)));
      return orient(base, profile.direction);
    }
  }
}

export function tryNormalizeScore(
  raw: number,
  profile: NormalizationProfile | undefined,
): number | null {
  return profile === undefined ? null : normalizeScore(raw, profile);
}
