export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayload {
  headers: GmailHeader[];
  body?: { data?: string };
  mimeType: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: GmailPayload;
  internalDate: string;
  labelIds: string[];
}
