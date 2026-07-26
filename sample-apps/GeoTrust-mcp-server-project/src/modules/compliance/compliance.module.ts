import { Module } from '@nitrostack/core';
import { ComplianceTools } from './compliance.tools.js';

@Module({
    name: 'compliance',
    description: 'Compliance & Audit Sub-agent — audit logging, PII masking, audit trail',
    controllers: [ComplianceTools],
})
export class ComplianceModule {}
