import { Module } from '@nitrostack/core';
import { AuthorityTools } from './authority.tools.js';

@Module({
  name: 'authority',
  description: 'Authority-facing tools for reviewing and managing loan applications',
  controllers: [AuthorityTools],
})
export class AuthorityModule {}
