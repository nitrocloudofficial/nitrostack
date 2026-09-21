import { Module, ConfigService } from '@nitrostack/core';
import { AuthTools } from './auth.tools.js';
import { AuthResources } from './auth.resources.js';
import { AuthPrompts } from './auth.prompts.js';
import { AuthService } from '../../lib/auth.service.js';
import { DatabaseService } from '../../lib/database.service.js';

@Module({
  name: 'auth',
  description: 'Authentication module for user signup, login, and verification',
  controllers: [AuthTools, AuthResources, AuthPrompts],
  providers: [AuthService, DatabaseService, ConfigService],
})
export class AuthModule {}
