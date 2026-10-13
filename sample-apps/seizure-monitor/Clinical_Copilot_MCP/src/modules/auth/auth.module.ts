import { Module } from '@nitrostack/core';
import { AuthTools } from './auth.tools.js';
import { SupabaseService } from '../../services/supabase.service.js';
import { UserRepository } from '../../repositories/user.repository.js';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { MongoService } from '../../services/mongo.service.js';

/**
 * Clinical Copilot MCP Server - Auth Module
 */
@Module({
  name: 'auth',
  description: 'Authentication and Access Control module for Clinical Copilot',
  controllers: [AuthTools],
  providers: [AuthTools, SupabaseService, UserRepository, PatientRepository, MongoService],
  exports: [AuthTools, SupabaseService, UserRepository, PatientRepository],
})
export class AuthModule {}
