import { z } from 'zod';
import { 
  EstimateCostSchema, 
  CalculateROISchema, 
  EstimateRevenueSchema 
} from './finance.schema.js';

export type EstimateCostArgs = z.infer<typeof EstimateCostSchema>;
export type CalculateROIArgs = z.infer<typeof CalculateROISchema>;
export type EstimateRevenueArgs = z.infer<typeof EstimateRevenueSchema>;
