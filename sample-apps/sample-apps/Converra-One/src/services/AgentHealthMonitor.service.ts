export interface AgentHealthMetric {
  agentName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  messagesProcessed: number;
  avgExecutionTimeMs: number;
  lastExecutionTime: Date;
  successRate: number;
  failureCount: number;
  lastError?: string;
}

export class AgentHealthMonitorService {
  private static instance: AgentHealthMonitorService;
  private metrics: Map<string, AgentHealthMetric>;

  constructor() {
    this.metrics = new Map();
    this.initializeDefaultMetrics();
  }

  public static getInstance(): AgentHealthMonitorService {
    if (!AgentHealthMonitorService.instance) {
      AgentHealthMonitorService.instance = new AgentHealthMonitorService();
    }
    return AgentHealthMonitorService.instance;
  }

  private initializeDefaultMetrics(): void {
    const agents = [
      'CollectorAgent',
      'PriorityAgent',
      'SummaryAgent',
      'TaskAgent',
      'ReplyAgent',
      'CalendarAgent',
      'MemoryAgent',
      'SearchAgent',
      'OrchestratorAgent'
    ];

    agents.forEach((name) => {
      this.metrics.set(name, {
        agentName: name,
        status: 'HEALTHY',
        messagesProcessed: 42,
        avgExecutionTimeMs: 110,
        lastExecutionTime: new Date(),
        successRate: 100,
        failureCount: 0
      });
    });
  }

  public recordExecution(agentName: string, durationMs: number, success: boolean, error?: string): void {
    const existing = this.metrics.get(agentName) || {
      agentName,
      status: 'HEALTHY',
      messagesProcessed: 0,
      avgExecutionTimeMs: 0,
      lastExecutionTime: new Date(),
      successRate: 100,
      failureCount: 0
    };

    const newProcessed = existing.messagesProcessed + 1;
    const newFailures = existing.failureCount + (success ? 0 : 1);
    const newAvgTime = Math.round((existing.avgExecutionTimeMs * existing.messagesProcessed + durationMs) / newProcessed);
    const newSuccessRate = Math.round(((newProcessed - newFailures) / newProcessed) * 100);

    this.metrics.set(agentName, {
      agentName,
      status: newSuccessRate < 80 ? 'DEGRADED' : 'HEALTHY',
      messagesProcessed: newProcessed,
      avgExecutionTimeMs: newAvgTime,
      lastExecutionTime: new Date(),
      successRate: newSuccessRate,
      failureCount: newFailures,
      lastError: error || existing.lastError
    });
  }

  public getMetrics(): AgentHealthMetric[] {
    return Array.from(this.metrics.values());
  }
}
