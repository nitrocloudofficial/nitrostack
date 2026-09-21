import { Module } from '@nitrostack/core';
import { ConfigModule as NitroConfigModule, ConfigService as NitroConfigService } from '@nitrostack/core';
import { ConfigService } from './config.service.js';

/**
 * Configuration Module
 *
 * Provides validated environment configuration via ConfigService.
 * Uses Zod for schema validation at startup.
 * Also configures NitroStack's built-in ConfigModule for DI.
 */
@Module({
  name: 'config',
  description: 'Application configuration',
  imports: [
    NitroConfigModule.forRoot({
      validate: (config) => true, // We handle validation in our ConfigService
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService, NitroConfigService],
})
export class ConfigModule {}