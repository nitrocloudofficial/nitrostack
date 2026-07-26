import { Module } from '@nitrostack/core';
import { GmailTools } from './gmail.tools.js';

@Module({
  name: 'gmail',
  description: 'Gmail search tools',
  controllers: [GmailTools]
})
export class GmailModule {}