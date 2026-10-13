import { Module } from '@nitrostack/core';
import { GatewayTools } from './gateway.tools.js';

/**
 * GatewayModule — Secure Data Gateway integration surface.
 *
 * Additive module: exposes the new Secure Data Gateway (see
 * src/gateway/) as MCP tools, alongside the existing Health, Medication,
 * and Emergency agents, without modifying any of them.
 *
 * Tools:
 * - secure_issue_session_token — issues a JWT for use with the gateway
 * - secure_check_drug_safety   — pharmacogenomics/interaction check routed
 *                                 through auth -> RBAC -> rate limit ->
 *                                 AI Gateway (data-minimized) -> audit log
 */
@Module({
  name: 'gateway',
  description: 'Secure Data Gateway — authenticated, authorized, audited entry point to AI Gateway, File Service, User Service, and the encrypted database.',
  controllers: [GatewayTools]
})
export class GatewayModule {}
