import { Module } from '@nitrostack/core';
import { SocialController } from './social.controller.js';
import { SocialService } from './social.service.js';

@Module({
  name: 'social',
  description: 'Social module for Facebook, Instagram, and LinkedIn',
  controllers: [SocialController],
  providers: [SocialService]
})
export class SocialModule {}
