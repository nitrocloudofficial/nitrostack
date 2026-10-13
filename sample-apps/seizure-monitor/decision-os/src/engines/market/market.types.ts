import { z } from 'zod';
import { 
  AnalyzeMarketSchema, 
  IdentifyCompetitorsSchema, 
  EstimateDemandSchema 
} from './market.schema.js';

export type AnalyzeMarketArgs = z.infer<typeof AnalyzeMarketSchema>;
export type IdentifyCompetitorsArgs = z.infer<typeof IdentifyCompetitorsSchema>;
export type EstimateDemandArgs = z.infer<typeof EstimateDemandSchema>;
