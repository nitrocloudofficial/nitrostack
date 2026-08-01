import { Module } from '@nitrostack/core';
import { MlClientService } from './ml-client.service.js';
import { MlClientTools } from './ml-client.tools.js';

@Module({
  name: 'ml-client',
  description: 'Client for Seer ML service endpoints.',
  controllers: [MlClientTools],
  providers: [MlClientService],
  exports: [MlClientService],
})
export class MlClientModule {}
