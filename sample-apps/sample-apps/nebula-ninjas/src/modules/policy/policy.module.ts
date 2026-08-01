import { Module } from '@nitrostack/core';
import { PolicyService } from './policy.service.js';
import { PolicyTools } from './policy.tools.js';
import { LedgerModule } from '../ledger/ledger.module.js';

@Module({
    name: 'policy',
    description: 'RBAC policy engine — per-agent permission enforcement',
    imports: [LedgerModule],
    controllers: [PolicyTools],
    providers: [PolicyService],
    exports: [PolicyService],
})
export class PolicyModule {}
