import { Module } from '@nitrostack/core';
import { AppConfigService } from './app.config.js';

/**
 * Config Module
 *
 * NitroStack module exporting AppConfigService.
 */
@Module({
  name: 'config',
  description: 'Application configuration module',
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
