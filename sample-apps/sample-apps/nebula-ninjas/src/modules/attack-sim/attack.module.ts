import { Module } from '@nitrostack/core';
import { AttackService } from './attack.service.js';
import { AttackTools } from './attack.tools.js';
import { SharedModule } from '../shared/shared.module.js';
import { DiscoveryModule } from '../discovery/discovery.module.js';
import { ProxyModule } from '../proxy/proxy.module.js';
import { LedgerModule } from '../ledger/ledger.module.js';
import { ReviewModule } from '../review/review.module.js';
import { InjectionModule } from '../injection/injection.module.js';

@Module({
    name: 'attack-sim',
    description: 'Attack simulation module for live demos — stages real MCP attacks and shows detection',
    imports: [SharedModule, DiscoveryModule, ProxyModule, LedgerModule, ReviewModule, InjectionModule],
    controllers: [AttackTools],
    providers: [AttackService],
})
export class AttackSimModule {}
