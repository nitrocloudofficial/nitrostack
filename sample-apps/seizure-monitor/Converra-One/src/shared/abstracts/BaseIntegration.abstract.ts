import { PlatformType } from '../enums/platform.enum.js';
import { Message } from '../interfaces/Message.interface.js';

/**
 * Base Abstract Class for all Third-Party Platform Integrations (Gmail, Slack, Discord, GitHub, Notion, Calendar)
 */
export abstract class BaseIntegration {
  public abstract readonly platform: PlatformType;
  public abstract readonly displayName: string;
  protected isConnected: boolean = false;

  /**
   * Connect and authenticate to external service
   */
  public abstract connect(): Promise<boolean>;

  /**
   * Disconnect integration
   */
  public abstract disconnect(): Promise<void>;

  /**
   * Fetch recent messages/updates from platform
   */
  public abstract fetchMessages(since?: Date): Promise<Message[]>;

  /**
   * Check connection status
   */
  public getStatus(): boolean {
    return this.isConnected;
  }
}
