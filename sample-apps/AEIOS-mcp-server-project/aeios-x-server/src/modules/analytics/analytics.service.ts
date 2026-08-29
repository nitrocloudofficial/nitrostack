export interface AnalyticsEvent {
  type: string;
  category: string;
  timestamp: string;
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface UsageMetrics {
  totalRequests: number;
  totalTokensEstimated: number;
  averageResponseTime: number;
  successRate: number;
  topIntents: { intent: string; count: number }[];
  topAgents: { agent: string; count: number }[];
  requestsPerHour: Record<string, number>;
  errorCount: number;
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  private intentCounts = new Map<string, number>();
  private agentCounts = new Map<string, number>();
  private hourlyCounts = new Map<string, number>();
  private tokensEstimated = 0;

  trackRequest(duration: number, success: boolean, intents: string[], agents: string[], tokensEst = 0): void {
    this.requestCount++;
    this.totalResponseTime += duration;
    this.tokensEstimated += tokensEst;

    if (success) this.successCount++;
    else this.errorCount++;

    intents.forEach(i => this.intentCounts.set(i, (this.intentCounts.get(i) || 0) + 1));
    agents.forEach(a => this.agentCounts.set(a, (this.agentCounts.get(a) || 0) + 1));

    const hour = new Date().toISOString().slice(0, 13);
    this.hourlyCounts.set(hour, (this.hourlyCounts.get(hour) || 0) + 1);

    this.events.push({
      type: 'request',
      category: success ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      duration,
      metadata: { intents, agents, tokensEst },
    });
  }

  trackEvent(type: string, category: string, metadata: Record<string, unknown> = {}): void {
    this.events.push({
      type,
      category,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  getMetrics(): UsageMetrics {
    const topIntents = Array.from(this.intentCounts.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topAgents = Array.from(this.agentCounts.entries())
      .map(([agent, count]) => ({ agent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const requestsPerHour = Object.fromEntries(this.hourlyCounts);

    return {
      totalRequests: this.requestCount,
      totalTokensEstimated: this.tokensEstimated,
      averageResponseTime: this.requestCount > 0 ? Math.round(this.totalResponseTime / this.requestCount) : 0,
      successRate: this.requestCount > 0 ? Math.round((this.successCount / this.requestCount) * 10000) / 100 : 100,
      topIntents,
      topAgents,
      requestsPerHour,
      errorCount: this.errorCount,
    };
  }

  getEvents(limit = 50, type?: string): AnalyticsEvent[] {
    let filtered = this.events;
    if (type) filtered = filtered.filter(e => e.type === type);
    return filtered.slice(-limit);
  }

  getTimeSeries(hours = 24): { hour: string; requests: number }[] {
    const now = Date.now();
    const result: { hour: string; requests: number }[] = [];

    for (let i = hours - 1; i >= 0; i--) {
      const hourDate = new Date(now - i * 60 * 60 * 1000);
      const hourKey = hourDate.toISOString().slice(0, 13);
      result.push({ hour: hourKey, requests: this.hourlyCounts.get(hourKey) || 0 });
    }

    return result;
  }

  reset(): void {
    this.events = [];
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
    this.intentCounts.clear();
    this.agentCounts.clear();
    this.hourlyCounts.clear();
    this.tokensEstimated = 0;
  }
}

export const analyticsService = new AnalyticsService();
