/**
 * Triage AI Module - Type Definitions
 * Milestone 1 & 2 Foundation
 */

export type UrgencyCategory = 'Emergency' | 'Urgent' | 'Routine evaluation' | 'Monitor/self-care';

export interface RedFlagRule {
  id: string;
  triggerKeywords: string[];
  category: UrgencyCategory;
  recommendedAction: string;
  disclaimer: string;
}

export interface TriageQuestion {
  id: string;
  questionText: string;
  options: string[];
  categoryTarget?: UrgencyCategory;
}

export interface TriageEvaluationResult {
  urgency: UrgencyCategory;
  isRedFlagTriggered: boolean;
  matchedRedFlags: string[];
  escalationFactors: string[];
  recommendedAction: string;
  disclaimer: string;
}

export const DETERMINISTIC_RED_FLAGS: RedFlagRule[] = [
  {
    id: "RF-001",
    triggerKeywords: ["chest pain", "pressure in chest", "radiating jaw pain"],
    category: "Emergency",
    recommendedAction: "Call emergency service (911/112) immediately.",
    disclaimer: "System provides care navigation assistance, not medical diagnosis."
  },
  {
    id: "RF-002",
    triggerKeywords: ["severe shortness of breath", "unable to breathe", "gasping"],
    category: "Emergency",
    recommendedAction: "Seek immediate emergency room evaluation.",
    disclaimer: "System provides care navigation assistance, not medical diagnosis."
  },
  {
    id: "RF-003",
    triggerKeywords: ["sudden confusion", "slurred speech", "facial drooping", "one-sided weakness"],
    category: "Emergency",
    recommendedAction: "Immediate emergency medical attention required (possible stroke signs).",
    disclaimer: "System provides care navigation assistance, not medical diagnosis."
  },
  {
    id: "RF-004",
    triggerKeywords: ["fainting", "loss of consciousness", "syncope"],
    category: "Urgent",
    recommendedAction: "Urgent medical evaluation required today.",
    disclaimer: "System provides care navigation assistance, not medical diagnosis."
  }
];
