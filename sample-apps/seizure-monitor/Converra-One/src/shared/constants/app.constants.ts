import { PlatformType } from '../enums/platform.enum.js';
import { PriorityLevel } from '../enums/priority.enum.js';

export const APP_NAME = 'Converra One';
export const APP_TAGLINE = 'Where Conversations Converge.';
export const APP_VERSION = '1.0.0';
export const DEFAULT_PORT = 3000;

export const SUPPORTED_PLATFORMS: PlatformType[] = [
  PlatformType.GMAIL,
  PlatformType.SLACK,
  PlatformType.DISCORD,
  PlatformType.GITHUB,
  PlatformType.NOTION,
  PlatformType.CALENDAR
];

export const PRIORITY_LEVELS: PriorityLevel[] = [
  PriorityLevel.URGENT,
  PriorityLevel.HIGH,
  PriorityLevel.MEDIUM,
  PriorityLevel.LOW,
  PriorityLevel.INFO
];

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  refreshIntervalMs: 30000,
  autoPrioritize: true,
  autoSummarize: true,
  notificationsEnabled: true,
  maxInboxItemsPerPage: 25
};
