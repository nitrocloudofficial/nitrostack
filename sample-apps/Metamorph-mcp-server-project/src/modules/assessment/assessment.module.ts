import { Module } from '@nitrostack/core';
import { AssessmentTools } from './assessment.tools.js';

@Module({
  name: 'assessment',
  description: 'Assess legacy projects: runtime, dependencies, vulnerabilities, legacy code patterns, hosting',
  controllers: [AssessmentTools]
})
export class AssessmentModule {}
