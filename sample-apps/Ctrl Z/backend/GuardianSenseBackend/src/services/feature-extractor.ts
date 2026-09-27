import { DspResult } from "./dsp-engine.js";

export interface GuardianFeatures {
  breathingRate: number;
  movementScore: number;
}

export class FeatureExtractor {

  extract(data: DspResult): GuardianFeatures {

    return {
      breathingRate: data.amplitudeMean / 5,
      movementScore: Math.abs(data.phaseMean)
    };

  }

}