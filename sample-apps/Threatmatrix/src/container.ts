/**
 * ThreatMatrix Dependency Injection Container
 * Manages singleton instances across HTTP, SSE, and STDIO transports
 * to prevent duplicate instantiation and memory leaks.
 */
import { ThreatAnalyzer } from './threat.analyzer.js';
import { AgentEngine } from './agent.engine.js';
import { UniversalInputProcessor } from './input.processor.js';
import { ThreatIntelService } from './threat.intel.service.js';
import { GeminiService } from './gemini.service.js';
import { GroqService } from './groq.service.js';

import { CloudConvertService } from './cloudconvert.service.js';
import { ReportGenerator } from './report.generator.js';
import { InvestigationOrchestrator } from './orchestrator.js';

class ServiceContainer {
  private static instance: ServiceContainer;

  public readonly threatAnalyzer: ThreatAnalyzer;
  public readonly agentEngine: AgentEngine;
  public readonly inputProcessor: UniversalInputProcessor;
  public readonly threatIntelService: ThreatIntelService;
  public readonly geminiService: GeminiService;
  public readonly groqService: GroqService;
  public readonly cloudConvertService: CloudConvertService;
  public readonly reportGenerator: ReportGenerator;
  public readonly orchestrator: InvestigationOrchestrator;

  private constructor() {
    this.threatIntelService = new ThreatIntelService();
    this.geminiService = new GeminiService();
    this.groqService = new GroqService();
    this.cloudConvertService = new CloudConvertService();
    this.inputProcessor = new UniversalInputProcessor();
    this.agentEngine = new AgentEngine();
    this.threatAnalyzer = new ThreatAnalyzer();
    this.reportGenerator = new ReportGenerator();
    this.orchestrator = new InvestigationOrchestrator();
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
}

export const container = ServiceContainer.getInstance();
