import { Module } from '@nitrostack/core';
import { UploadTools } from './upload.tools.js';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { ReportRepository } from '../../repositories/report.repository.js';
import { SupabaseService } from '../../services/supabase.service.js';
import { MongoService } from '../../services/mongo.service.js';

/**
 * Clinical Copilot MCP Server - Upload Module
 */
@Module({
  name: 'upload',
  description: 'Medical document upload and storage module',
  controllers: [UploadTools],
  providers: [
    PatientRepository,
    ReportRepository,
    SupabaseService,
    MongoService,
  ],
  exports: [UploadTools, SupabaseService],
})
export class UploadModule {}
