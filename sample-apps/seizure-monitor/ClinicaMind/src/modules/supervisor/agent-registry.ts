import { Injectable } from '@nitrostack/core';
import { HistoryService } from '../history/history.service.js';
import { MedicationService } from '../medication/medication.service.js';
import { ResearchService } from '../research/research.service.js';
import { GapAnalysisService } from '../gap-analysis/gap-analysis.service.js';
import { ReportService } from '../report/report.service.js';

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

export interface AgentExecutionContext {
  patientId: string;
  query?: string;
  transcript?: string;
  previousOutputs?: Record<string, any>;
}

export interface AgentExecutionResult {
  agentId: string;
  agentName: string;
  confidence: number;
  limitations?: string[];
  missingInformation?: string[];
  findings: any;
  executionTimeMs: number;
  timestamp: string;
}

export interface AgentContract {
  metadata: AgentMetadata;
  execute(ctx: AgentExecutionContext): Promise<AgentExecutionResult>;
}

@Injectable({
  deps: [HistoryService, MedicationService, ResearchService, GapAnalysisService, ReportService]
})
export class AgentRegistryService {
  private agents: Map<string, AgentContract> = new Map();

  constructor(
    private readonly historyService: HistoryService,
    private readonly medicationService: MedicationService,
    private readonly researchService: ResearchService,
    private readonly gapAnalysisService: GapAnalysisService,
    private readonly reportService: ReportService
  ) {
    this.registerBuiltInAgents();
  }

  private registerBuiltInAgents() {
    // 1. History Agent
    this.registerAgent({
      metadata: {
        id: 'history',
        name: 'History Agent',
        description: 'Retrieves patient EHR demographics, chronic conditions, and past encounters.',
        capabilities: ['patient_demographics', 'ehr_history', 'past_visits']
      },
      execute: async (ctx) => {
        const start = Date.now();
        const profile = this.historyService.getPatientProfile(ctx.patientId);
        return {
          agentId: 'history',
          agentName: 'History Agent',
          confidence: profile ? 0.98 : 0.5,
          limitations: (!profile || profile.pastSurgeries.length === 0) ? ['No documented surgical history verified'] : [],
          missingInformation: profile ? [] : ['Patient EHR record not found in database'],
          findings: profile || { patientId: ctx.patientId, name: 'Unregistered Patient', conditions: [], allergies: [], medications: [] },
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString()
        };
      }
    });

    // 2. Medication Agent
    this.registerAgent({
      metadata: {
        id: 'medication',
        name: 'Medication Agent',
        description: 'Checks drug-drug interactions and cross-references documented allergies.',
        capabilities: ['drug_interactions', 'allergy_checks', 'dosage_safety']
      },
      execute: async (ctx) => {
        const start = Date.now();
        const historyFindings = ctx.previousOutputs?.['history'] || this.historyService.getPatientHistory(ctx.patientId);
        const text = `${ctx.query || ''} ${ctx.transcript || ''}`.toLowerCase();
        
        const currentPlusProposed = [...(historyFindings.medications || [])];
        if (text.includes('ibuprofen')) currentPlusProposed.push('Ibuprofen');
        if (text.includes('amoxicillin')) currentPlusProposed.push('Amoxicillin');
        if (text.includes('levofloxacin')) currentPlusProposed.push('Levofloxacin');

        const interactions = await this.medicationService.checkDrugInteractionsAsync(currentPlusProposed);
        const allergyConflicts = this.medicationService.checkAllergyConflicts(currentPlusProposed, historyFindings.allergies || []);

        return {
          agentId: 'medication',
          agentName: 'Medication Agent',
          confidence: allergyConflicts.length > 0 ? 0.99 : 0.95,
          limitations: ['Over-the-counter herbal supplements not fully indexed'],
          missingInformation: allergyConflicts.length > 0 ? ['Verify severity of rash vs anaphylaxis reaction with patient'] : [],
          findings: { interactions, allergyConflicts, activeMedications: currentPlusProposed },
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString()
        };
      }
    });

    // 3. Research Agent
    this.registerAgent({
      metadata: {
        id: 'research',
        name: 'Research Agent',
        description: 'Searches PubMed medical literature, RCTs, and clinical practice guidelines.',
        capabilities: ['pubmed_search', 'guidelines_lookup', 'evidence_synthesis']
      },
      execute: async (ctx) => {
        const start = Date.now();
        const queryTerm = ctx.query || ctx.transcript || 'community acquired pneumonia guidelines';
        const articles = await this.researchService.searchPubMed(queryTerm);
        return {
          agentId: 'research',
          agentName: 'Research Agent',
          confidence: 0.92,
          limitations: ['Limited to open-access PubMed E-utilities index'],
          missingInformation: articles.length < 2 ? ['Broaden search terms for rare disease variants'] : [],
          findings: { query: queryTerm, articles },
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString()
        };
      }
    });

    // 4. Gap Analysis Agent
    this.registerAgent({
      metadata: {
        id: 'gap',
        name: 'Gap Analysis Agent',
        description: 'Discovers unasked clinical risk questions, missing history, and diagnostic bias indicators.',
        capabilities: ['gap_detection', 'risk_question_generation', 'bias_mitigation']
      },
      execute: async (ctx) => {
        const start = Date.now();
        const historyFindings = ctx.previousOutputs?.['history'] || this.historyService.getPatientHistory(ctx.patientId);
        const text = `${ctx.query || ''} ${ctx.transcript || ''}`.toLowerCase();
        
        const symptoms: string[] = [];
        if (text.includes('chest pain')) symptoms.push('Chest Pain');
        if (text.includes('cough')) symptoms.push('Productive Cough');
        if (text.includes('fever')) symptoms.push('Fever');
        if (text.includes('headache')) symptoms.push('Headache');
        if (symptoms.length === 0) symptoms.push('General Symptoms');

        const gaps = this.gapAnalysisService.analyzeGaps(symptoms, historyFindings.conditions || []);

        return {
          agentId: 'gap',
          agentName: 'Gap Analysis Agent',
          confidence: 0.89,
          limitations: ['Based on heuristic risk matrix'],
          missingInformation: gaps.missingRiskFactors,
          findings: gaps,
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString()
        };
      }
    });

    // 5. Report Generator Agent
    this.registerAgent({
      metadata: {
        id: 'report',
        name: 'Report Generator Agent',
        description: 'Synthesizes multi-agent findings into structured EMR SOAP notes and clinical briefings.',
        capabilities: ['soap_notes', 'discharge_summaries', 'clinical_briefing']
      },
      execute: async (ctx) => {
        const start = Date.now();
        const history = ctx.previousOutputs?.['history'];
        const medication = ctx.previousOutputs?.['medication'];
        const research = ctx.previousOutputs?.['research'];
        const gap = ctx.previousOutputs?.['gap'];

        const summary = this.reportService.generateSummary({
          symptoms: gap?.findings?.symptoms || ['Febrile Respiratory Illness'],
          history: history?.findings || {},
          interactions: medication?.findings?.interactions || [],
          allergyConflicts: medication?.findings?.allergyConflicts || [],
          pubMedArticles: research?.findings?.articles || [],
          gaps: gap?.findings || {}
        });

        return {
          agentId: 'report',
          agentName: 'Report Generator Agent',
          confidence: 0.96,
          limitations: ['Requires attending physician signature before EMR insertion'],
          missingInformation: [],
          findings: summary,
          executionTimeMs: Date.now() - start,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  registerAgent(agent: AgentContract) {
    this.agents.set(agent.metadata.id, agent);
  }

  getAgent(id: string): AgentContract | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): AgentMetadata[] {
    return Array.from(this.agents.values()).map(a => a.metadata);
  }

  async executeParallel(agentIds: string[], ctx: AgentExecutionContext): Promise<Record<string, AgentExecutionResult>> {
    const tasks = agentIds.map(async id => {
      const agent = this.agents.get(id);
      if (!agent) {
        throw new Error(`Agent with ID "${id}" not found in AgentRegistryService`);
      }
      const res = await agent.execute(ctx);
      return { id, res };
    });

    const resultsArray = await Promise.all(tasks);
    const resultsMap: Record<string, AgentExecutionResult> = {};
    for (const item of resultsArray) {
      resultsMap[item.id] = item.res;
    }
    return resultsMap;
  }
}
