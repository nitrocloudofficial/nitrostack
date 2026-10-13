import { z } from 'zod';
import { 
  ResearchTopicSchema, 
  GatherEvidenceSchema, 
  SummarizeResearchSchema 
} from './research.schema.js';

export type ResearchTopicArgs = z.infer<typeof ResearchTopicSchema>;
export type GatherEvidenceArgs = z.infer<typeof GatherEvidenceSchema>;
export type SummarizeResearchArgs = z.infer<typeof SummarizeResearchSchema>;
