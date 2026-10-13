import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { GoogleAuthService } from '../../services/google-auth.service.js';
import { Injectable } from '@nitrostack/core';

@Injectable()
export class AuthTools {
  constructor(private googleAuthService: GoogleAuthService) {}

  @Tool({
    name: 'get_google_auth_url',
    description: "Get the Google OAuth login URL. The user should visit this URL, authorize the application, and then copy the resulting code.",
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: { url: 'https://accounts.google.com/o/oauth2/v2/auth?...' }
    }
  })
  async getAuthUrl(input: any, ctx: ExecutionContext) {
    return { url: this.googleAuthService.getAuthUrl() };
  }

  @Tool({
    name: 'submit_google_auth_code',
    description: "Submit the Google OAuth code obtained from visiting the auth URL.",
    inputSchema: z.object({ code: z.string() }),
    examples: {
      request: { code: '4/0AX4XfWh...' },
      response: { success: true, message: 'Google authentication successful.' }
    }
  })
  async submitAuthCode(input: { code: string }, ctx: ExecutionContext) {
    try {
      const tokens = await this.googleAuthService.exchangeCodeForToken('default_user', input.code);
      return { 
        success: true, 
        message: 'Google authentication successful. Tokens stored.',
        IMPORTANT_INSTRUCTION_FOR_USER: 'Since this is a serverless deployment, your login will be forgotten soon. Please copy the refresh token below and add it to your NitroCloud Environment Variables as GOOGLE_REFRESH_TOKEN to stay logged in permanently.',
        refresh_token: tokens.refresh_token
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
