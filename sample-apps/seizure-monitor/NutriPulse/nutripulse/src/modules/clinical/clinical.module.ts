import { Module } from '@nitrostack/core';
import { clinicalTools } from './clinical.tools.js';
import { clinicalResources } from './clinical.resources.js';
import { clinicalPrompts } from './clinical.prompts.js';

@Module({
  name: 'clinical',
  description: 'TODO: Add description',
  controllers: [clinicalTools, clinicalResources, clinicalPrompts],
})
export class clinicalModule {}
