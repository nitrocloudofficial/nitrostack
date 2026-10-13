import getDb from '../database.js';

export interface SupervisorExecutionEntity {
  id: string;
  visitId: string;
  patientId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  planSummary?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentExecutionEntity {
  id: string;
  supervisorExecutionId: string;
  agentName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
}

export interface AgentOutputEntity {
  id: string;
  agentExecutionId: string;
  outputPayload: string; // JSON
  evidence?: string; // JSON
  confidence?: number;
  reasoningMetadata?: string; // JSON
  toolsCalled?: string; // JSON
  resourcesUsed?: string; // JSON
  createdAt?: string;
}

export class AiExecutionRepository {
  static createSupervisorExecution(exec: SupervisorExecutionEntity): SupervisorExecutionEntity {
    const db = getDb();
    const now = exec.startedAt || new Date().toISOString();
    return db.insert('supervisor_executions', { ...exec, startedAt: now });
  }

  static createAgentExecution(exec: AgentExecutionEntity): AgentExecutionEntity {
    const db = getDb();
    const now = exec.startedAt || new Date().toISOString();
    return db.insert('agent_executions', { ...exec, startedAt: now });
  }

  static createAgentOutput(out: AgentOutputEntity): AgentOutputEntity {
    const db = getDb();
    const now = out.createdAt || new Date().toISOString();
    return db.insert('agent_outputs', { ...out, createdAt: now });
  }

  static getExecutionsByVisit(visitId: string): any[] {
    const db = getDb();
    const superExecs = db.getTable<SupervisorExecutionEntity>('supervisor_executions').filter((s) => s.visitId === visitId);
    const agentExecs = db.getTable<AgentExecutionEntity>('agent_executions');
    const outputs = db.getTable<AgentOutputEntity>('agent_outputs');

    const result: any[] = [];
    for (const se of superExecs) {
      const aes = agentExecs.filter((a) => a.supervisorExecutionId === se.id);
      for (const ae of aes) {
        const out = outputs.find((o) => o.agentExecutionId === ae.id);
        result.push({
          supervisorId: se.id,
          supervisorStatus: se.status,
          planSummary: se.planSummary,
          agentExecutionId: ae.id,
          agentName: ae.agentName,
          agentStatus: ae.status,
          outputPayload: out?.outputPayload,
          evidence: out?.evidence,
          confidence: out?.confidence,
          reasoningMetadata: out?.reasoningMetadata
        });
      }
    }
    return result;
  }
}
