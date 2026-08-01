import { PlatformType } from '../shared/enums/platform.enum.js';

export interface PlatformCapabilities {
  platform: PlatformType;
  supportsSearch: boolean;
  supportsReply: boolean;
  supportsAttachments: boolean;
  supportsThreads: boolean;
  supportsMentions: boolean;
  supportsCalendar: boolean;
  supportsTasks: boolean;
  supportsNotifications: boolean;
  supportsRead: boolean;
  supportsWrite: boolean;
}

export class ConnectorCapabilityRegistryService {
  private static instance: ConnectorCapabilityRegistryService;
  private capabilitiesMap: Map<PlatformType, PlatformCapabilities>;

  constructor() {
    this.capabilitiesMap = new Map();
    this.initializeCapabilities();
  }

  public static getInstance(): ConnectorCapabilityRegistryService {
    if (!ConnectorCapabilityRegistryService.instance) {
      ConnectorCapabilityRegistryService.instance = new ConnectorCapabilityRegistryService();
    }
    return ConnectorCapabilityRegistryService.instance;
  }

  private initializeCapabilities(): void {
    const list: PlatformCapabilities[] = [
      {
        platform: PlatformType.GMAIL,
        supportsSearch: true,
        supportsReply: true,
        supportsAttachments: true,
        supportsThreads: true,
        supportsMentions: false,
        supportsCalendar: false,
        supportsTasks: false,
        supportsNotifications: true,
        supportsRead: true,
        supportsWrite: true
      },
      {
        platform: PlatformType.SLACK,
        supportsSearch: true,
        supportsReply: true,
        supportsAttachments: true,
        supportsThreads: true,
        supportsMentions: true,
        supportsCalendar: false,
        supportsTasks: false,
        supportsNotifications: true,
        supportsRead: true,
        supportsWrite: true
      },
      {
        platform: PlatformType.DISCORD,
        supportsSearch: true,
        supportsReply: true,
        supportsAttachments: true,
        supportsThreads: true,
        supportsMentions: true,
        supportsCalendar: false,
        supportsTasks: false,
        supportsNotifications: true,
        supportsRead: true,
        supportsWrite: true
      },
      {
        platform: PlatformType.GITHUB,
        supportsSearch: true,
        supportsReply: true,
        supportsAttachments: false,
        supportsThreads: true,
        supportsMentions: true,
        supportsCalendar: false,
        supportsTasks: true,
        supportsNotifications: true,
        supportsRead: true,
        supportsWrite: true
      },
      {
        platform: PlatformType.NOTION,
        supportsSearch: true,
        supportsReply: false,
        supportsAttachments: true,
        supportsThreads: false,
        supportsMentions: true,
        supportsCalendar: false,
        supportsTasks: true,
        supportsNotifications: true,
        supportsRead: true,
        supportsWrite: true
      },
      {
        platform: PlatformType.CALENDAR,
        supportsSearch: true,
        supportsReply: false,
        supportsAttachments: false,
        supportsThreads: false,
        supportsMentions: false,
        supportsCalendar: true,
        supportsTasks: true,
        supportsNotifications: true,
        supportsRead: true,
        supportsWrite: true
      }
    ];

    list.forEach((cap) => this.capabilitiesMap.set(cap.platform, cap));
  }

  public getCapabilities(platform: PlatformType): PlatformCapabilities {
    return this.capabilitiesMap.get(platform) || {
      platform,
      supportsSearch: true,
      supportsReply: false,
      supportsAttachments: false,
      supportsThreads: false,
      supportsMentions: false,
      supportsCalendar: false,
      supportsTasks: false,
      supportsNotifications: true,
      supportsRead: true,
      supportsWrite: false
    };
  }

  public getAllCapabilities(): PlatformCapabilities[] {
    return Array.from(this.capabilitiesMap.values());
  }
}
