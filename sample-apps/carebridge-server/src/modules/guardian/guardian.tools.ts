import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { PatientRepository } from '../../data/patient.repository.js';
import { GuardianDeviationAnalysis } from './guardian.types.js';

/**
 * Guardian AI Tools Provider
 * Person 1 Lead
 * EHR & FHIR Repository Integrated
 */
@Injectable()
export class GuardianTools {
  constructor(private patientRepo: PatientRepository = new PatientRepository()) {}

  @Tool({
    name: 'analyze_baseline',
    description: 'Compares current health data with the patient\'s baseline vitals and detects significant changes in sleep, heart rate, activity, and meals.',
    inputSchema: z.object({
      patientId: z.string().optional().describe('ID of the patient to analyze. Defaults to demo patient.'),
    }),
  })
  @Widget('dashboard')
  async analyzeBaseline(
    input: { patientId?: string },
    _context: ExecutionContext
  ): Promise<GuardianDeviationAnalysis> {
    // Dynamic repository lookup
    const baseline = await this.patientRepo.getBaselineVitals(input.patientId);
    const current = await this.patientRepo.getCurrentState(input.patientId);

    // Guard against division by zero in edge-case datasets
    const safePct = (curr: number, base: number) =>
      base === 0 ? 0 : Math.round(((curr - base) / base) * 100);

    const sleepDiffPct  = safePct(current.sleepHours, baseline.sleepHours);
    const hrDiffPct     = safePct(current.restingHeartRateBpm, baseline.restingHeartRateBpm);
    const stepsDiffPct  = safePct(current.dailySteps, baseline.dailySteps);

    const signals: string[] = [];
    if (current.sleepHours < baseline.sleepHours)
      signals.push(`sleep decreased (${sleepDiffPct}%)`);
    if (current.restingHeartRateBpm > baseline.restingHeartRateBpm)
      signals.push(`resting heart rate increased (+${hrDiffPct}%)`);
    if (current.dailySteps < baseline.dailySteps)
      signals.push(`activity decreased (${stepsDiffPct}%)`);
    if (current.mealRegularity !== 'Regular')
      signals.push(`meal regularity changed (${current.mealRegularity})`);

    const deviationDetected = signals.length > 0;
    const status: GuardianDeviationAnalysis['status'] = deviationDetected ? 'changes_detected' : 'normal';

    return {
      deviationDetected,
      signals,
      status,
      details: {
        sleepChange:    `${baseline.sleepHours}h -> ${current.sleepHours}h (${sleepDiffPct}%)`,
        hrChange:       `${baseline.restingHeartRateBpm} bpm -> ${current.restingHeartRateBpm} bpm (${hrDiffPct > 0 ? '+' : ''}${hrDiffPct}%)`,
        activityChange: `${baseline.dailySteps.toLocaleString()} steps -> ${current.dailySteps.toLocaleString()} steps (${stepsDiffPct}%)`,
        mealChange:     `${baseline.mealsPerDay} meals/day -> ${current.mealRegularity}`,
      },
    };
  }
}
