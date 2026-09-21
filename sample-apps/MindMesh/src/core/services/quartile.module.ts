import { Module } from '@nitrostack/core';
import { QuartileLookupService } from './quartile-lookup.service.js';

/**
 * Quartile Module
 *
 * Provides venue to quartile mapping from Scimago data.
 */
@Module({
  name: 'quartile',
  description: 'Scimago quartile lookup for venue quality assessment',
  providers: [QuartileLookupService],
  exports: [QuartileLookupService],
})
export class QuartileModule {}