import { GuardianFeatures } from "./feature-extractor.js";

export class BaselineEngine {

  private baseline?: GuardianFeatures;

  learn(features: GuardianFeatures) {

    if (!this.baseline) {
      this.baseline = features;
    }

  }

  getBaseline() {
    return this.baseline;
  }

}