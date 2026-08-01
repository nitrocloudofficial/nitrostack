import fs from 'fs';
import path from 'path';

export interface GmailConnectionState {
  connected: boolean;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  connectedAt?: string;
  lastSyncTime?: string;
  status?: string;
}

export interface GmailAttachmentInfo {
  attachmentId?: string;
  fileName: string;
  fileSize: string;
  mimeType?: string;
}

export interface GmailIntakeMessage {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  receivedTime: string;
  snippet: string;
  body: string;
  attachmentCount: number;
  attachments: GmailAttachmentInfo[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function parseMessageParts(part: any, result: { body: string; attachments: GmailAttachmentInfo[] }) {
  if (!part) return;

  if (part.filename && part.filename.length > 0) {
    const size = part.body?.size || 0;
    result.attachments.push({
      attachmentId: part.body?.attachmentId,
      fileName: part.filename,
      fileSize: formatBytes(size),
      mimeType: part.mimeType
    });
  } else if (part.mimeType === 'text/plain' && part.body?.data && !result.body) {
    try {
      result.body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    } catch {
      try {
        result.body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } catch (e) {}
    }
  } else if (part.mimeType === 'text/html' && part.body?.data && !result.body) {
    try {
      const html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      result.body = html.replace(/<[^>]*>?/gm, '');
    } catch (e) {}
  }

  if (part.parts && Array.isArray(part.parts)) {
    for (const subPart of part.parts) {
      parseMessageParts(subPart, result);
    }
  }
}

export class GmailService {
  private static STORAGE_DIR = path.resolve(process.cwd(), 'data');
  private static STORAGE_FILE = path.join(GmailService.STORAGE_DIR, 'gmail_connection.json');

  private static ensureStorageDir() {
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  private static loadState(): GmailConnectionState {
    this.ensureStorageDir();
    if (!fs.existsSync(this.STORAGE_FILE)) {
      return { connected: false };
    }
    try {
      const raw = fs.readFileSync(this.STORAGE_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      return { connected: false };
    }
  }

  private static saveState(state: GmailConnectionState) {
    this.ensureStorageDir();
    fs.writeFileSync(this.STORAGE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Status Function: Returns public connection status (NEVER exposes refresh token to client)
   */
  static status(): { connected: boolean; email?: string; connectedAt?: string; lastSyncTime?: string; status?: string } {
    const state = this.loadState();
    if (!state.connected || !state.email) {
      return { connected: false };
    }
    return {
      connected: true,
      email: state.email,
      connectedAt: state.connectedAt,
      lastSyncTime: state.lastSyncTime || state.connectedAt,
      status: state.status || 'Active Integration'
    };
  }

  /**
   * Connect Function: Exchanges OAuth authorization code for refresh token & fetches connected email
   */
  static async connect(code: string, redirectUri: string): Promise<{ success: boolean; email?: string; message?: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('[GmailService] Token exchange failed:', tokenData);
      return { success: false, message: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code.' };
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    let userEmail = 'doctor@gmail.com';
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (userinfoRes.ok) {
        const userinfo: any = await userinfoRes.json();
        if (userinfo.email) {
          userEmail = userinfo.email;
        }
      }
    } catch (e) {
      console.warn('[GmailService] Could not fetch userinfo email:', e);
    }

    const now = new Date().toISOString();
    const currentState = this.loadState();
    const finalRefreshToken = refreshToken || currentState.refreshToken;

    this.saveState({
      connected: true,
      email: userEmail,
      accessToken: accessToken,
      refreshToken: finalRefreshToken,
      connectedAt: now,
      lastSyncTime: now,
      status: 'Active'
    });

    console.log(`[GmailService] ✅ Gmail connected successfully for email: ${userEmail}`);
    return { success: true, email: userEmail };
  }

  /**
   * Disconnect Function: Revokes token and removes stored credentials from server
   */
  static async disconnect(): Promise<{ success: boolean }> {
    const state = this.loadState();
    if (state.refreshToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${state.refreshToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } catch (e) {
        console.warn('[GmailService] Token revocation warning:', e);
      }
    }

    this.saveState({ connected: false });
    console.log('[GmailService] 🔌 Gmail integration disconnected.');
    return { success: true };
  }

  /**
   * Detailed Token Refresh Function: Exchanges refresh token for a fresh access token & returns diagnostics
   */
  static async refreshAccessTokenDetails(): Promise<{
    accessToken: string | null;
    refreshTokenExists: boolean;
    expiresIn?: number;
    expiresAt?: string;
    error?: string;
  }> {
    const state = this.loadState();
    const refreshTokenExists = Boolean(state.refreshToken);

    if (!state.connected) {
      return { accessToken: null, refreshTokenExists, error: 'Gmail service is not connected in state' };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (state.refreshToken && clientId && clientSecret) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: state.refreshToken,
            grant_type: 'refresh_token'
          }).toString()
        });

        const data: any = await res.json();
        if (res.ok && data.access_token) {
          const expiresIn = data.expires_in || 3600;
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

          this.saveState({
            ...state,
            accessToken: data.access_token,
            lastSyncTime: new Date().toISOString()
          });

          return {
            accessToken: data.access_token,
            refreshTokenExists: true,
            expiresIn,
            expiresAt
          };
        }
      } catch (e: any) {
        console.error('[GmailService] Error during token refresh fetch:', e);
      }
    }

    if (state.accessToken) {
      return {
        accessToken: state.accessToken,
        refreshTokenExists,
        expiresIn: 3600,
        error: refreshTokenExists ? 'Token refresh fetch failed, falling back to active access token' : 'No refresh token stored, using initial access token'
      };
    }

    return {
      accessToken: null,
      refreshTokenExists,
      error: refreshTokenExists ? 'Failed to exchange stored refresh token' : 'No refresh token or access token found in state'
    };
  }

  /**
   * RefreshAccessToken Function: Compatibility helper returning string | null
   */
  static async refreshAccessToken(): Promise<string | null> {
    const details = await this.refreshAccessTokenDetails();
    return details.accessToken;
  }

  /**
   * Debug & Diagnostic listIntakeEmails Function
   * Verifies access token refresh, logs pre-call token status, post-call HTTP status & response.
   */
  static async listIntakeEmails(): Promise<{
    connected: boolean;
    count: number;
    emails: GmailIntakeMessage[];
    query?: string;
    accountEmail?: string;
    httpStatus?: number;
    resultSizeEstimate?: number;
    messageIds?: string[];
    firstMessageId?: string;
    apiError?: string;
    rawApiResponse?: any;
    message?: string;
  }> {
    const state = this.loadState();
    const accountEmail = state.email || 'Unknown';

    // Task 2 & 5: Ensure token refresh is executed before every Gmail API request
    const tokenInfo = await this.refreshAccessTokenDetails();
    const accessToken = tokenInfo.accessToken;

    const authHeader = accessToken ? `Bearer ${accessToken}` : '';
    const maskedAuthHeader = accessToken
      ? `Bearer ${accessToken.substring(0, 10)}...${accessToken.slice(-6)}`
      : 'NONE (No Authorization Header Present)';

    const query = 'subject:"NEW PATIENT"';

    // Task 3: Log Pre-Call Token Check
    console.log(`==========================================`);
    console.log(`[Gmail Token & API Diagnostics] PRE-CALL TOKEN CHECK:`);
    console.log(`- Refresh token exists?: ${tokenInfo.refreshTokenExists ? 'Yes' : 'No'}`);
    console.log(`- Access token successfully obtained?: ${accessToken ? 'Yes' : 'No'}`);
    console.log(`- Access token expiry: ${tokenInfo.expiresIn ? `${tokenInfo.expiresIn} seconds (Expires at ${tokenInfo.expiresAt})` : 'N/A'}`);
    console.log(`- Authorization header actually sent to Gmail API: ${maskedAuthHeader}`);
    console.log(`==========================================`);

    // Task 7: If no Authorization header is present, identify why
    if (!authHeader) {
      console.error(`[Gmail Token Debug] ❌ NO AUTHORIZATION HEADER PRESENT!`);
      console.error(`- Reason: ${tokenInfo.error || 'Unknown token retrieval error'}`);
      console.error(`- Refresh Token Exists in storage: ${tokenInfo.refreshTokenExists ? 'Yes' : 'No'}`);
    }

    if (!accessToken) {
      return {
        connected: false,
        count: 0,
        emails: [],
        query,
        accountEmail,
        apiError: `Token Exchange Error: ${tokenInfo.error || 'Failed to acquire access token'}`,
        message: 'Gmail integration access token missing.'
      };
    }

    const messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&includeSpamTrash=true`;

    const res = await fetch(messagesUrl, {
      headers: { Authorization: authHeader }
    });

    const httpStatus = res.status;
    const data: any = await res.json();

    // Task 6: Print Authorization header (masked), HTTP status from Gmail, Full Gmail error body
    console.log(`==========================================`);
    console.log(`[Gmail Token & API Diagnostics] POST-CALL API RESPONSE:`);
    console.log(`- Authorization header (masked): ${maskedAuthHeader}`);
    console.log(`- HTTP status from Gmail: ${httpStatus} ${res.statusText}`);
    console.log(`- Full Gmail error body / payload:`, JSON.stringify(data, null, 2));
    console.log(`==========================================`);

    if (!res.ok) {
      console.error(`[Gmail API Error] HTTP ${httpStatus}:`, data);
      return {
        connected: true,
        count: 0,
        emails: [],
        query,
        accountEmail,
        httpStatus,
        apiError: data.error?.message || `HTTP ${httpStatus} Gmail API Error`,
        message: data.error?.message || 'Failed to list Gmail messages.'
      };
    }

    const messageItems: any[] = data.messages || [];
    const responseCount = data.resultSizeEstimate !== undefined ? data.resultSizeEstimate : messageItems.length;
    const messageIds = messageItems.map((m: any) => m.id);
    const firstMessageId = messageIds.length > 0 ? messageIds[0] : 'None';

    console.log(`- Result Size Estimate: ${responseCount}`);
    console.log(`- Returned Message IDs Count: ${messageItems.length}`);
    console.log(`- Message IDs:`, messageIds);

    // Requirement 4: Explicitly log zero results
    if (messageItems.length === 0) {
      console.log(`[GmailSearch Diagnostics] ⚠️ EXPLICIT ZERO RESULTS: Gmail API returned ZERO messages for query "${query}". (ResultSizeEstimate: ${responseCount})`);
      console.log(`==========================================`);
      return {
        connected: true,
        count: 0,
        emails: [],
        query,
        accountEmail,
        httpStatus,
        resultSizeEstimate: responseCount,
        messageIds: [],
        firstMessageId: 'None',
        apiError: 'None (0 matching messages)',
        rawApiResponse: data
      };
    }

    console.log(`==========================================`);

    // Fetch details for returned messages
    const intakeMessages: GmailIntakeMessage[] = [];
    let discardedCount = 0;

    for (const msgItem of messageItems.slice(0, 20)) {
      try {
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=full`, {
          headers: { Authorization: authHeader }
        });

        if (!detailRes.ok) {
          console.warn(`[GmailSearch Diagnostics] Discarded message ID ${msgItem.id}: HTTP ${detailRes.status} on detail fetch.`);
          discardedCount++;
          continue;
        }

        const detail: any = await detailRes.json();
        const headers: any[] = detail.payload?.headers || [];

        const getHeader = (name: string) => {
          const found = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
          return found ? found.value : '';
        };

        const subject = getHeader('Subject') || '(No Subject)';
        const sender = getHeader('From') || 'Unknown Sender';
        const rawDate = getHeader('Date');
        const receivedTime = rawDate ? new Date(rawDate).toISOString() : new Date(parseInt(detail.internalDate || '0', 10)).toISOString();
        const snippet = detail.snippet || '';

        const parseResult = { body: '', attachments: [] as GmailAttachmentInfo[] };
        parseMessageParts(detail.payload, parseResult);

        intakeMessages.push({
          id: detail.id,
          threadId: detail.threadId,
          subject,
          sender,
          receivedTime,
          snippet,
          body: parseResult.body || snippet || '(No body text)',
          attachmentCount: parseResult.attachments.length,
          attachments: parseResult.attachments
        });
      } catch (err) {
        console.error(`[GmailSearch Diagnostics] Discarded message ID ${msgItem.id} due to parse error:`, err);
        discardedCount++;
      }
    }

    // Requirement 5: Log discarded messages if any
    if (discardedCount > 0) {
      console.log(`[GmailSearch Diagnostics] ⚠️ DISCARD IDENTIFIER: ${discardedCount} message(s) were returned by Gmail search but discarded during detail fetch/parse.`);
    }

    return {
      connected: true,
      count: intakeMessages.length,
      emails: intakeMessages,
      query,
      accountEmail,
      httpStatus,
      resultSizeEstimate: responseCount,
      messageIds,
      firstMessageId,
      apiError: 'None',
      rawApiResponse: data
    };
  }

  /**
   * Download Attachment Function: Retrieves attachment from Gmail API and saves temporarily to server
   */
  static async downloadAttachment(
    messageId: string,
    attachmentId?: string,
    fileName: string = 'attachment.bin',
    mimeType?: string
  ): Promise<{
    success: boolean;
    filename: string;
    mimeType: string;
    size: string;
    localPath: string;
    message?: string;
  }> {
    const tokenInfo = await this.refreshAccessTokenDetails();
    const accessToken = tokenInfo.accessToken;

    if (!accessToken) {
      return {
        success: false,
        filename: fileName,
        mimeType: mimeType || 'application/octet-stream',
        size: '0 B',
        localPath: '',
        message: 'Access token missing or expired.'
      };
    }

    try {
      let rawBase64 = '';

      if (attachmentId) {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!res.ok) {
          const errorData: any = await res.json();
          return {
            success: false,
            filename: fileName,
            mimeType: mimeType || 'application/octet-stream',
            size: '0 B',
            localPath: '',
            message: errorData.error?.message || `HTTP ${res.status} error downloading attachment`
          };
        }

        const data: any = await res.json();
        rawBase64 = data.data || '';
      }

      if (!rawBase64) {
        return {
          success: false,
          filename: fileName,
          mimeType: mimeType || 'application/octet-stream',
          size: '0 B',
          localPath: '',
          message: 'No attachment data received from Gmail API'
        };
      }

      const fileBuffer = Buffer.from(rawBase64, 'base64url');
      const tempDir = path.resolve(process.cwd(), 'data', 'temp_attachments');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const sanitizedFileName = path.basename(fileName);
      const localPath = path.join(tempDir, `${Date.now()}_${sanitizedFileName}`);
      fs.writeFileSync(localPath, fileBuffer);

      const sizeStr = formatBytes(fileBuffer.length);
      const detectedMime = mimeType || 'application/octet-stream';

      console.log(`[GmailService] 📥 Downloaded attachment "${sanitizedFileName}" (${sizeStr}) to temporary location: ${localPath}`);

      return {
        success: true,
        filename: sanitizedFileName,
        mimeType: detectedMime,
        size: sizeStr,
        localPath
      };
    } catch (error: any) {
      console.error('[GmailService] Error in downloadAttachment:', error);
      return {
        success: false,
        filename: fileName,
        mimeType: mimeType || 'application/octet-stream',
        size: '0 B',
        localPath: '',
        message: error?.message || 'Server error downloading attachment'
      };
    }
  }
}
