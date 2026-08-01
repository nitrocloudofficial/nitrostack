import { Injectable } from '@nitrostack/core';
import { HistoryService } from '../history/history.service.js';
import { MedicationService } from '../medication/medication.service.js';
import { ResearchService } from '../research/research.service.js';
import { GapAnalysisService } from '../gap-analysis/gap-analysis.service.js';
import { ReportService } from '../report/report.service.js';
import { AgentRegistryService, AgentExecutionResult } from './agent-registry.js';

export interface SupervisorInput {
  doctorQuestion?: string;
  patientId?: string;
  transcript?: string;
  consultationContext?: any;
}

export type IntentCategory = 
  | 'MEDICATION_QUESTION' 
  | 'RESEARCH_QUESTION' 
  | 'DIAGNOSIS_QUESTION' 
  | 'RISK_ASSESSMENT' 
  | 'SUMMARY' 
  | 'GENERAL_COPILOT';

export interface AgentExecutionNodePlan {
  agentId: string;
  agentName: string;
  reasonSelected: string;
  dependencies: string[];
  priority: number;
  expectedOutput: string;
  confidence: number;
  estimatedDurationMs: number;
  status: 'PLANNED' | 'EXECUTING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
}

export interface ExecutionPlan {
  supervisorAgent: string;
  patientId: string;
  doctorQuestion?: string;
  intentCategory: IntentCategory;
  requiredMcpTools: string[];
  toolInvocations: Array<{
    toolName: string;
    purpose: string;
    status: 'PLANNED' | 'EXECUTED';
  }>;
  executionNodes: AgentExecutionNodePlan[];
  executionStrategy: string;
}

export interface EvidencePackage {
  patientDemographics: any;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  labValues: string[];
  imaging: string[];
  previousVisits: any[];
  researchEvidence: any[];
  drugInteractions: any[];
  allergyConflicts: any[];
  gapAnalysis: any;
  riskFactors: string[];
  overallConfidence: number;
  limitations: string[];
  missingInformation: string[];
  recommendedQuestions: string[];
  supportingCitations: string[];
  sourceAgents: string[];
  timestamp: string;
}

export interface ObservabilityMetadata {
  executionPlan: AgentExecutionNodePlan[];
  selectedAgents: string[];
  completedAgents: string[];
  skippedAgents: string[];
  executionTimeMs: number;
  overallConfidence: number;
  errors: string[];
}

export interface CanvasNode {
  id: string;
  type: 'speech' | 'supervisor' | 'history' | 'medication' | 'research' | 'gap' | 'report';
  position: { x: number; y: number };
  data: {
    label: string;
    agentName: string;
    status: 'ACTIVE' | 'DONE' | 'ALERT' | 'SKIPPED';
    content: any;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface OrchestrationResult {
  transcript: string;
  symptomsExtracted: string[];
  patientId: string;
  intentCategory: IntentCategory;
  executionPlan: ExecutionPlan;
  evidencePackage: EvidencePackage;
  observability: ObservabilityMetadata;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  summary: any;
}

@Injectable({
  deps: [
    HistoryService, 
    MedicationService, 
    ResearchService, 
    GapAnalysisService, 
    ReportService,
    AgentRegistryService
  ]
})
export class SupervisorService {
  constructor(
    private readonly historyService: HistoryService,
    private readonly medicationService: MedicationService,
    private readonly researchService: ResearchService,
    private readonly gapAnalysisService: GapAnalysisService,
    private readonly reportService: ReportService,
    private readonly agentRegistry: AgentRegistryService
  ) {}

  /**
   * Classify user query or transcript intent dynamically.
   */
  classifyIntent(text: string): IntentCategory {
    const t = text.toLowerCase();

    if (t.includes('medication') || t.includes('drug') || t.includes('interaction') || t.includes('prescrib') || t.includes('allergy') || t.includes('dosage') || t.includes('warfarin') || t.includes('ibuprofen') || t.includes('penicillin')) {
      return 'MEDICATION_QUESTION';
    }
    if (t.includes('jama') || t.includes('pubmed') || t.includes('study') || t.includes('literature') || t.includes('guidelines') || t.includes('research') || t.includes('trial')) {
      return 'RESEARCH_QUESTION';
    }
    if (t.includes('differential') || t.includes('diagnosis') || t.includes('icd-10') || t.includes('symptom') || t.includes('pneumonia')) {
      return 'DIAGNOSIS_QUESTION';
    }
    if (t.includes('risk') || t.includes('readmission') || t.includes('mortality') || t.includes('score')) {
      return 'RISK_ASSESSMENT';
    }
    if (t.includes('summary') || t.includes('report') || t.includes('soap') || t.includes('discharge')) {
      return 'SUMMARY';
    }

    return 'GENERAL_COPILOT';
  }

  /**
   * Build dynamic execution plan with reason, dependencies, priority, expected outputs.
   */
  async planExecution(input: SupervisorInput): Promise<ExecutionPlan> {
    const patientId = input.patientId || '1234';
    const textToAnalyze = `${input.transcript || ''} ${input.doctorQuestion || ''}`.toLowerCase();
    const intentCategory = this.classifyIntent(textToAnalyze);

    const executionNodes: AgentExecutionNodePlan[] = [];
    const requiredMcpTools: string[] = [];

    const ALL_AGENTS = ['history', 'medication', 'research', 'gap', 'report'];
    let selectedAgentIds: string[] = [];

    switch (intentCategory) {
      case 'MEDICATION_QUESTION':
        selectedAgentIds = ['history', 'medication'];
        break;
      case 'RESEARCH_QUESTION':
        selectedAgentIds = ['research'];
        break;
      case 'DIAGNOSIS_QUESTION':
        selectedAgentIds = ['history', 'gap', 'research'];
        break;
      case 'RISK_ASSESSMENT':
        selectedAgentIds = ['history', 'medication', 'gap'];
        break;
      case 'SUMMARY':
        selectedAgentIds = ['history', 'medication', 'research', 'gap', 'report'];
        break;
      case 'GENERAL_COPILOT':
      default:
        // Dynamic selection based on explicit triggers
        selectedAgentIds = ['history'];
        if (textToAnalyze.includes('drug') || textToAnalyze.includes('allergy')) selectedAgentIds.push('medication');
        if (textToAnalyze.includes('paper') || textToAnalyze.includes('guideline')) selectedAgentIds.push('research');
        if (textToAnalyze.includes('missing') || textToAnalyze.includes('question')) selectedAgentIds.push('gap');
        if (textToAnalyze.includes('note') || textToAnalyze.includes('brief')) selectedAgentIds.push('report');
        break;
    }

    // Build Execution Nodes
    for (const id of ALL_AGENTS) {
      const isSelected = selectedAgentIds.includes(id);
      let reason = 'Skipped by Supervisor Agent based on intent classification.';
      let dependencies: string[] = [];
      let priority = 3;
      let expectedOutput = '';
      let estimatedDurationMs = 15;

      if (id === 'history') {
        reason = 'Retrieve patient demographics, chronic conditions, and active medications.';
        expectedOutput = 'PatientProfile JSON Object';
        priority = 1;
        estimatedDurationMs = 10;
        if (isSelected) requiredMcpTools.push('retrieve_patient', 'retrieve_visit_history', 'analyze_history');
      } else if (id === 'medication') {
        reason = 'Check drug-drug interactions and allergy conflicts.';
        dependencies = ['history'];
        expectedOutput = 'Interactions & Allergy Conflicts List';
        priority = 2;
        estimatedDurationMs = 25;
        if (isSelected) requiredMcpTools.push('medication_review', 'allergy_check');
      } else if (id === 'research') {
        reason = 'Query PubMed literature and clinical practice guidelines.';
        dependencies = ['history'];
        expectedOutput = 'PubMed Citations Array';
        priority = 2;
        estimatedDurationMs = 80;
        if (isSelected) requiredMcpTools.push('search_research');
      } else if (id === 'gap') {
        reason = 'Identify unasked risk questions and missing history.';
        dependencies = ['history'];
        expectedOutput = 'Missing Risk Factors & Follow-up Questions';
        priority = 2;
        estimatedDurationMs = 15;
        if (isSelected) requiredMcpTools.push('identify_missing_info');
      } else if (id === 'report') {
        reason = 'Compile EMR SOAP note and clinical briefing.';
        dependencies = ['history', 'medication', 'research', 'gap'];
        expectedOutput = 'Formatted SOAP Briefing Note';
        priority = 4;
        estimatedDurationMs = 20;
        if (isSelected) requiredMcpTools.push('generate_report');
      }

      executionNodes.push({
        agentId: id,
        agentName: id === 'gap' ? 'Gap Analysis Agent' : `${id.charAt(0).toUpperCase() + id.slice(1)} Agent`,
        reasonSelected: isSelected ? reason : 'Unneeded for current intent classification.',
        dependencies,
        priority,
        expectedOutput,
        confidence: isSelected ? 0.95 : 0,
        estimatedDurationMs,
        status: isSelected ? 'PLANNED' : 'SKIPPED'
      });
    }

    const toolInvocations = requiredMcpTools.map(toolName => ({
      toolName,
      purpose: this.getToolPurpose(toolName),
      status: 'PLANNED' as const
    }));

    return {
      supervisorAgent: 'ClinicaMind Dynamic Supervisor Agent v2.0',
      patientId,
      doctorQuestion: input.doctorQuestion,
      intentCategory,
      requiredMcpTools,
      toolInvocations,
      executionNodes,
      executionStrategy: `Parallel dynamic agent pipeline (${selectedAgentIds.length} active, ${ALL_AGENTS.length - selectedAgentIds.length} skipped)`
    };
  }

  private getToolPurpose(toolName: string): string {
    const purposes: Record<string, string> = {
      retrieve_patient: 'Fetch baseline patient EHR record and demographic vitals.',
      retrieve_visit_history: 'Fetch timeline of prior encounters.',
      analyze_history: 'Analyze past chronic conditions and comorbidities.',
      medication_review: 'Evaluate drug interactions and dosage safety.',
      allergy_check: 'Cross-reference prescribed drugs with allergy history.',
      risk_assessment: 'Calculate 30-day readmission and severity risk scores.',
      differential_diagnosis: 'Formulate ranked differential diagnoses list.',
      clinical_guidelines: 'Query evidence-based practice guidelines (ATS/IDSA, ACC/AHA).',
      search_research: 'Query PubMed medical literature database.',
      generate_report: 'Compile SOAP clinical consultation note.'
    };
    return purposes[toolName] || 'Execute clinical helper tool.';
  }

  /**
   * Main dynamic orchestration execution.
   */
  async orchestrateConsultation(transcript: string, patientId: string = '1234'): Promise<OrchestrationResult> {
    const startMs = Date.now();
    const plan = await this.planExecution({ transcript, patientId });

    const activeNodePlans = plan.executionNodes.filter(n => n.status === 'PLANNED');
    const selectedAgentIds = activeNodePlans.map(n => n.agentId);

    // 1. Parallel Execution of Independent Agents (History, Medication, Research, Gap)
    const independentIds = selectedAgentIds.filter(id => id !== 'report');
    const agentOutputsMap = await this.agentRegistry.executeParallel(independentIds, {
      patientId,
      transcript,
      query: transcript
    });

    // Update execution outputs for downstream dependent agents
    const rawOutputs: Record<string, any> = {};
    for (const [id, res] of Object.entries(agentOutputsMap)) {
      rawOutputs[id] = res.findings;
    }

    // 2. Execution of Dependent Agent (Report) if selected
    if (selectedAgentIds.includes('report')) {
      const reportRes = await this.agentRegistry.getAgent('report')?.execute({
        patientId,
        transcript,
        previousOutputs: rawOutputs
      });
      if (reportRes) {
        agentOutputsMap['report'] = reportRes;
        rawOutputs['report'] = reportRes.findings;
      }
    }

    // Extract extracted symptoms
    const tLower = transcript.toLowerCase();
    const symptoms: string[] = [];
    if (tLower.includes('chest pain')) symptoms.push('Chest Pain');
    if (tLower.includes('cough')) symptoms.push('Productive Cough');
    if (tLower.includes('headache')) symptoms.push('Headache');
    if (tLower.includes('runny nose')) symptoms.push('Runny Nose');
    if (tLower.includes('fever')) symptoms.push('Fever');
    if (tLower.includes('leg pain') || tLower.includes('ibuprofen')) symptoms.push('Leg Pain');
    if (symptoms.length === 0) symptoms.push('General Consultation');

    // 3. Assemble Unified Evidence Package
    const historyRes = agentOutputsMap['history']?.findings;
    const medRes = agentOutputsMap['medication']?.findings;
    const resRes = agentOutputsMap['research']?.findings;
    const gapRes = agentOutputsMap['gap']?.findings;
    const reportRes = agentOutputsMap['report']?.findings;

    const completedAgents = Object.keys(agentOutputsMap);
    const skippedAgents = ['history', 'medication', 'research', 'gap', 'report'].filter(id => !completedAgents.includes(id));

    // Compute Overall Confidence
    let totalConf = 0;
    let countConf = 0;
    for (const res of Object.values(agentOutputsMap)) {
      totalConf += res.confidence;
      countConf++;
    }
    const overallConfidence = countConf > 0 ? parseFloat((totalConf / countConf).toFixed(2)) : 0.90;

    const limitations: string[] = [];
    const missingInformation: string[] = [];
    for (const res of Object.values(agentOutputsMap)) {
      if (res.limitations) limitations.push(...res.limitations);
      if (res.missingInformation) missingInformation.push(...res.missingInformation);
    }

    const recommendedQuestions: string[] = gapRes?.suggestedQuestions || [];
    if (overallConfidence < 0.70) {
      recommendedQuestions.push('Can you clarify the exact onset time and severity of fever symptoms?');
    }

    const supportingCitations: string[] = [];
    if (resRes?.articles) {
      for (const art of resRes.articles) {
        supportingCitations.push(`${art.journal} (${art.year}) - PMID: ${art.pmid}`);
      }
    }
    if (medRes?.allergyConflicts && medRes.allergyConflicts.length > 0) {
      supportingCitations.push('EHR Documented Patient Allergy Record');
    }

    const evidencePackage: EvidencePackage = {
      patientDemographics: historyRes ? {
        id: historyRes.patientId,
        name: historyRes.name,
        age: historyRes.age,
        gender: historyRes.gender,
        riskCategory: historyRes.riskCategory
      } : { id: patientId, name: 'Patient Record' },
      medicalHistory: historyRes?.conditions || [],
      allergies: historyRes?.allergies || [],
      currentMedications: historyRes?.medications || [],
      labValues: historyRes?.recentLabs || [],
      imaging: historyRes?.documents ? historyRes.documents.filter((d: any) => d.category === 'X-ray').map((d: any) => d.name) : [],
      previousVisits: historyRes?.visitHistory || [],
      researchEvidence: resRes?.articles || [],
      drugInteractions: medRes?.interactions || [],
      allergyConflicts: medRes?.allergyConflicts || [],
      gapAnalysis: gapRes || {},
      riskFactors: gapRes?.missingRiskFactors || [],
      overallConfidence,
      limitations,
      missingInformation,
      recommendedQuestions,
      supportingCitations,
      sourceAgents: completedAgents,
      timestamp: new Date().toISOString()
    };

    // Observability Metadata
    const observability: ObservabilityMetadata = {
      executionPlan: plan.executionNodes.map(n => ({
        ...n,
        status: completedAgents.includes(n.agentId) ? 'COMPLETED' : 'SKIPPED'
      })),
      selectedAgents: selectedAgentIds,
      completedAgents,
      skippedAgents,
      executionTimeMs: Date.now() - startMs,
      overallConfidence,
      errors: []
    };

    // 4. Construct Dynamic React Flow Canvas Nodes & Edges
    const nodes: CanvasNode[] = [
      {
        id: 'node-speech',
        type: 'speech',
        position: { x: 50, y: 180 },
        data: {
          label: 'Live Audio Transcript',
          agentName: 'Speech-to-Text Input',
          status: 'DONE',
          content: { transcript, symptoms }
        }
      },
      {
        id: 'node-supervisor',
        type: 'supervisor',
        position: { x: 380, y: 180 },
        data: {
          label: 'Supervisor Planner',
          agentName: 'Supervisor Agent',
          status: 'ACTIVE',
          content: {
            intent: plan.intentCategory,
            plan: plan.requiredMcpTools.map(t => `MCP Tool: ${t} (${this.getToolPurpose(t)})`),
            observability
          }
        }
      },
      {
        id: 'node-history',
        type: 'history',
        position: { x: 720, y: 40 },
        data: {
          label: 'Patient History & EHR',
          agentName: 'History Agent',
          status: completedAgents.includes('history') ? 'DONE' : 'SKIPPED',
          content: historyRes || { status: 'Skipped by Supervisor' }
        }
      },
      {
        id: 'node-medication',
        type: 'medication',
        position: { x: 720, y: 280 },
        data: {
          label: 'Medication Safety & Allergies',
          agentName: 'Medication Agent',
          status: !completedAgents.includes('medication') 
            ? 'SKIPPED' 
            : ((medRes?.allergyConflicts?.length > 0 || medRes?.interactions?.length > 0) ? 'ALERT' : 'DONE'),
          content: medRes || { status: 'Skipped by Supervisor' }
        }
      },
      {
        id: 'node-research',
        type: 'research',
        position: { x: 1080, y: 40 },
        data: {
          label: 'PubMed Medical Literature',
          agentName: 'Research Agent',
          status: completedAgents.includes('research') ? 'DONE' : 'SKIPPED',
          content: resRes || { status: 'Skipped by Supervisor' }
        }
      },
      {
        id: 'node-gap',
        type: 'gap',
        position: { x: 1080, y: 280 },
        data: {
          label: 'Gap Analysis & Missing Data',
          agentName: 'Gap Analysis Agent',
          status: completedAgents.includes('gap') ? 'DONE' : 'SKIPPED',
          content: gapRes || { status: 'Skipped by Supervisor' }
        }
      },
      {
        id: 'node-report',
        type: 'report',
        position: { x: 1440, y: 160 },
        data: {
          label: 'Evidence Clinical Briefing',
          agentName: 'Report Generator Agent',
          status: completedAgents.includes('report') ? 'DONE' : 'SKIPPED',
          content: reportRes || { status: 'Skipped by Supervisor' }
        }
      }
    ];

    const edges: CanvasEdge[] = [
      { id: 'e-speech-sup', source: 'node-speech', target: 'node-supervisor', animated: true, label: 'Transcribes' },
      { id: 'e-sup-hist', source: 'node-supervisor', target: 'node-history', animated: completedAgents.includes('history'), label: 'Queries EHR' },
      { id: 'e-sup-med', source: 'node-supervisor', target: 'node-medication', animated: completedAgents.includes('medication'), label: 'Checks Safety' },
      { id: 'e-hist-res', source: 'node-history', target: 'node-research', animated: completedAgents.includes('research'), label: 'Extracts Context' },
      { id: 'e-med-gap', source: 'node-medication', target: 'node-gap', animated: completedAgents.includes('gap'), label: 'Evaluates Risks' },
      { id: 'e-res-rep', source: 'node-research', target: 'node-report', animated: completedAgents.includes('report'), label: 'Provides Literature' },
      { id: 'e-gap-rep', source: 'node-gap', target: 'node-report', animated: completedAgents.includes('report'), label: 'Informs Decision' }
    ];

    return {
      transcript,
      symptomsExtracted: symptoms,
      patientId,
      intentCategory: plan.intentCategory,
      executionPlan: plan,
      evidencePackage,
      observability,
      nodes,
      edges,
      summary: reportRes || {
        patientId,
        chiefComplaint: symptoms.join(', '),
        riskLevel: 'EVALUATED' as const,
        suspectedDiagnosis: 'Clinical Evaluation Complete',
        primaryDiagnosis: 'Clinical Evaluation Complete',
        keyWarnings: [],
        evidenceSummary: 'Evaluation complete.',
        recommendedActionPlan: recommendedQuestions,
        recommendedActions: recommendedQuestions
      }
    };
  }
}
