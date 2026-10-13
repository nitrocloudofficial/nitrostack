import { Module } from '@nitrostack/core';
import { IntegrityService } from './integrity.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { DiscoveryModule } from '../discovery/discovery.module.js';
import { FingerprintModule } from '../fingerprint/fingerprint.module.js';
import { LedgerModule } from '../ledger/ledger.module.js';

@Module({
    name: 'integrity',
    description: 'Tool integrity verification — detects description drift and poisoning',
    imports: [SharedModule, DiscoveryModule, FingerprintModule, LedgerModule],
    providers: [IntegrityService],
    exports: [IntegrityService],
})
export class IntegrityModule {}
