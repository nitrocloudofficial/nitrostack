import { PlatformType } from '../shared/enums/platform.enum.js';
import { PriorityLevel } from '../shared/enums/priority.enum.js';
import { MessageStatus } from '../shared/enums/message.enum.js';
import { Message } from '../shared/interfaces/Message.interface.js';

import { GmailIntegrationAdapter } from '../integrations/gmail/adapter.js';
import { GoogleCalendarIntegrationAdapter } from '../integrations/calendar/adapter.js';
import { GitHubIntegrationAdapter } from '../integrations/github/adapter.js';
import { SlackIntegrationAdapter } from '../integrations/slack/adapter.js';
import { DiscordIntegrationAdapter } from '../integrations/discord/adapter.js';
import { NotionIntegrationAdapter } from '../integrations/notion/adapter.js';

import { DemoStoreService } from './DemoStore.service.js';

export interface PlatformStatusResult {
  platform: PlatformType;
  name: string;
  status: 'connected' | 'syncing' | 'disconnected';
  lastSync: string;
  account: string;
  activeCount: number;
}

export interface IntegrationAdapter {
  platform: PlatformType;
  fetchMessages(): Promise<Message[]>;
  getStatus(): Promise<PlatformStatusResult>;
}

export class MockGmailAdapter implements IntegrationAdapter {
  public platform = PlatformType.GMAIL;
  public async fetchMessages(): Promise<Message[]> {
    return DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.GMAIL);
  }
  public async getStatus(): Promise<PlatformStatusResult> {
    const count = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.GMAIL).length;
    return { platform: PlatformType.GMAIL, name: 'Gmail Workspace', status: 'connected', lastSync: 'Just now', account: 'alex.mercer@converra.io', activeCount: count };
  }
}

export class MockSlackAdapter implements IntegrationAdapter {
  public platform = PlatformType.SLACK;
  public async fetchMessages(): Promise<Message[]> {
    return DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.SLACK);
  }
  public async getStatus(): Promise<PlatformStatusResult> {
    const count = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.SLACK).length;
    return { platform: PlatformType.SLACK, name: 'Slack HQ', status: 'connected', lastSync: 'Just now', account: '#engineering-core', activeCount: count };
  }
}

export class MockGitHubAdapter implements IntegrationAdapter {
  public platform = PlatformType.GITHUB;
  public async fetchMessages(): Promise<Message[]> {
    return DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.GITHUB);
  }
  public async getStatus(): Promise<PlatformStatusResult> {
    const count = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.GITHUB).length;
    return { platform: PlatformType.GITHUB, name: 'GitHub Enterprise', status: 'connected', lastSync: 'Just now', account: 'converra-labs', activeCount: count };
  }
}

export class MockDiscordAdapter implements IntegrationAdapter {
  public platform = PlatformType.DISCORD;
  public async fetchMessages(): Promise<Message[]> {
    return DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.DISCORD);
  }
  public async getStatus(): Promise<PlatformStatusResult> {
    const count = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.DISCORD).length;
    return { platform: PlatformType.DISCORD, name: 'Discord Devs', status: 'connected', lastSync: 'Just now', account: 'AlexM#4920', activeCount: count };
  }
}

export class MockNotionAdapter implements IntegrationAdapter {
  public platform = PlatformType.NOTION;
  public async fetchMessages(): Promise<Message[]> {
    return DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.NOTION);
  }
  public async getStatus(): Promise<PlatformStatusResult> {
    const count = DemoStoreService.getInstance().getMessagesByPlatform(PlatformType.NOTION).length;
    return { platform: PlatformType.NOTION, name: 'Notion Workspace', status: 'connected', lastSync: 'Just now', account: 'Engineering Hub', activeCount: count };
  }
}

export class ConnectorManagerService {
  private static instance: ConnectorManagerService;
  private adapters: IntegrationAdapter[];

  constructor() {
    const enableDemo = process.env.ENABLE_DEMO_MODE === 'true';
    const useReal = process.env.USE_REAL_INTEGRATIONS === 'true' && !enableDemo;

    if (useReal) {
      this.adapters = [
        new GmailIntegrationAdapter(),
        new GoogleCalendarIntegrationAdapter(),
        new GitHubIntegrationAdapter(),
        new SlackIntegrationAdapter(),
        new DiscordIntegrationAdapter(),
        new NotionIntegrationAdapter()
      ];
    } else {
      this.adapters = [
        new MockGmailAdapter(),
        new MockSlackAdapter(),
        new MockGitHubAdapter(),
        new MockDiscordAdapter(),
        new MockNotionAdapter()
      ];
    }
  }

  public static getInstance(): ConnectorManagerService {
    if (!ConnectorManagerService.instance) {
      ConnectorManagerService.instance = new ConnectorManagerService();
    }
    return ConnectorManagerService.instance;
  }

  public async fetchAllMessages(): Promise<Message[]> {
    if (process.env.ENABLE_DEMO_MODE === 'true') {
      return DemoStoreService.getInstance().getMessages().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    const results = await Promise.all(this.adapters.map(a => a.fetchMessages()));
    return results.flat().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async getPlatformStatuses(): Promise<PlatformStatusResult[]> {
    if (process.env.ENABLE_DEMO_MODE === 'true') {
      return DemoStoreService.getInstance().getPlatformStatuses();
    }
    return Promise.all(this.adapters.map(a => a.getStatus()));
  }
}

