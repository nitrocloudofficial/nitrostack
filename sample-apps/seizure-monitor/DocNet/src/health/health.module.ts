import { Module } from '@nitrostack/core';
import { HealthProfileResources } from './profile.resource.js';
import { VerifySymptomsTool } from './verify.tool.js';
import { SupabaseClinicalDossierTool } from './supabase.tool.js';
import { DoctorDiscoveryTool } from './doctors.tool.js';
import { SimilarEpisodesTool } from './similarity.tool.js';
import { ResearchTools } from './research.tool.js';

@Module({
  name: 'health',
  description: 'Health triage MCP module with verification, vector semantic memory, research, dossier storage, and doctor booking',
  controllers: [
    HealthProfileResources,
    VerifySymptomsTool,
    SupabaseClinicalDossierTool,
    DoctorDiscoveryTool,
    SimilarEpisodesTool,
    ResearchTools
  ]
})
export class HealthModule {}
