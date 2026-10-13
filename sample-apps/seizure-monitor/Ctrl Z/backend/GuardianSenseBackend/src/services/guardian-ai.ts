import { DSPEngine } from "./dsp-engine.js";
import { FeatureExtractor } from "./feature-extractor.js";
import { DecisionEngine } from "./decision-engine.js";

export interface GuardianAnalysis {
  respiration: number;
  motion: string;
  confidence: number;
  risk: string;
  signalStrength: number;
  breathingDetected: boolean;
  movementDetected: boolean;
}

export class GuardianAI {
  private dsp = new DSPEngine();
  private features = new FeatureExtractor();
  private decisions = new DecisionEngine();

  analyze(packet: any): GuardianAnalysis {
    const csi: number[] = packet?.csi ?? [];
    const rssi: number = packet?.rssi ?? -90;

    if (csi.length === 0) {
      return {
        respiration: 0,
        motion: "Waiting...",
        confidence: 0,
        risk: "Unknown",
        signalStrength: 0,
        breathingDetected: false,
        movementDetected: false,
      };
    }

    const amplitudes = csi.map((v) => Math.abs(v));
    const phases = csi.map((v) => Math.atan2(0, v));

    const dspResult = this.dsp.process({
      timestamp: new Date().toISOString(),
      amplitude: amplitudes,
      phase: phases,
    });

    const extracted = this.features.extract(dspResult);
    const decision = this.decisions.decide(extracted);

    const respiration = Math.max(
      8,
      Math.min(30, Math.round(extracted.breathingRate + 12))
    );

    const motion = decision.movementDetected ? "Walking" : "Still";

    const rssiFactor = Math.min(1, Math.max(0, (rssi + 90) / 40));
    const confidence = Math.min(
      99,
      Math.max(
        55,
        Math.round(60 + dspResult.signalStrength / 3 + rssiFactor * 20)
      )
    );

    let risk = "Safe";
    if (respiration < 10 || respiration > 25) {
      risk = "High";
    } else if (decision.movementDetected) {
      risk = "Low";
    }

    return {
      respiration,
      motion,
      confidence,
      risk,
      signalStrength: dspResult.signalStrength,
      breathingDetected: decision.breathingDetected,
      movementDetected: decision.movementDetected,
    };
  }
}
