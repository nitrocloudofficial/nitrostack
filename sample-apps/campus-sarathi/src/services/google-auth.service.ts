import { Injectable, ConfigService } from '@nitrostack/core';
import { google } from 'googleapis';
import { db } from '../db/index.js';

@Injectable()
export class GoogleAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private oauth2Client: any;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';
    this.clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
    this.redirectUri = this.configService.get('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.readonly'
      ]
    });
  }

  async exchangeCodeForToken(userId: string, code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    await db.saveUserToken({
      userId,
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date || null
    });

    return tokens;
  }

  async getAuthClient(userId: string = 'default_user') {
    const userRecord = await db.getUserToken(userId);
    const envRefreshToken = this.configService.get('GOOGLE_REFRESH_TOKEN') || process.env.GOOGLE_REFRESH_TOKEN || '';

    if ((!userRecord || !userRecord.accessToken) && !envRefreshToken && !userRecord?.refreshToken) {
      throw new Error(`User not authenticated with Google. Please use the Google auth flow.`);
    }

    if (userRecord && (userRecord.accessToken || userRecord.refreshToken)) {
      this.oauth2Client.setCredentials({
        access_token: userRecord.accessToken || undefined,
        refresh_token: userRecord.refreshToken || envRefreshToken || undefined,
        expiry_date: userRecord.expiryDate || undefined
      });
    } else if (envRefreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: envRefreshToken
      });
    }

    this.oauth2Client.on('tokens', async (tokens: any) => {
      const existing = await db.getUserToken(userId);
      await db.saveUserToken({
        userId,
        accessToken: tokens.access_token || existing?.accessToken || '',
        refreshToken: tokens.refresh_token || existing?.refreshToken || envRefreshToken || null,
        expiryDate: tokens.expiry_date || existing?.expiryDate || null
      });
    });

    return this.oauth2Client;
  }
}
