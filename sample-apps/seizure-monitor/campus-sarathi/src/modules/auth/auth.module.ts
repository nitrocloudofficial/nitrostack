import { Module } from '@nitrostack/core';
import { AuthTools } from './auth.tools.js';
import { GoogleAuthService } from '../../services/google-auth.service.js';

@Module({
  name: 'auth',
  description: 'Google Authentication Module',
  controllers: [AuthTools],
  providers: [GoogleAuthService],
  imports: [],
  exports: [GoogleAuthService]
})
export class AuthModule {}
