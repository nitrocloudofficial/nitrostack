import { Module } from '@nitrostack/core';
import { ComplianceService } from './compliance.service.js';
import { ComplianceTools } from './compliance.tools.js';

@Module({
    name: 'compliance',
    description: 'Indian tax & filing due-date calendar',
    controllers: [ComplianceTools],
    providers: [ComplianceService],
    exports: [ComplianceService],
})
export class ComplianceModule { }
