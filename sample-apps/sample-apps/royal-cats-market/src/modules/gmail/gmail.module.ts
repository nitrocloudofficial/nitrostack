import { Module } from '@nitrostack/core';
import { GmailController } from './gmail.controller.js';
import { GmailService } from './gmail.service.js';

@Module({
  name: 'gmail',
  description: 'Gmail module for sending emails and limited inbox reading',
  controllers: [GmailController],
  providers: [GmailService]
})
export class GmailModule {}
