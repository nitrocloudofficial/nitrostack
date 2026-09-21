import { GuardianFeatures } from "./feature-extractor.js";

export interface Decision {

  breathingDetected: boolean;
  movementDetected: boolean;

}

export class DecisionEngine {

  decide(features: GuardianFeatures): Decision {

    return {
      breathingDetected: features.breathingRate > 2,
      movementDetected: features.movementScore > 0.5
    };

  }

}