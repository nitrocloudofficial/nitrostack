import { Module } from '@nitrostack/core';
import { NitroWatchTools } from './nitrowatch.tools.js';
import { NitroWatchResources } from './nitrowatch.resources.js';

@Module({
  name: 'nitrowatch',
  controllers: [NitroWatchTools, NitroWatchResources], // add NitroWatchPrompts here once you write it
})
export class NitroWatchModule {}
