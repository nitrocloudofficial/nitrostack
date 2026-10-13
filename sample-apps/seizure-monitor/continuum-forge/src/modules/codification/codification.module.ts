import { Module } from '@nitrostack/core';
import { CodificationTools } from './codification.tools.js';

@Module({
  name: 'codification',
  description: 'Parse transcripts into formal tacit rules',
  controllers: [CodificationTools],
  exports: [CodificationTools],
})
export class CodificationModule {}
