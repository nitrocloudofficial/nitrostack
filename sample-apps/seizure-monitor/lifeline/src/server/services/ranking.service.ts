import { Injectable } from '@nitrostack/core';
import { Hospital, RankHospitalsInput, RankedHospital, RankingWeights } from '../interfaces/index.js';
import { NoHospitalsFoundError, InvalidCoordinatesError } from '../shared/app-error.js';
import { DistanceCalculator } from '../utils/distance.calculator.js';
import { GeoUtils } from '../utils/geo.utils.js';
import { DEFAULT_RANKING_WEIGHTS, CAPABILITIES } from '../shared/constants.js';

export interface RankHospitalsOutput {
  hospitals: RankedHospital[];
  weights: RankingWeights;
}

interface ScoredCandidate {
  hospital: Hospital;
  distanceKm: number;
  etaMinutes: number;
  specializationScore: number;
}

/**
 * Weighted multi-factor ranking. Every factor except specialization match is
 * min-max normalized across the current candidate set before being weighted,
 * so relative ranking stays meaningful regardless of the absolute values in
 * play (e.g. a 2km search vs. a 40km search). See DEFAULT_RANKING_WEIGHTS in
 * shared/constants.ts for the documented weight table.
 */
@Injectable()
export class RankingService {
  rank(input: RankHospitalsInput): RankHospitalsOutput {
    if (!GeoUtils.isValidCoordinate(input.origin_latitude, input.origin_longitude)) {
      throw new InvalidCoordinatesError();
    }
    if (!input.hospitals || input.hospitals.length === 0) {
      throw new NoHospitalsFoundError(input.required_capability);
    }

    const candidates: ScoredCandidate[] = input.hospitals.map((hospital) => {
      const distanceKm = DistanceCalculator.calculateHaversineDistanceKm(
        input.origin_latitude,
        input.origin_longitude,
        hospital.latitude,
        hospital.longitude
      );
      const etaMinutes = DistanceCalculator.estimateEtaMinutes(distanceKm);
      const specializationScore = hospital.capabilities.includes(input.required_capability)
        ? 1
        : hospital.capabilities.includes(CAPABILITIES.GENERAL_ER)
          ? 0.3
          : 0;

      return { hospital, distanceKm, etaMinutes, specializationScore };
    });

    const icuScores = this.normalize(candidates.map((c) => c.hospital.icu_beds_available));
    const erScores = this.normalize(candidates.map((c) => c.hospital.er_beds_available));
    const distanceScores = this.normalizeInverse(candidates.map((c) => c.distanceKm));
    const etaScores = this.normalizeInverse(candidates.map((c) => c.etaMinutes));
    const waitScores = this.normalizeInverse(candidates.map((c) => c.hospital.estimated_er_wait_minutes));

    const weights: RankingWeights = DEFAULT_RANKING_WEIGHTS;

    const ranked: RankedHospital[] = candidates.map((candidate, index) => {
      const matchScore = Math.round(
        100 *
          (weights.specialization_match * candidate.specializationScore +
            weights.icu_beds_available * icuScores[index] +
            weights.er_beds_available * erScores[index] +
            weights.distance * distanceScores[index] +
            weights.eta * etaScores[index] +
            weights.wait_time * waitScores[index])
      );

      return {
        ...candidate.hospital,
        distance_km: candidate.distanceKm,
        eta_minutes: candidate.etaMinutes,
        match_score: matchScore,
        is_recommended: false,
      };
    });

    ranked.sort((a, b) => b.match_score - a.match_score || a.distance_km - b.distance_km);
    if (ranked.length > 0) {
      ranked[0].is_recommended = true;
    }

    return { hospitals: ranked, weights };
  }

  private normalize(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return values.map(() => 1);
    return values.map((v) => (v - min) / (max - min));
  }

  private normalizeInverse(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return values.map(() => 1);
    return values.map((v) => (max - v) / (max - min));
  }
}
