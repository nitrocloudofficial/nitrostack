import { Module } from '@nitrostack/core';
import { BrowserTools } from './browser.tools.js';
import { BrowserService } from './browser.service.js';

@Module({
  name: 'browser',
  description: 'Browser automation and DOM inspection',
  controllers: [BrowserTools],
  providers: [BrowserService]
})
export class BrowserModule {}
