import { Module } from '@nitrostack/core';
import { CohortTools } from './cohort.tools.js';

/** Cohort Analytics — Loop 2 agents + faculty. Returns no raw text, ever. */
@Module({
  name: 'cohort',
  description: 'Cohort Analytics server: clusters, cohort mastery, interventions',
  controllers: [CohortTools],
})
export class CohortModule {}
