import { z } from 'zod';

export const VerifiedDrugEntrySchema = z.object({
  drugName: z.string().describe('Name of the verified drug'),
  indication: z.string().describe('Clinical indication / condition treated'),
  dosageRange: z.string().describe('Typical dosage range'),
  evidenceLevel: z.enum(['phase-1', 'phase-2', 'phase-3', 'approved', 'off-label']).describe('Level of clinical evidence'),
  citationSource: z.string().describe('Source/citation for the evidence (e.g., "FDA Approval 2023", "Clinical Trial NCT12345678", "Published Study PMID:12345678")'),
  notes: z.string().optional().describe('Additional clinical notes or contraindications'),
});

export const RareDiseaseEntrySchema = z.object({
  conditionId: z.string().describe('Unique identifier for the rare disease'),
  conditionName: z.string().describe('Name of the rare disease/condition'),
  alternateNames: z.array(z.string()).optional().describe('Alternate names or aliases'),
  description: z.string().describe('Clinical description of the condition'),
  verifiedDrugs: z.array(VerifiedDrugEntrySchema).describe('Array of verified drugs with evidence'),
  lastUpdated: z.string().describe('Last update timestamp (ISO 8601)'),
  registrySource: z.string().describe('Source of registry data (e.g., "NIH Rare Diseases", "Orphanet", "FDA Orphan Drug Database")'),
});

export const RareDiseaseRegistrySchema = z.object({
  entries: z.array(RareDiseaseEntrySchema).describe('Array of rare disease entries'),
  totalCount: z.number().describe('Total number of entries in registry'),
  lastUpdated: z.string().describe('Last update timestamp (ISO 8601)'),
});

export type VerifiedDrugEntry = z.infer<typeof VerifiedDrugEntrySchema>;
export type RareDiseaseEntry = z.infer<typeof RareDiseaseEntrySchema>;
export type RareDiseaseRegistry = z.infer<typeof RareDiseaseRegistrySchema>;
