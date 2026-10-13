import { z } from 'zod';
import { 
  IdentifyRisksSchema, 
  CalculateRiskScoreSchema, 
  GenerateMitigationPlanSchema 
} from './risk.schema.js';

export type IdentifyRisksArgs = z.infer<typeof IdentifyRisksSchema>;
export type CalculateRiskScoreArgs = z.infer<typeof CalculateRiskScoreSchema>;
export type GenerateMitigationPlanArgs = z.infer<typeof GenerateMitigationPlanSchema>;
