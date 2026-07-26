import { Module } from '@nitrostack/core';
import { OmniGameTools } from './yatra.tools.js';

@Module({
  name: 'yatra',
  description: 'OmniGame Generator Module',
  controllers: [
    OmniGameTools
  ]
})
export class YatraModule {}
