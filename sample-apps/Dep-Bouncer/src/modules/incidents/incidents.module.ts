import { Module } from '@nitrostack/core';
import { IncidentsService } from './incidents.service.js';

/** Labelled reconstructions of real npm hijacks, for replays and the benchmark. */
@Module({
  name: 'incidents',
  description: 'Reconstructed npm hijack incidents',
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
