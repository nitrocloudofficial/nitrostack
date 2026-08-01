import { McpApp, Module, JWTModule } from '@nitrostack/core';
import { IntakeModule } from './servers/intake-server/intake.module.js';
import { VerificationModule } from './servers/verification-server/verification.module.js';
import { SourcingModule } from './servers/sourcing-server/sourcing.module.js';
import { MatchingModule } from './servers/matching-server/matching.module.js';
import { LogisticsModule } from './servers/logistics-server/logistics.module.js';
import { ComplianceModule } from './servers/compliance-server/compliance.module.js';

JWTModule.forRoot({
  secretEnvVar: 'JWT_SECRET',
  expiresIn: '24h',
});

@McpApp({
  module: AppModule,
  server: { name: 'circu-link', version: '1.0.0' },
  transport: { type: 'http', http: { port: 3000 } },
  logging: { level: 'info' },
})
@Module({
  name: 'AppModule',
  imports: [
    IntakeModule,
    VerificationModule,
    SourcingModule,
    MatchingModule,
    LogisticsModule,
    ComplianceModule,
  ],
})
export class AppModule {}
