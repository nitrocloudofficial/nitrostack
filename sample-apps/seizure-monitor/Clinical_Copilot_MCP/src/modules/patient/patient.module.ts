import { Module } from '@nitrostack/core';
import { PatientTools } from './patient.tools.js';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { ReportRepository } from '../../repositories/report.repository.js';
import { OcrService } from '../../services/ocr.service.js';
import { LlmService } from '../../services/llm.service.js';
import { EmbeddingService } from '../../services/embedding.service.js';
import { PineconeService } from '../../services/pinecone.service.js';
import { MongoService } from '../../services/mongo.service.js';

/**
 * Clinical Copilot MCP Server - Patient Module
 */
@Module({
  name: 'patient',
  description: 'Patient profile processing, medical report information extraction, and vector embedding module',
  controllers: [PatientTools],
  providers: [
    PatientRepository,
    ReportRepository,
    OcrService,
    LlmService,
    EmbeddingService,
    PineconeService,
    MongoService,
  ],
  exports: [PatientTools, LlmService, OcrService],
})
export class PatientModule {}
