import { PlatformType } from '../enums/platform.enum.js';

export interface WebhookEvent<TPayload = Record<string, unknown>> {
  id: string;
  platform: PlatformType;
  eventType: string;
  payload: TPayload;
  timestamp: Date;
  signature?: string;
}

export interface WebhookHandler {
  platform: PlatformType;
  handleEvent(event: WebhookEvent): Promise<boolean>;
}
