import { Module } from '@nitrostack/core';
import { DatabaseModule } from '../database/database.module.js';
import { AuthService } from './auth.service.js';

@Module({
  name: 'auth',
  description: 'Authentication module for managing users and verifying credentials',
  imports: [DatabaseModule],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
