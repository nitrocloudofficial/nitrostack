import { Module } from '@nitrostack/core';
import { ConfigService } from './config.service.js';
import { ConfigTools } from './config.tools.js';

@Module({
  name: 'configmodule',
  controllers: [ConfigTools],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}

