import { Module } from '@nitrostack/core';
import { ObsidianTools } from './obsidian.tools.js';

@Module({
  name: 'obsidian',
  description: 'Obsidian Vault management and note integration module',
  controllers: [ObsidianTools],
})
export class ObsidianModule {}
