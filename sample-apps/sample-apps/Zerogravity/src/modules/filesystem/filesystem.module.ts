import { Module } from '@nitrostack/core';
import { FilesystemTools } from './filesystem.tools.js';

@Module({
  name: 'filesystem',
  description: 'Filesystem tools for the developer agent',
  controllers: [FilesystemTools]
})
export class FilesystemModule {}
