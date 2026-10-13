import { Module } from '@nitrostack/core';
import { OauthService } from './oauth.service.js';
import { OauthController } from './oauth.controller.js';

@Module({
  name: 'oauth',
  description: 'Google Drive OAuth integration',
  controllers: [OauthController],
  providers: [OauthService],
  exports: [OauthService]
})
export class OauthModule {}
