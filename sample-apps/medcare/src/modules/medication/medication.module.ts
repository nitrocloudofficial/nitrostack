import { Module } from '@nitrostack/core';
import { MedicationTools } from './medication.tools.js';
import { MedicationResources } from './medication.resources.js';

/**
 * MedicationModule — Agent 2: Medication Safety & Authenticity
 *
 * Provides tools for:
 * - Drug safety checks against patient genetic profiles (check_drug_safety)
 * - FDA drug label lookup (lookup_drug_label)
 * - Medication authenticity verification via openFDA registry (verify_medication_authenticity)
 *
 * Resources exposed:
 * - medication://pharmacogenomics
 * - medication://counterfeit-batches
 */
@Module({
  name: 'medication',
  description: 'Medication Safety & Authenticity Agent — pharmacogenomics conflict detection, FDA label lookup, and software registry-based authenticity verification.',
  controllers: [MedicationTools, MedicationResources]
})
export class MedicationModule {}
