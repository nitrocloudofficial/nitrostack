import { Module } from '@nitrostack/core';
import { VariantTools } from './variant.tools.js';
import { VariantResources } from './variant.resources.js';
import { VariantService } from './variant.service.js';

@Module({
  name: 'variant',
  description: 'Genetic variant input parsing, validation, and known-variant resources',
  controllers: [VariantTools, VariantResources],
  providers: [VariantService],
  exports: [VariantService],
})
export class VariantModule {}
