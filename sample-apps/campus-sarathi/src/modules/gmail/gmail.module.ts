import { Module } from '@nitrostack/core';
import { GmailTools } from './gmail.tools.js';
import { GmailService } from './gmail.service.js';
import { GoogleAuthService } from '../../services/google-auth.service.js';

@Module({
  name: 'gmail',
  description: 'Gmail integration for student emails',
  controllers: [GmailTools],
  providers: [GmailService, GoogleAuthService],
  imports: [],
  exports: [GmailService]
})
export class GmailModule {}
