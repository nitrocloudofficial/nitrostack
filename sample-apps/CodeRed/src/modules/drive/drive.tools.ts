import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { google } from 'googleapis';

function getDriveClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  return google.drive({ version: 'v3', auth: oAuth2Client });
}

export class DriveTools {
  @Tool({
    name: 'search_drive_files',
    description: 'Search Google Drive for files by name or content keyword',
    inputSchema: z.object({
      query: z.string().describe('Search keyword to look for in file names'),
      maxResults: z.number().int().min(1).max(20).default(5).describe('Max number of files to return')
    })
  })
  async searchDriveFiles(input: { query: string; maxResults: number }, ctx: ExecutionContext) {
    const drive = getDriveClient();

    const res = await drive.files.list({
      q: 'name contains \'' + input.query + '\'',
      pageSize: input.maxResults,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)'
    });

    const files = res.data.files || [];

    return {
      files: files.map((f) => ({
        name: f.name,
        type: f.mimeType,
        modified: f.modifiedTime,
        link: f.webViewLink
      }))
    };
  }
}