import { z } from 'zod';
import { ExtractContextSchema, DetectMissingInformationSchema, NormalizeRequestSchema } from './context.schema.js';

export type ExtractContextArgs = z.infer<typeof ExtractContextSchema>;
export type DetectMissingInformationArgs = z.infer<typeof DetectMissingInformationSchema>;
export type NormalizeRequestArgs = z.infer<typeof NormalizeRequestSchema>;
