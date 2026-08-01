import { Module } from '@nitrostack/core';
import { AuthTools } from './auth.tools.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  name: 'auth',
  description: 'Authentication and User Management',
  imports: [DatabaseModule],
  controllers: [AuthTools],
})
export class AuthModule {}
