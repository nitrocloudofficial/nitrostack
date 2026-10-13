import { Module } from '@nitrostack/core';
import { ComplianceTools } from './compliance.tools.js';

@Module({
  name: 'compliance',
  description: 'Enterprise Compliance MCP Module for GDPR analysis, ISO 27001 evaluation, and regulatory reporting.',
  controllers: [ComplianceTools]
})
export class ComplianceModule {}
