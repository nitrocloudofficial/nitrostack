import { z } from 'zod';

export const ExtractContextSchema = z.object({
  request: z.string().describe('The raw user request string.'),
});

export const DetectMissingInformationSchema = z.object({
  objective: z.string().describe('The core objective.'),
  entities: z.array(z.string()).describe('Extracted entities.'),
  constraints: z.array(z.string()).describe('Extracted constraints.'),
});

export const NormalizeRequestSchema = z.object({
  request: z.string().describe('The raw user request string.'),
});
