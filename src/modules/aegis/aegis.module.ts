import { Module } from '@nitrostack/core';
import { TelecomTools } from './tools/telecom.tools.js';
import { BankingTools } from './tools/banking.tools.js';
import { AegisTools } from './tools/aegis.tools.js';
import { TelecomAirGappedMcp, BankGovSecureMcp } from '../../tools/AegisTools.js';
import { AegisAgents } from '../../agents/AegisAgents.js';
import { AegisOrchestratorTools } from '../../agents/aegis-agents.tools.js';
import { AegisService } from './aegis.service.js';
import { Neo4jService } from './graph/neo4j.service.js';
import { ThreatScoreGuard } from './guards/threat-score.guard.js';

/**
 * Aegis Module
 * 
 * Registers all Aegis Protocol components:
 * - Controllers: TelecomTools, BankingTools, AegisTools, AegisOrchestratorTools,
 *                TelecomAirGappedMcp (Air-Gapped), BankGovSecureMcp (Secure)
 * - Providers: AegisService (orchestration), AegisAgents, Neo4jService (mule graph DB), ThreatScoreGuard (HITL gate)
 * - Exports: AegisService, AegisAgents, Neo4jService for cross-module access
 */
@Module({
  name: 'aegis',
  description: 'Zero-Knowledge Threat Fusion Engine — Digital Arrest Scam Detection',
  controllers: [TelecomTools, BankingTools, AegisTools, AegisOrchestratorTools, TelecomAirGappedMcp, BankGovSecureMcp],
  providers: [AegisService, AegisAgents, Neo4jService, ThreatScoreGuard],
  exports: [AegisService, AegisAgents, Neo4jService],
})
export class AegisModule {}

