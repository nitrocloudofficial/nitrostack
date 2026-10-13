import { Module } from '@nitrostack/core';
import { FraudPatternTools } from './fraud-pattern.tools.js';
import { CaseStoreModule } from '../case-store/case-store.module.js';

@Module({
    name: 'fraud-pattern',
    description: 'Fraud Pattern Sub-agent — application history, shared identifier detection, duplicate entity search',
    imports: [CaseStoreModule],
    controllers: [FraudPatternTools],
})
export class FraudPatternModule {}
