import 'dotenv/config';
import { Injectable } from '@nitrostack/core';
import { google } from 'googleapis';

@Injectable()
export class OauthService {
  private oauth2Client;

  constructor() {
    const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || 'placeholder_client_id').trim();
    const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || 'placeholder_client_secret').trim();
    const redirectUri = (process.env.GOOGLE_OAUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback').trim();

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleCallback(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    console.log('Successfully authenticated with Google Drive and stored tokens.');
    console.log('Tokens received:', Object.keys(tokens));
    console.log('Credentials after set:', Object.keys(this.oauth2Client.credentials));
  }

  getDriveClient() {
    return google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  async listDriveFiles(folderId: string = 'root') {
    const drive = this.getDriveClient();
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType)',
    });
    return res.data.files || [];
  }

  async searchDriveFiles(query: string) {
    const drive = this.getDriveClient();
    const res = await drive.files.list({
      q: `${query} and trashed = false`,
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType)',
    });
    return res.data.files || [];
  }

  async uploadDriveFile(fileName: string, mimeType: string, base64Content: string, folderId: string = 'root') {
    const drive = this.getDriveClient();
    let buffer: Buffer;
    
    // Parse the data URI or raw base64
    const matches = base64Content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Content, 'base64');
    }

    const { Readable } = await import('stream');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, name, mimeType',
    });

    return res.data;
  }

  async readFileContent(fileId: string) {
    const drive = this.getDriveClient();
    
    // Get file metadata to check mimeType
    const fileRes = await drive.files.get({ fileId, fields: 'id, name, mimeType' });
    const mimeType = fileRes.data.mimeType;

    let content: string;
    if (mimeType?.includes('application/vnd.google-apps')) {
      // It's a Google Workspace document, export it
      let exportMimeType = 'text/plain';
      if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        exportMimeType = 'text/csv';
      }
      
      const res = await drive.files.export({
        fileId: fileId,
        mimeType: exportMimeType
      }, { responseType: 'arraybuffer' });
      content = Buffer.from(res.data as ArrayBuffer).toString('base64');
    } else {
      // Standard file, get media
      const res = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' });
      content = Buffer.from(res.data as ArrayBuffer).toString('base64');
    }

    return {
      metadata: fileRes.data,
      content: content
    };
  }
}

export const globalOauthService = new OauthService();
