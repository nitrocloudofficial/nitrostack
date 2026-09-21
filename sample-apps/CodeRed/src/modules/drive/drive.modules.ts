import { Module } from '@nitrostack/core';
import { DriveTools } from './drive.tools.js';

@Module({
  name: 'drive',
  description: 'Google Drive search tools',
  controllers: [DriveTools]
})
export class DriveModule {}