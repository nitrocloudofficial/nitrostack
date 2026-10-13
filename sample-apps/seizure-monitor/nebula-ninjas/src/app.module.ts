import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SharedModule } from './modules/shared/shared.module.js';
import { LedgerModule } from './modules/ledger/ledger.module.js';
import { FingerprintModule } from './modules/fingerprint/fingerprint.module.js';
import { DiscoveryModule } from './modules/discovery/discovery.module.js';
import { IntegrityModule } from './modules/integrity/integrity.module.js';
import { PolicyModule } from './modules/policy/policy.module.js';
import { ProxyModule } from './modules/proxy/proxy.module.js';
import { InjectionModule } from './modules/injection/injection.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { AttackSimModule } from './modules/attack-sim/attack.module.js';

/**
 * Sentinel Gateway — Root Application Module
 * 
 * An MCP zero-trust gateway that sits in front of every internal MCP server,
 * detects tool-poisoning/metadata drift in real time, and maintains a
 * cryptographic provenance ledger of every agent tool call.
 * 
 * Module Architecture:
 * ┌─────────────────────────────────────────────┐
 * │  SharedModule     — Crypto, types            │
 * │  LedgerModule     — Hash-chained audit log   │
 * │  FingerprintModule — Tool description hashes  │
 * │  DiscoveryModule  — Server registration       │
 * │  IntegrityModule  — Drift detection           │
 * │  PolicyModule     — RBAC enforcement          │
 * │  ProxyModule      — Core call forwarding      │
 * │  InjectionModule  — Hidden instruction scanner │
 * │  ReviewModule     — Human approval queue      │
 * │  AttackSimModule  — Demo attack scenarios     │
 * └─────────────────────────────────────────────┘
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'sentinel-gateway',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'sentinel-gateway',
    description: 'MCP zero-trust gateway with tool-poisoning detection and cryptographic provenance ledger',
    imports: [
        ConfigModule.forRoot(),
        SharedModule,
        LedgerModule,
        FingerprintModule,
        DiscoveryModule,
        IntegrityModule,
        PolicyModule,
        ProxyModule,
        InjectionModule,
        ReviewModule,
        AttackSimModule,
    ],
})
export class AppModule {}
