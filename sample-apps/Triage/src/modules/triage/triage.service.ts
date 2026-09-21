// src/modules/triage/triage.service.ts
import { Injectable } from '@nitrostack/core';
import { CRITICAL_KEYWORDS, MODERATE_KEYWORDS, VITALS_THRESHOLDS, SeverityLevel } from './triage.data.js';

interface Vitals {
  heartRate?: number;
  spo2?: number;
  systolicBP?: number;
  temperatureC?: number;
}

@Injectable()
export class TriageService {

  scoreSymptomText(text: string): { severity: SeverityLevel; matched: string[] } {
    const lower = text.toLowerCase();
    const criticalHit = CRITICAL_KEYWORDS.filter(k => lower.includes(k));
    if (criticalHit.length) return { severity: 'critical', matched: criticalHit };

    const moderateHit = MODERATE_KEYWORDS.filter(k => lower.includes(k));
    if (moderateHit.length) return { severity: 'moderate', matched: moderateHit };

    return { severity: 'low', matched: [] };
  }

  scoreVitals(vitals: Vitals): { severity: SeverityLevel; reasons: string[] } {
    const reasons: string[] = [];
    const t = VITALS_THRESHOLDS;

    if (vitals.heartRate !== undefined &&
        (vitals.heartRate < t.heartRate.criticalLow || vitals.heartRate > t.heartRate.criticalHigh)) {
      reasons.push(`heart rate ${vitals.heartRate} bpm out of safe range`);
    }
    if (vitals.spo2 !== undefined && vitals.spo2 < t.spo2.criticalLow) {
      reasons.push(`SpO2 ${vitals.spo2}% critically low`);
    }
    if (vitals.systolicBP !== undefined &&
        (vitals.systolicBP < t.systolicBP.criticalLow || vitals.systolicBP > t.systolicBP.criticalHigh)) {
      reasons.push(`systolic BP ${vitals.systolicBP} abnormal`);
    }
    if (vitals.temperatureC !== undefined && vitals.temperatureC > t.temperatureC.criticalHigh) {
      reasons.push(`temperature ${vitals.temperatureC}°C critically high`);
    }

    return { severity: reasons.length ? 'critical' : 'low', reasons };
  }

  // combine symptom text + vitals → final decision
  decide(textResult: { severity: SeverityLevel; matched: string[] },
         vitalsResult: { severity: SeverityLevel; reasons: string[] }) {
    const escalate = textResult.severity === 'critical' || vitalsResult.severity === 'critical';
    const severity: SeverityLevel = escalate
      ? 'critical'
      : (textResult.severity === 'moderate' ? 'moderate' : 'low');

    return {
      escalate,
      severity,
      reasons: [...textResult.matched, ...vitalsResult.reasons]
    };
  }
}