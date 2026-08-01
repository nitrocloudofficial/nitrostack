import { Module } from '@nitrostack/core';
import { DiscoveryService } from './discovery.service.js';
import { DiscoveryTools } from './discovery.tools.js';
import { SharedModule } from '../shared/shared.module.js';
import { FingerprintModule } from '../fingerprint/fingerprint.module.js';
import { LedgerModule } from '../ledger/ledger.module.js';

@Module({
    name: 'discovery',
    description: 'Server discovery and tool registration for Sentinel Gateway',
    imports: [SharedModule, FingerprintModule, LedgerModule],
    controllers: [DiscoveryTools],
    providers: [DiscoveryService],
    exports: [DiscoveryService],
})
export class DiscoveryModule {}
