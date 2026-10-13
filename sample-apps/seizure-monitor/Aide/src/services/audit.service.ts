import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  timestamp: string;
  type: 'router_decision' | 'tool_call' | 'tool_result' | 'policy_decision' | 'system_error';
  agent?: string;
  tool?: string;
  input?: any;
  output?: any;
  latencyMs?: number;
  message?: string;
}

export class AuditService {
  static async log(entry: Omit<AuditLogEntry, 'timestamp'>) {
    try {
      await prisma.auditLog.create({
        data: {
          timestamp: new Date().toISOString(),
          type: entry.type,
          agent: entry.agent,
          tool: entry.tool,
          input: entry.input ? (entry.input as any) : undefined,
          output: entry.output ? (entry.output as any) : undefined,
          latencyMs: entry.latencyMs,
          message: entry.message,
        }
      });
    } catch (err) {
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  static async readLogs(): Promise<AuditLogEntry[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'asc' }
      });
      return logs as unknown as AuditLogEntry[];
    } catch (err) {
      console.error('[AuditService] Failed to read audit log:', err);
      return [];
    }
  }

  static async getMetrics() {
    const logs = await this.readLogs();
    const toolCalls = logs.filter(l => l.type === 'tool_result');
    const successes = toolCalls.filter(l => !l.output?.error);
    const errors = toolCalls.filter(l => l.output?.error);
    
    let totalLatency = 0;
    let latencyCount = 0;
    
    toolCalls.forEach(l => {
      if (typeof l.latencyMs === 'number') {
        totalLatency += l.latencyMs;
        latencyCount++;
      }
    });

    return {
      totalTasks: toolCalls.length,
      successRate: toolCalls.length > 0 ? (successes.length / toolCalls.length) * 100 : 0,
      averageLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : 0,
      errorCount: errors.length,
    };
  }
}
