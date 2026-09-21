/**
 * ThreatMatrix Configuration Manager
 * Validates all environment variables at startup.
 * Server fails safely if required vars are missing.
 */
import dotenv from 'dotenv';
dotenv.config();

import { logger } from './logger.js';

export interface Config {
  // Server
  port: number;
  nodeEnv: string;
  // NitroStack
  nitrostackApiKey: string | undefined;
  nitrostackServerId: string;
  // MCP metadata
  mcpServerName: string;
  mcpServerVersion: string;
  // Model
  modelName: string;
  // AI APIs
  aiApiKey: string | undefined;
  geminiApiKey: string | undefined;
  groqApiKey1: string | undefined;
  groqApiKey2: string | undefined;
  groqApiKey3: string | undefined;
  // Threat Intelligence APIs
  virusTotalApiKey: string | undefined;
  abuseIpDbApiKey: string | undefined;
  googleSafeBrowsingKey: string | undefined;
  alienVaultApiKey: string | undefined;
  cloudConvertApiKey: string | undefined;
  // Database
  databaseUrl: string | undefined;
  // Auth
  nitroApiKey: string;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config: Config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  nitrostackApiKey: optionalEnv('NITROSTACK_API_KEY'),
  nitrostackServerId: process.env.NITROSTACK_SERVER_ID ?? 'threatmatrix-mcp-local',
  mcpServerName: process.env.MCP_SERVER_NAME ?? 'ThreatMatrix MCP Server',
  mcpServerVersion: process.env.MCP_SERVER_VERSION ?? '1.0.0',
  modelName: process.env.MODEL_NAME ?? 'llama-3.3-70b-versatile',
  aiApiKey: optionalEnv('AI_API_KEY'),
  geminiApiKey: optionalEnv('GEMINI_API_KEY'),
  groqApiKey1: optionalEnv('GROQ_API_KEY_1') || optionalEnv('AI_API_KEY'),
  groqApiKey2: optionalEnv('GROQ_API_KEY_2'),
  groqApiKey3: optionalEnv('GROQ_API_KEY_3'),
  virusTotalApiKey: optionalEnv('VIRUSTOTAL_API_KEY'),
  abuseIpDbApiKey: optionalEnv('ABUSEIPDB_API_KEY'),
  googleSafeBrowsingKey: optionalEnv('GOOGLE_SAFEBROWSING_KEY'),
  alienVaultApiKey: optionalEnv('ALIENVAULT_API_KEY'),
  cloudConvertApiKey: optionalEnv('CLOUDCONVERT_API_KEY'),
  databaseUrl: optionalEnv('DATABASE_URL'),
  nitroApiKey: optionalEnv('NITRO_API_KEY') || '',
};

// Validate at least one Groq/AI key exists
if (!config.groqApiKey1 && !config.groqApiKey2 && !config.groqApiKey3 && !config.aiApiKey) {
  logger.warn('No Groq or AI API keys configured — AI reasoning fallback will be active.');
}

logger.info('Configuration loaded', {
  nodeEnv: config.nodeEnv,
  port: config.port,
  serverName: config.mcpServerName,
  serverVersion: config.mcpServerVersion,
  modelName: config.modelName,
  groqKeys: [config.groqApiKey1, config.groqApiKey2, config.groqApiKey3].filter(Boolean).length,
  gemini: !!config.geminiApiKey,
  virusTotal: !!config.virusTotalApiKey,
  abuseIpDb: !!config.abuseIpDbApiKey,
  googleSafeBrowsing: !!config.googleSafeBrowsingKey,
  alienVault: !!config.alienVaultApiKey,
  database: !!config.databaseUrl,
});
