import { Module } from '@nitrostack/core';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { DrugsTools } from './drugs.tools.js';
import { DrugsResources } from './drugs.resources.js';
import { DrugsService } from './drugs.service.js';

/**
 * Drug Safety Module — RxNorm/OpenFDA backed drug lookup, FDA label info,
 * interaction checking (label cross-scan), adverse events, recalls.
 * Provides the drug safety tools and resources.
 */
@Module({
  name: 'drugs',
  description: 'Drug safety: labels, interactions, adverse events, recalls, and autocomplete',
  imports: [IntegrationsModule],
  controllers: [DrugsTools, DrugsResources],
  providers: [DrugsService],
})
export class DrugsModule {}
