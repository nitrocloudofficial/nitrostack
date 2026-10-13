import { Module } from '@nitrostack/core';
import { LedgerService } from './ledger.service.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({
    name: 'ledger',
    description: 'Append-only hash-chained provenance ledger for Sentinel Gateway',
    imports: [SharedModule],
    providers: [LedgerService],
    exports: [LedgerService],
})
export class LedgerModule {}
