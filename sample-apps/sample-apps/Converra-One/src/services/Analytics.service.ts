export interface CommunicationAnalytics {
  unreadMessages: number;
  connectedPlatforms: number;
  tasksCompleted: number;
  meetingsToday: number;
  avgResponseTimeMin: number;
  summariesGenerated: number;
  messagesProcessed: number;
  topActivePlatform: string;
  agentExecutionsCount: number;
  healthScorePercent: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public getAnalytics(): CommunicationAnalytics {
    return {
      unreadMessages: 14,
      connectedPlatforms: 6,
      tasksCompleted: 18,
      meetingsToday: 3,
      avgResponseTimeMin: 12,
      summariesGenerated: 42,
      messagesProcessed: 184,
      topActivePlatform: 'Slack',
      agentExecutionsCount: 156,
      healthScorePercent: 99.4
    };
  }
}
