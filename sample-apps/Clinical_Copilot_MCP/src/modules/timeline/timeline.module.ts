import { Module } from '@nitrostack/core';
import { TimelineTools } from './timeline.tools.js';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { ReportRepository } from '../../repositories/report.repository.js';
import { TimelineRepository } from '../../repositories/timeline.repository.js';
import { TimelineService } from '../../services/timeline.service.js';
import { MongoService } from '../../services/mongo.service.js';

/**
 * Clinical Copilot MCP Server - Timeline Module
 */
@Module({
  name: 'timeline',
  description: 'Chronological EHR medical history and clinical event timeline module',
  controllers: [TimelineTools],
  providers: [
    PatientRepository,
    ReportRepository,
    TimelineRepository,
    TimelineService,
    MongoService,
  ],
  exports: [TimelineTools, TimelineService],
})
export class TimelineModule {}
