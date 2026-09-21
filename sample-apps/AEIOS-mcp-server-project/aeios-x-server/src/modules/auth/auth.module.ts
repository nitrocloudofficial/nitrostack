import { Module } from '@nitrostack/core';
import { AuthTools } from './auth.tools.js';
import { AuthResources } from './auth.resources.js';

@Module({
  name: 'auth',
  description: 'Enterprise Authentication & Authorization - users, roles, sessions, permissions',
  controllers: [AuthTools, AuthResources],
})
export class AuthModule {}
