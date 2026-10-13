import { z } from '@nitrostack/core';

/**
 * Production Line Schema
 * 
 * Defines the structure and validation for production line creation parameters.
 * Used by the createProductionLine tool to validate and type-check input.
 */

export const ProductionLineInputSchema = z.object({
  name: z.string().min(1).describe('The name of the production line (e.g., Unit 4)'),
  zoneId: z.string().min(1).describe('The zone ID where the line is located (e.g., zone-1)'),
  weather: z.enum(['rainy', 'sunny', 'humid', 'dry']).describe('The weather conditions'),
  lineId: z.string().optional().describe('Optional custom line ID (e.g., L-4)'),
});

export type ProductionLineInput = z.infer<typeof ProductionLineInputSchema>;

/**
 * Unit 4 Production Line Configuration
 * 
 * Pre-configured schema for Unit 4 specifically.
 */
export const Unit4ProductionLineSchema = z.object({
  name: z.literal('Unit 4').describe('Fixed name for Unit 4'),
  zoneId: z.string().min(1).describe('The zone ID where Unit 4 is located'),
  weather: z.enum(['rainy', 'sunny', 'humid', 'dry']).describe('The weather conditions'),
  lineId: z.string().optional().default('L-4').describe('Optional custom line ID (defaults to L-4)'),
});

export type Unit4ProductionLine = z.infer<typeof Unit4ProductionLineSchema>;
