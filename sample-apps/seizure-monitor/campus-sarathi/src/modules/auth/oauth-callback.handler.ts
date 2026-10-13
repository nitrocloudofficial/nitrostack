import { Injectable } from '@nitrostack/core';
import { GoogleAuthService } from '../../services/google-auth.service.js';

@Injectable()
export class OAuthCallbackHandler {
  constructor(private googleAuthService: GoogleAuthService) {}

  async handleCallback(code: string, state?: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.googleAuthService.exchangeCodeForToken('default_user', code);
      return { 
        success: true, 
        message: 'Google authentication successful! You can close this window and return to your app.' 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Authentication failed: ${error.message}` 
      };
    }
  }
}
