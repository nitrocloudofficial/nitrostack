import { Module } from '@nitrostack/core';
import { ProxyService } from './proxy.service.js';
import { ProxyTools } from './proxy.tools.js';
import { SharedModule } from '../shared/shared.module.js';
import { DiscoveryModule } from '../discovery/discovery.module.js';
import { IntegrityModule } from '../integrity/integrity.module.js';
import { PolicyModule } from '../policy/policy.module.js';
import { LedgerModule } from '../ledger/ledger.module.js';

@Module({
    name: 'proxy',
    description: 'Core gateway proxy — routes all tool calls through the security pipeline',
    imports: [SharedModule, DiscoveryModule, IntegrityModule, PolicyModule, LedgerModule],
    controllers: [ProxyTools],
    providers: [ProxyService],
    exports: [ProxyService],
})
export class ProxyModule {}
