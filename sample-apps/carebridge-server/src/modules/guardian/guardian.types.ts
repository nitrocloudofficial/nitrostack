/**
 * Guardian AI Module - Type Definitions
 * Milestone 1 & 2 Foundation
 */

export interface GuardianDeviationAnalysis {
  deviationDetected: boolean;
  signals: string[];
  status: 'normal' | 'changes_detected' | 'significant_deviation';
  details: {
    sleepChange: string;
    hrChange: string;
    activityChange: string;
    mealChange: string;
  };
}
