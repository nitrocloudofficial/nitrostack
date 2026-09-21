import { Module } from '@nitrostack/core';
import { MemoryModule } from '../modules/memory/memory.module.js';
import { DocumentModule } from '../modules/documents/document.module.js';
import { PlatformResources } from './platform.resources.js';

@Module({
  name: 'resources',
  description: 'Platform MCP Resources module',
  imports: [MemoryModule, DocumentModule],
  controllers: [PlatformResources],
})
export class ResourcesModule {}
