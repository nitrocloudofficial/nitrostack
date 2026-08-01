import { Module } from '@nitrostack/core';
import { ValidationTools } from './validation.tools.js';

@Module({
  name: 'validation',
  description: 'Mathematical validation using LLM',
  controllers: [ValidationTools],
  exports: [ValidationTools],
})
export class ValidationModule {}
