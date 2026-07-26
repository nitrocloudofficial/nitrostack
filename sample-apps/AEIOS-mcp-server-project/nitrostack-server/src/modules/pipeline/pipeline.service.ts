import { v4 as uuid } from 'uuid';
import { GroqClient, type ChatMessage } from '../../llm/groq-client.js';
import { EnterpriseKernel } from '../../core/kernel.js';
import { BackendClient } from '../../core/backend-client.js';
import { IntentService, type IntentResult } from '../intent/intent.service.js';
import { AgentFactory, AgentExecutor, type AgentResult } from '../agents/agents.service.js';
import { Blackboard } from '../knowledge/blackboard.js';
import { KnowledgeService, type KnowledgeContext } from '../knowledge/knowledge.service.js';
import { ConsensusEngine, type ConsensusResult } from '../decision/consensus.js';
import { ConflictResolver } from '../decision/conflict-resolver.js';
import { DecisionService, type EnterpriseDecision } from '../decision/decision.service.js';

export interface PipelineRequest {
  query: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineResponse {
  success: boolean;
  requestId: string;
  result: string;
  metadata: {
    pipeline: string;
    intents: string[];
    agents: string[];
    agentCount: number;
    confidence: number;
    priority: string;
    risk: string;
    knowledgeFacts: number;
    conflicts: number;
    executionTime: number;
    decision: EnterpriseDecision;
    consensus: { score: number; confidence: number };
    source: 'backend' | 'local';
  };
}

export interface PipelineStatus {
  running: boolean;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  averageExecutionTime: number;
  lastExecution?: Date;
  backendConnected: boolean;
}

export class PipelineService {
  private kernel = new EnterpriseKernel();
  private backend = new BackendClient();
  private intentService = new IntentService();
  private agentFactory = new AgentFactory();
  private agentExecutor = new AgentExecutor();
  private knowledgeService = new KnowledgeService();
  private consensusEngine = new ConsensusEngine();
  private conflictResolver = new ConflictResolver();
  private decisionService = new DecisionService();
  private llm = new GroqClient();

  private stats = {
    totalExecutions: 0,
    successCount: 0,
    failedCount: 0,
    totalTime: 0,
    lastExecution: undefined as Date | undefined,
  };

  private initialized = false;
  private backendAvailable = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.kernel.initialize();
    this.kernel.healthManager.update('pipeline', 'healthy');

    const llmOk = await this.llm.available();
    this.kernel.healthManager.update('llm', llmOk ? 'healthy' : 'unhealthy');

    this.backendAvailable = await this.backend.available();
    this.kernel.healthManager.register('backend');
    this.kernel.healthManager.update(
      'backend',
      this.backendAvailable ? 'healthy' : 'unhealthy'
    );

    if (this.backendAvailable) {
      console.log('[AEIOS-X] FastAPI backend connected — using two-tier architecture');
    } else {
      console.log('[AEIOS-X] FastAPI backend not available — using local pipeline');
    }

    this.initialized = true;
  }

  async execute(request: PipelineRequest): Promise<PipelineResponse> {
    await this.initialize();
    const start = Date.now();
    const requestId = uuid();

    // Try backend first for two-tier architecture
    if (this.backendAvailable) {
      try {
        return await this.executeViaBackend(request, requestId, start);
      } catch (err) {
        console.warn('[AEIOS-X] Backend call failed, falling back to local pipeline:', err);
        this.backendAvailable = false;
        this.kernel.healthManager.update('backend', 'unhealthy');
      }
    }

    return this.executeLocally(request, requestId, start);
  }

  private async executeViaBackend(
    request: PipelineRequest,
    requestId: string,
    start: number
  ): Promise<PipelineResponse> {
    await this.kernel.eventBus.publish('pipeline.started', { requestId, source: 'backend' });

    const backendResponse = await this.backend.chat(request.query);
    const executionTime = Date.now() - start;

    this.stats.totalExecutions++;
    this.stats.successCount++;
    this.stats.totalTime += executionTime;
    this.stats.lastExecution = new Date();

    await this.kernel.eventBus.publish('pipeline.completed', { requestId, executionTime, source: 'backend' });

    const intentResult = this.intentService.detect(request.query);

    return {
      success: backendResponse.success,
      requestId,
      result: backendResponse.response,
      metadata: {
        pipeline: 'enterprise-v1',
        intents: intentResult.intents,
        agents: intentResult.agents,
        agentCount: intentResult.agents.length,
        confidence: intentResult.confidence,
        priority: (backendResponse.metadata?.priority as string) || 'MEDIUM',
        risk: (backendResponse.metadata?.risk as string) || 'LOW',
        knowledgeFacts: 0,
        conflicts: 0,
        executionTime,
        decision: {
          priority: (backendResponse.metadata?.priority as string) || 'MEDIUM' as any,
          risk: (backendResponse.metadata?.risk as string) || 'LOW' as any,
          confidence: intentResult.confidence,
          recommendedAction: 'Response delivered via AEIOS-X Backend',
          reasoning: `Processed through FastAPI backend with ${intentResult.intents.join(', ')} intents`,
        },
        consensus: { score: 1.0, confidence: intentResult.confidence },
        source: 'backend',
      },
    };
  }

  private async executeLocally(
    request: PipelineRequest,
    requestId: string,
    start: number
  ): Promise<PipelineResponse> {
    try {
      await this.kernel.eventBus.publish('pipeline.started', { requestId, source: 'local' });

      const intentResult = this.intentService.detect(request.query);
      const agents = this.agentFactory.createMany(intentResult.agents);
      const blackboard = new Blackboard();

      const agentResults = await this.agentExecutor.executeAll(
        agents,
        request.query,
        request.metadata ? JSON.stringify(request.metadata) : '',
        blackboard,
        this.knowledgeService
      );

      const knowledge = this.knowledgeService.categorize(blackboard.read());
      const conflicts = this.conflictResolver.detect(blackboard.read());
      const resolutions = this.conflictResolver.resolve(conflicts);
      const consensus = this.consensusEngine.evaluate(agentResults);
      const decision = this.decisionService.decide(consensus, intentResult.intents);

      const synthesized = await this.synthesize(
        request.query,
        intentResult,
        agentResults,
        knowledge,
        consensus,
        decision,
        resolutions
      );

      const executionTime = Date.now() - start;

      this.stats.totalExecutions++;
      this.stats.successCount++;
      this.stats.totalTime += executionTime;
      this.stats.lastExecution = new Date();

      await this.kernel.eventBus.publish('pipeline.completed', { requestId, executionTime, source: 'local' });

      return {
        success: true,
        requestId,
        result: synthesized,
        metadata: {
          pipeline: 'enterprise-v1',
          intents: intentResult.intents,
          agents: intentResult.agents,
          agentCount: agents.length,
          confidence: consensus.confidence,
          priority: decision.priority,
          risk: decision.risk,
          knowledgeFacts: knowledge.facts.length,
          conflicts: conflicts.length,
          executionTime,
          decision,
          consensus: { score: consensus.score, confidence: consensus.confidence },
          source: 'local',
        },
      };
    } catch (err) {
      this.stats.totalExecutions++;
      this.stats.failedCount++;
      this.stats.lastExecution = new Date();

      const error = err instanceof Error ? err.message : String(err);
      await this.kernel.eventBus.publish('pipeline.failed', { requestId, error });

      return {
        success: false,
        requestId,
        result: `Pipeline execution failed: ${error}`,
        metadata: {
          pipeline: 'enterprise-v1',
          intents: [],
          agents: [],
          agentCount: 0,
          confidence: 0,
          priority: 'LOW',
          risk: 'HIGH',
          knowledgeFacts: 0,
          conflicts: 0,
          executionTime: Date.now() - start,
          decision: {
            priority: 'LOW',
            risk: 'HIGH',
            confidence: 0,
            recommendedAction: 'Retry or escalate',
            reasoning: error,
          },
          consensus: { score: 0, confidence: 0 },
          source: 'local',
        },
      };
    }
  }

  async getStatus(): Promise<PipelineStatus> {
    await this.initialize();
    return {
      running: this.initialized,
      totalExecutions: this.stats.totalExecutions,
      successCount: this.stats.successCount,
      failedCount: this.stats.failedCount,
      averageExecutionTime:
        this.stats.totalExecutions > 0
          ? this.stats.totalTime / this.stats.totalExecutions
          : 0,
      lastExecution: this.stats.lastExecution,
      backendConnected: this.backendAvailable,
    };
  }

  getKernelStatus() {
    return this.kernel.getStatus();
  }

  reset(): void {
    this.stats = {
      totalExecutions: 0,
      successCount: 0,
      failedCount: 0,
      totalTime: 0,
      lastExecution: undefined,
    };
  }

  private async synthesize(
    query: string,
    intents: IntentResult,
    agentResults: AgentResult[],
    knowledge: KnowledgeContext,
    consensus: ConsensusResult,
    decision: EnterpriseDecision,
    resolutions: string[]
  ): Promise<string> {
    const successful = agentResults.filter((r) => r.success);

    const agentOutputs = successful
      .map((r) => `### ${r.role}\n${r.output}`)
      .join('\n\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          'You are the AEIOS-X Enterprise Response Composer.',
          'Synthesize multiple AI agent outputs into a single, cohesive enterprise-grade response.',
          '',
          'Guidelines:',
          '- Create a unified, well-structured response',
          '- Highlight key findings, risks, and recommendations',
          '- Use clear markdown formatting with headers and bullet points',
          '- Prioritize actionable insights',
          '- Maintain professional enterprise tone',
          '- Do NOT mention individual agents or the pipeline process',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          `## Original Query\n${query}`,
          `## Detected Intents\n${intents.intents.join(', ')}`,
          `## Agent Analysis\n${agentOutputs}`,
          `## Knowledge Summary\n- Facts: ${knowledge.facts.length}\n- Risks: ${knowledge.risks.length}\n- Recommendations: ${knowledge.recommendations.length}`,
          `## Decision\n- Priority: ${decision.priority}\n- Risk: ${decision.risk}\n- Confidence: ${(decision.confidence * 100).toFixed(0)}%`,
          resolutions.length > 0
            ? `## Conflicts Resolved\n${resolutions.join('\n')}`
            : '',
          '',
          'Compose the final enterprise response.',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ];

    return this.llm.chat(messages, { maxTokens: 4096 });
  }
}
