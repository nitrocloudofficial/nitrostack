import { Module } from '@nitrostack/core';
import { GmailTools } from './gmail.tools.js';

@Module({
  name: 'gmail',
  description: 'Gmail module supporting multiple connected accounts',
  controllers: [GmailTools]
})
export class GmailModule {}
