/**
 * Gmail Integration Configuration & Developer Setup Blueprint
 * 
 * Environment Variables required:
 * - GMAIL_CLIENT_ID
 * - GMAIL_CLIENT_SECRET
 * - GMAIL_REFRESH_TOKEN
 * - GMAIL_USER_EMAIL
 */

export const GMAIL_CONFIG = {
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send'
  ],
  baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  defaultRedirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
  maxResults: 20
};

