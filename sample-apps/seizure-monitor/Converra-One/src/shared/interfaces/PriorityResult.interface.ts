import { PriorityLevel } from '../enums/priority.enum.js';

export interface PriorityResult {
  messageId: string;
  assignedPriority: PriorityLevel;
  score: number; // 0.0 to 1.0
  reasoning: string;
  keyFactors: string[];
  suggestedAction?: string;
  calculatedAt: Date;
}
