import { Module } from '@nitrostack/core';
import { FeedsTools } from './feeds.tools.js';

@Module({
  name: 'feeds',
  description: 'Read-only intelligence feeds: CISA KEV, EPSS, endoflife.date, php.net and Node.js release and security posts',
  controllers: [FeedsTools]
})
export class FeedsModule {}
